import { PoolClient } from 'pg'
import { ulid } from 'ulid'

import { OrderStatus } from '@megacommerce/proto/orders/v1/order'
import { getOrderStatusValue } from '@/models'

/**
 * cancelOrder: attempts to cancel an order if business rules allow.
 * Returns true if cancelled, false if cannot cancel.
 * Implements DB transaction and inserts an ORDER_CANCELLED event.
 */
export async function cancelOrder(
  db: PoolClient,
  orderId: string,
  opts: { reason: string; refund: boolean }
) {
  const nowMs = Date.now()

  try {
    await db.query('BEGIN')
    // Lock the order row to check status
    const sel = await db.query(`SELECT id, status, user_id FROM orders WHERE id = $1 FOR UPDATE`, [orderId])
    if (sel.rowCount === 0) {
      await db.query('ROLLBACK')
      return { ok: false, reason: 'not_found' }
    }

    const order = sel.rows[0]
    // Only allow cancel if not shipped/refunded/cancelled already
    const notAllowed = [
      getOrderStatusValue(OrderStatus.ORDER_STATUS_SHIPPED),
      getOrderStatusValue(OrderStatus.ORDER_STATUS_CANCELLED),
      getOrderStatusValue(OrderStatus.ORDER_STATUS_REFUNDED),
    ]
    if (notAllowed.includes(order.status)) {
      await db.query('ROLLBACK')
      return { ok: false, reason: 'cannot_cancel' }
    }

    await db.query(`UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3`, [
      getOrderStatusValue(OrderStatus.ORDER_STATUS_CANCELLED),
      nowMs,
      orderId,
    ])

    const payload = JSON.stringify({ reason: opts.reason, refund_requested: opts.refund })
    await db.query(
      `INSERT INTO order_events (
        id, order_id, event_type, event_payload, created_at
       ) VALUES ($1,$2,$3,$4,$5)`,
      [ulid(), orderId, getOrderStatusValue(OrderStatus.ORDER_STATUS_CANCELLED), payload, nowMs]
    )
    await db.query('COMMIT')
    return { ok: true }
  } catch (err) {
    try {
      await db.query('ROLLBACK')
    } catch (_) { }
    throw err
  }
}

import { PoolClient } from 'pg'
import { ulid } from 'ulid'

import { Context, getOrderEventTypeValue, getOrderLineItemStatusValue } from '@/models'
import { OrderLineItemStatus } from '@megacommerce/proto/orders/v1/order_line_items'
import { OrderEventType } from '@megacommerce/proto/orders/v1/order_events'

/**
 * refundOrder: store-level refund initiation. It creates REFUND_REQUESTED event
 * and sets status. The actual refund to payment provider should be performed by
 * a worker that consumes events.
 */
export async function refundOrder(db: PoolClient, ctx: Context, orderId: string, event: string) {
  const nowMs = Date.now()
  try {
    await db.query('BEGIN')

    // Mark order as REFUND_REQUESTED (worker will change to REFUNDED when processed)
    await db.query(`UPDATE order_line_items SET status = $1, updated_at = $2 WHERE id = $3`, [
      getOrderLineItemStatusValue(OrderLineItemStatus.ORDER_LINE_ITEM_STATUS_REFUND_REQUESTED),
      nowMs,
      orderId,
    ])

    await db.query(
      `INSERT INTO order_events (id, order_id, event_type, event_payload, created_at) VALUES ($1,$2,$3,$4,$5)`,
      [
        ulid(),
        orderId,
        getOrderEventTypeValue(OrderEventType.ORDER_EVENT_ORDER_ITEM_REFUND_REQUESTED),
        event,
        nowMs,
      ]
    )

    await db.query('COMMIT')
    return { ok: true }
  } catch (err) {
    try {
      await db.query('ROLLBACK')
    } catch (_) {}
    throw err
  }
}

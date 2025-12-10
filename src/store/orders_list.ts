import { PoolClient } from 'pg'

import { OrderListItem } from '@megacommerce/proto/orders/v1/orders_list'

export async function listOrdersForUser(
  db: PoolClient,
  userId: string,
  { pageSize, lastId }: { pageSize: number; lastId: string | undefined }
): Promise<OrderListItem[]> {
  const select = `
   SELECT 
    id,
    shipping_cents,
    total_cents,
    currency_code,
    inventory_reservation_status,
    status,
    created_at
   FROM orders
  `

  const processRows = (rows: any[]) => {
    return rows.map<OrderListItem>((r) => {
      return {
        id: r.id,
        currencyCode: r.currency_code,
        totalCents: r.total_cents,
        status: r.status,
        createdAt: r.created_at,
        inventoryReservationStatus: r.inventory_reservation_status,
        shippingCents: r.shipping_cents,
      }
    })
  }
  if (lastId) {
    const res = await db.query(`${select} WHERE user_id = $1 AND id < $2 ORDER BY id DESC LIMIT $3`, [
      userId,
      lastId,
      pageSize,
    ])
    return processRows(res.rows)
  } else {
    const res = await db.query(`${select} WHERE user_id = $1 ORDER BY id DESC LIMIT $2`, [userId, pageSize])
    return processRows(res.rows)
  }
}

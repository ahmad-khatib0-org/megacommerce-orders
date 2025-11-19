import { PoolClient } from 'pg'

import { OrderEvent } from '@megacommerce/proto/orders/v1/order_events'
import { structToJsonObject } from '@/helpers'

export async function insertOrderEvent(db: PoolClient, event: OrderEvent) {
  await db.query(
    `INSERT INTO order_events (
         id, 
         order_id, 
         event_type, 
         event_payload, 
         created_at
      )
       VALUES ($1, $2, $3, $4, $5)`,
    [
      event.id,
      event.orderId,
      event.eventType,
      event.eventPayload ? structToJsonObject(event.eventPayload) : null,
      parseInt(event.createdAt),
    ]
  )
}

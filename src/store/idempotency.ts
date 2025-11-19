import { PoolClient } from 'pg'

import {
  OrderIdempotencyKey,
  OrderIdempotencyKeyStatus,
} from '@megacommerce/proto/orders/v1/order_idempotency_keys'
import { getOrderIdempotencyKeyStatusValue } from '@/models'

export async function acquireOrderIdempotencyKey(
  client: PoolClient,
  idempotencyKey: string
): Promise<OrderIdempotencyKey | undefined> {
  const sel = await client.query(
    `SELECT 
       id, 
       idempotency_key, 
       user_id, 
       order_id, 
       status, 
       created_at,
       updated_at,
       expires_at
     FROM order_idempotency_keys 
     WHERE idempotency_key = $1 
     FOR UPDATE`,
    [idempotencyKey]
  )

  if (sel.rows.length) {
    const item = sel.rows[0]
    return {
      id: item.id,
      idempotencyKey: item.idempotency_key,
      userId: item.user_id,
      orderId: item.order_id,
      status: item.status,
      createdAt: item.created_at.toString(),
      updatedAt: item.updated_at ? item.updated_at.toString() : '',
      expiresAt: item.expires_at.toString(),
    }
  }
}

export async function insertOrderIdempotencyKey(client: PoolClient, data: OrderIdempotencyKey) {
  await client.query(
    `INSERT INTO order_idempotency_keys(
      id, 
      idempotency_key, 
      user_id, 
      order_id, 
      status, 
      created_at, 
      updated_at, 
      expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      data.id,
      data.idempotencyKey,
      data.userId,
      data.orderId,
      data.status,
      Number(data.createdAt),
      null,
      Number(data.expiresAt),
    ]
  )
}

export async function updateOrderIdempotencyKeyStatus(
  client: PoolClient,
  status: OrderIdempotencyKeyStatus,
  updatedAt: number,
  idempotencyKey: string
) {
  await client.query(
    `
    UPDATE order_idempotency_keys SET 
      status = $1, 
      updated_at = $2  
    WHERE idempotency_key = $3
  `,
    [getOrderIdempotencyKeyStatusValue(status), updatedAt, idempotencyKey]
  )
}

export async function updateOrderIdempotencyKeyAfterSuccessPayment(
  client: PoolClient,
  orderId: string,
  status: OrderIdempotencyKeyStatus,
  updatedAt: number,
  idempotencyKey: string
) {
  await client.query(
    `
    UPDATE order_idempotency_keys SET
      order_id = $1,
      status = $2, 
      updated_at = $3  
    WHERE idempotency_key = $4
  `,
    [orderId, getOrderIdempotencyKeyStatusValue(status), updatedAt, idempotencyKey]
  )
}

import { PoolClient } from 'pg'
import Stripe from 'stripe'
import { OrderItem } from '@megacommerce/proto/orders/v1/order_get'
import { Order, OrderStatus, PaymentStatus } from '@megacommerce/proto/orders/v1/order'

import { getPaymentFees, getPaymentTransactionID } from '@/controller/payment'
import { jsonObjectToStruct, jsonStringObjectToObject, structToJsonObject } from '@/helpers'
import { Context, getOrderStatusValue, getPaymentStatusValue } from '@/models'

// TODO: handle the serialization, insert null where needed
export async function insertOrder(db: PoolClient, ctx: Context, req: Order) {
  await db.query(
    `INSERT INTO orders (
        id,
        user_id,
        currency_code,
        subtotal_cents,
        shipping_cents,
        tax_cents,
        discount_cents,
        total_cents,
        payment_provider,
        payment_transaction_id,
        payment_status,
        payment_provider_response,
        payment_fee_cents,
        inventory_reservation_status,
        product_source,
        shipping_address,
        billing_address,
        metadata,
        status,
        created_at,
        updated_at,
        deleted_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::JSONB,$13,
        $14,$15,$16::JSONB,$17::JSONB,$18::JSONB,$19,$20,$21,$22
      )`,
    [
      req.id,
      ctx.session.userId,
      req.currencyCode,
      parseInt(req.subtotalCents),
      parseInt(req.shippingCents),
      parseInt(req.taxCents),
      parseInt(req.discountCents),
      parseInt(req.totalCents),
      req.paymentProvider ?? null,
      req.paymentTransactionId ?? null,
      req.paymentStatus,
      req.paymentProviderResponse ? structToJsonObject(req.paymentProviderResponse) : null,
      req.paymentFeeCents ? parseInt(req.paymentFeeCents) : null,
      req.inventoryReservationStatus,
      req.productSource,
      req.shippingAddress ? structToJsonObject(req.shippingAddress) : null,
      req.billingAddress ? structToJsonObject(req.billingAddress) : null,
      req.metadata ? structToJsonObject(req.metadata) : null,
      req.status,
      parseInt(req.createdAt),
      req.updatedAt ? parseInt(req.updatedAt) : null,
      req.deletedAt ? parseInt(req.deletedAt) : null,
    ]
  )
}

export async function updateOrderPaymentStatus(
  db: PoolClient,
  orderId: string,
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  updatedAt: number
) {
  db.query(
    `
     UPDATE orders SET 
       payment_status = $1, 
       status = $2, 
       updated_at = $3 
     WHERE id = $4`,
    [getPaymentStatusValue(paymentStatus), getOrderStatusValue(status), updatedAt, orderId]
  )
}

export async function updateOrderPaymentSucceeded(
  db: PoolClient,
  orderId: string,
  stripeResult: Stripe.PaymentIntent,
  updatedAt: number
) {
  // Update orders with payment info and set CONFIRMED
  await db.query(
    `UPDATE orders SET 
       payment_provider = $1, 
       payment_transaction_id = $2, 
       payment_status = $3,
       payment_provider_response = $4, 
       payment_fee_cents = $5, 
       status = $6, 
       updated_at = $7
     WHERE id = $8`,
    [
      'stripe',
      getPaymentTransactionID(stripeResult),
      getPaymentStatusValue(PaymentStatus.PAYMENT_CAPTURED),
      JSON.stringify(stripeResult),
      getPaymentFees(stripeResult),
      getOrderStatusValue(OrderStatus.ORDER_STATUS_CONFIRMED),
      updatedAt,
      orderId,
    ]
  )
}

export async function getOrderById(db: PoolClient, orderId: string): Promise<OrderItem | null> {
  const res = await db.query(
    `SELECT id, user_id, currency_code, subtotal_cents, shipping_cents, tax_cents,
            discount_cents, total_cents, payment_provider, payment_transaction_id,
            payment_status, payment_provider_response, payment_fee_cents,
            inventory_reservation_status, product_source, product_version,
            shipping_address, billing_address, metadata, status, created_at, updated_at
     FROM orders
     WHERE id = $1
     LIMIT 1`,
    [orderId]
  )

  if (res.rowCount === 0) return null

  const row = res.rows[0]
  return {
    id: row.id,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    taxCents: row.tax_cents,
    discountCents: row.discount_cents,
    totalCents: row.total_cents,
    currencyCode: row.currency_code,
    lineItems: [],
    shippingAddress: jsonObjectToStruct(row.shipping_address),
    billingAddress: jsonObjectToStruct(row.billing_address),
    payment: {
      provider: row.payment_provider,
      transactionId: row.payment_transaction_id,
      status: row.payment_status,
      paymentMethod: '',
      providerResponse: jsonObjectToStruct(row.payment_provider_response),
      feeCents: row.payment_fee_cents,
    },
    inventoryReservationStatus: row.inventory_reservation_status,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productSource: row.product_source,
    productVersion: row.product_version,
    metadata: jsonStringObjectToObject<string>(row.metadata),
  }
}

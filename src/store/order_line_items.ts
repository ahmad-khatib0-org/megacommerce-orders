import { PoolClient } from 'pg'
import { OrderLineItem } from '@megacommerce/proto/orders/v1/order_line_items'

import { Context } from '@/models'
import { jsonObjectToStruct, jsonStringObjectToObject, structToJsonObject } from '@/helpers'

export async function insertOrderLineItems(
  db: PoolClient,
  ctx: Context,
  orderLineItems: OrderLineItem[],
  orderId: string
): Promise<void> {
  for (const item of orderLineItems) {
    await db.query(
      `INSERT INTO order_line_items (
        id,
        order_id,
        product_id,
        variant_id,
        sku,
        title,
        attributes,
        quantity,
        unit_price_cents,
        list_price_cents,
        sale_price_cents,
        discount_cents,
        tax_cents,
        total_cents,
        applied_offer_ids,
        product_snapshot,
        shipping_cents,
        created_at,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5, $6,$7::JSONB,$8,$9,$10,
        $11,$12,$13,$14,$15, $16::JSONB,$17,$18,$19
      )`,
      [
        item.id,
        orderId,
        item.productId,
        item.variantId,
        item.sku,
        item.title,
        Object.keys(item.attributes).length > 0 ? JSON.stringify(item.attributes) : null,
        item.quantity,
        parseInt(item.unitPriceCents),
        item.listPriceCents ? parseInt(item.listPriceCents) : null,
        item.salePriceCents ? parseInt(item.salePriceCents) : null,
        item.discountCents ? parseInt(item.discountCents) : null,
        item.taxCents ? parseInt(item.taxCents) : 0,
        parseInt(item.totalCents),
        item.appliedOfferIds,
        item.productSnapshot ? structToJsonObject(item.productSnapshot) : null,
        parseInt(item.shippingCents),
        parseInt(item.createdAt),
        item.updatedAt ? parseInt(item.updatedAt) : null,
      ]
    )
  }
}

export async function getOrderLineItemsByOrderId(db: PoolClient, orderId: string): Promise<OrderLineItem[]> {
  const res = await db.query(
    `SELECT id, order_id, product_id, variant_id, sku, title, attributes,
            quantity, unit_price_cents, list_price_cents, sale_price_cents,
            discount_cents, tax_cents, total_cents, applied_offer_ids, product_snapshot,
            status, shipping_cents, created_at, updated_at
     FROM order_line_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId]
  )

  return res.rows.map<OrderLineItem>((row) => buildOrderLineItem(row))
}

export async function getOrderLineItemByID(db: PoolClient, id: string): Promise<OrderLineItem | null> {
  const res = await db.query(
    `SELECT id, order_id, product_id, variant_id, sku, title, attributes,
            quantity, unit_price_cents, list_price_cents, sale_price_cents,
            discount_cents, tax_cents, total_cents, applied_offer_ids, product_snapshot,
            status, shipping_cents, created_at, updated_at
     FROM order_line_items
     WHERE id = $1
     ORDER BY created_at ASC`,
    [id]
  )

  if (res.rows.length === 0) return null

  return buildOrderLineItem(res.rows[0])
}

function buildOrderLineItem(row: any): OrderLineItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    variantId: row.variant_id,
    sku: row.sku,
    title: row.title,
    status: row.status,
    attributes: jsonStringObjectToObject<string>(row.attributes),
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    listPriceCents: row.list_price_cents,
    salePriceCents: row.sale_price_cents,
    discountCents: row.discount_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    appliedOfferIds: row.applied_offer_ids || [],
    productSnapshot: jsonObjectToStruct(row.product_snapshot),
    shippingCents: row.shipping_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

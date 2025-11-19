import { PoolClient } from 'pg'
import { OrderLineItem } from '@megacommerce/proto/orders/v1/order_line_items'

import { Context } from '@/models'
import { structToJsonObject } from '@/helpers'

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
        created_at,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5, $6,$7::JSONB,$8,$9,$10,
        $11,$12,$13,$14,$15, $16::JSONB,$17,$18
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
        parseInt(item.createdAt),
        item.updatedAt ? parseInt(item.updatedAt) : null,
      ]
    )
  }
}

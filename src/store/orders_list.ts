import { PoolClient } from 'pg'

import { OrderListItem, OrderLineListItem } from '@megacommerce/proto/orders/v1/orders_list'
import { getInventoryReservationStatusFromString } from '@/models'

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

  let rows: any[] = []
  if (lastId) {
    const res = await db.query(`${select} WHERE user_id = $1 AND id < $2 ORDER BY id DESC LIMIT $3`, [
      userId,
      lastId,
      pageSize,
    ])
    rows = res.rows
  } else {
    const res = await db.query(`${select} WHERE user_id = $1 ORDER BY id DESC LIMIT $2`, [userId, pageSize])
    rows = res.rows
  }

  const orders = rows.map<OrderListItem>((r) => {
    return OrderListItem.create({
      id: r.id,
      shippingCents: r.shipping_cents.toString(),
      currencyCode: r.currency_code,
      totalCents: r.total_cents.toString(),
      status: r.status,
      createdAt: r.created_at.toString(),
      inventoryReservationStatus: getInventoryReservationStatusFromString(r.inventory_reservation_status),
      items: [],
    })
  })

  for (const order of orders) {
    const itemsRes = await db.query(
      `
      SELECT 
        oli.id,
        oli.order_id,
        oli.product_id,
        oli.variant_id,
        oli.title,
        oli.quantity,
        oli.unit_price_cents,
        oli.list_price_cents,
        oli.sale_price_cents,
        oli.discount_cents,
        oli.tax_cents,
        oli.shipping_cents,
        oli.total_cents,
        oli.applied_offer_ids,
        oli.status,
        oli.estimated_delivery_date,
        p.media
      FROM order_line_items oli
      LEFT JOIN products p ON p.id = oli.product_id
      WHERE oli.order_id = $1
      `,
      [order.id]
    )

    order.items = itemsRes.rows.map<OrderLineListItem>((item) => {
      let productImage = ''

      if (item.media) {
        try {
          const media = typeof item.media === 'string' ? JSON.parse(item.media) : item.media
          if (media.media && media.media[item.variant_id]) {
            const variantMedia = media.media[item.variant_id]
            if (variantMedia.images) {
              const images = Object.values(variantMedia.images) as any[]
              if (images.length > 0) {
                productImage = images[0].url || ''
              }
            }
          }
        } catch (e) {
          // If JSON parsing fails, leave productImage empty
          console.error('Failed to parse product media:', e)
        }
      }

      return OrderLineListItem.create({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        variantId: item.variant_id,
        title: item.title,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        listPriceCents: item.list_price_cents,
        salePriceCents: item.sale_price_cents,
        discountCents: item.discount_cents,
        taxCents: item.tax_cents,
        shippingCents: item.shipping_cents,
        totalCents: item.total_cents,
        appliedOfferIds: item.applied_offer_ids || [],
        status: item.status,
        estimatedDeliveryDate: item.estimated_delivery_date
          ? item.estimated_delivery_date.toString()
          : undefined,
        productImage,
      })
    })
  }

  return orders
}

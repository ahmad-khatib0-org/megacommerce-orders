import { ulid } from 'ulid'
import { StatusCode } from 'grpc-web'

import { ProductSnapshot } from '@megacommerce/proto/products/v1/product_snapshot'
import { OrderLineItemRequest } from '@megacommerce/proto/orders/v1/order_create'
import { OrderLineItem } from '@megacommerce/proto/orders/v1/order_line_items'

import { AppError, createAppError, MSG_ID_ERR_INTERNAL } from './errors'
import { productsClient } from '@/helpers'
import { Context } from './context'

export async function orderCreateLineItemsValidate(
  ctx: Context,
  lineItems: OrderLineItemRequest[],
  nowMs: number
): Promise<{
  error?: AppError
  items?: {
    items: OrderLineItem[]
    subtotalCents: number
    totalDiscountCents: number
    totalTaxCents: number
  }
}> {
  let ai = (id: string, statusCode: StatusCode = StatusCode.INVALID_ARGUMENT) => {
    return createAppError(ctx, 'orders.controller.orderCreate', id, null, '', statusCode)
  }

  const getProductSnapshot = (productId: string) => {
    return new Promise<ProductSnapshot>((res, rej) => {
      productsClient().productSnapshot({ productId }, (err, response) => {
        if (err) rej(ai(MSG_ID_ERR_INTERNAL, StatusCode.INTERNAL))
        if (response.error) rej(response.error) // this already toProto
        if (!response.data) rej(ai('products.not_found.error', StatusCode.NOT_FOUND))
        else res(response.data)
      })
    })
  }

  const items: OrderLineItem[] = []
  let subtotalCents = 0
  let totalDiscountCents = 0
  let totalTaxCents = 0

  for (const item of lineItems) {
    const { productId, variantId, unitPriceCentsClient, metadata, sku, quantity } = item
    const priceCentsClient = parseInt(unitPriceCentsClient ?? '')

    if (isNaN(priceCentsClient)) {
      return { error: ai('orders.create.invalid_price') }
    }
    if (!productId || !variantId) {
      return { error: ai('orders.create.missing_product_id') }
    }
    if (quantity <= 0) {
      return { error: ai('orders.quantity.invalid') }
    }

    try {
      const { offer, title } = await getProductSnapshot(productId)
      const variant = offer?.offer?.[variantId]
      if (!variant) return { error: ai('products.not_found.error', StatusCode.NOT_FOUND) }
      const { price, salePrice, hasSalePrice, listPrice } = variant

      const salePriceDB = !salePrice ? NaN : Math.round(parseInt(salePrice) * 100)
      const priceCentsDB = Math.round(parseFloat(price) * 100)

      // TODO: validate if the sale_price_end is still applicable
      if (priceCentsClient !== (hasSalePrice ? salePriceDB : priceCentsDB)) {
        return { error: ai('orders.price.mismatch') }
      }

      const unitPrice = hasSalePrice ? salePriceDB : priceCentsDB
      const lineSubtotal = unitPrice * quantity
      const discountCents = 0 // apply promotions here
      const taxCents = 0 // or call tax service
      const lineTotal = lineSubtotal - discountCents + taxCents

      subtotalCents += lineSubtotal
      totalDiscountCents += discountCents
      totalTaxCents += taxCents

      // NOTE: for the toString() use, uint64 proto message fields got converted to string
      items.push({
        id: ulid(),
        productId,
        variantId,
        orderId: '',
        sku: variant.sku,
        title,
        attributes: item.metadata ?? {},
        quantity,
        unitPriceCents: priceCentsDB.toString(),
        listPriceCents: listPrice,
        salePriceCents: salePriceDB.toString(),
        discountCents: discountCents.toString(),
        taxCents: taxCents.toString(),
        totalCents: lineTotal.toString(),
        appliedOfferIds: [], // fill if promotions applied
        productSnapshot: undefined, // handle it later
        createdAt: nowMs.toString(),
      })
    } catch (err) {
      return { error: err as AppError }
    }
  }

  return { items: { items, subtotalCents, totalDiscountCents, totalTaxCents } }
}

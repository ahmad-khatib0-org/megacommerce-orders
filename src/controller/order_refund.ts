import { StatusCode } from 'grpc-web'
import { ServerUnaryCall } from '@grpc/grpc-js'

import { OrderRefundRequest, OrderRefundResponse } from '@megacommerce/proto/orders/v1/order_refund'
import { refundOrder } from '@/store/order_refund'
import { getOrderById } from '@/store/orders'
import { getOrderLineItemByID } from '@/store/order_line_items'
import {
  AppErrorErrors,
  Context,
  createAppError,
  getOrderLineItemStatusValue,
  MSG_ID_ERR_INTERNAL,
  Trans,
} from '@/models'
import { Controller } from '.'
import { OrderLineItemStatus } from '@megacommerce/proto/orders/v1/order_line_items'

export async function orderRefund(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<OrderRefundRequest, OrderRefundResponse>
): Promise<OrderRefundResponse> {
  const startTime = Date.now()
  ctr.metrics.orderRefundTotal.inc()
  const { orderId, reason, refundShipping, item } = req.request

  let ai = (id: string, statusCode: StatusCode = StatusCode.INVALID_ARGUMENT, err?: Error) => {
    let errors: AppErrorErrors | undefined
    if (err) errors = { err, errorsInternal: null, errorsNestedInternal: null }
    ctr.metrics.orderRefundErrors.inc()
    return createAppError(ctx, 'orders.controller.orderCancel', id, null, '', statusCode, errors).toProto()
  }

  if (!orderId) return { error: ai('error.not_found', StatusCode.NOT_FOUND) }
  if (!item) return { error: ai('orders.refund.item_missing', StatusCode.NOT_FOUND) }

  try {
    const order = await getOrderById(ctr.db, orderId)
    if (!order) return { error: ai('error.not_found', StatusCode.NOT_FOUND) }
    const orderLineItem = await getOrderLineItemByID(ctr.db, item.id)
    if (!orderLineItem) return { error: ai('error.not_found', StatusCode.NOT_FOUND) }

    const refunded = getOrderLineItemStatusValue(OrderLineItemStatus.ORDER_LINE_ITEM_STATUS_REFUNDED)
    if (orderLineItem.status === refunded) {
      const message = Trans.tr(ctx.acceptLanguage, 'orders.refund.alread_refunded')
      const duration = (Date.now() - startTime) / 1000
      ctr.metrics.requestDuration.observe(duration)
      return { data: { message, metadata: {} } }
    }

    const event = JSON.stringify({ reason, refund_shipping: refundShipping })
    await refundOrder(ctr.db, ctx, orderId, event)

    const message = Trans.tr(ctx.acceptLanguage, 'orders.refund.successfully')
    const duration = (Date.now() - startTime) / 1000
    ctr.metrics.requestDuration.observe(duration)
    return { data: { message, metadata: { order_id: orderId } } }
  } catch (err: any) {
    ctr.metrics.orderRefundErrors.inc()
    return { error: ai(MSG_ID_ERR_INTERNAL, StatusCode.INTERNAL, err) }
  }
}

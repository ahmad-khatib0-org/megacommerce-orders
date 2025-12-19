import { StatusCode } from 'grpc-web'
import { ServerUnaryCall } from '@grpc/grpc-js'
import { OrderGetRequest, OrderGetResponse } from '@megacommerce/proto/orders/v1/order_get'

import { getOrderById } from '@/store/orders'
import { getOrderLineItemsByOrderId } from '@/store/order_line_items'
import { AppErrorErrors, Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'
import { Controller } from '.'

export async function orderGet(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<OrderGetRequest, OrderGetResponse>
) {
  const startTime = Date.now()
  ctr.metrics.orderGetTotal.inc()
  const orderId = req.request.orderId

  let ai = (id: string, statusCode: StatusCode = StatusCode.INVALID_ARGUMENT, err?: Error) => {
    let errors: AppErrorErrors | undefined
    if (err) errors = { err, errorsInternal: null, errorsNestedInternal: null }
    ctr.metrics.orderGetErrors.inc()
    return createAppError(ctx, 'orders.controller.orderGet', id, null, '', statusCode, errors).toProto()
  }

  if (!orderId) return ai('error.not_found', StatusCode.NOT_FOUND)

  try {
    const order = await getOrderById(ctr.db, orderId)
    if (!order) return ai('error.not_found', StatusCode.NOT_FOUND)

    const lines = await getOrderLineItemsByOrderId(ctr.db, orderId)
    order.lineItems = lines

    const duration = (Date.now() - startTime) / 1000
    ctr.metrics.requestDuration.observe(duration)
    return { data: order }
  } catch (err: any) {
    ctr.metrics.orderGetErrors.inc()
    return { error: ai(MSG_ID_ERR_INTERNAL, StatusCode.INTERNAL), err }
  }
}

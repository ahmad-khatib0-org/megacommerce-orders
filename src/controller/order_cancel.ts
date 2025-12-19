import { StatusCode } from 'grpc-web'
import { ServerUnaryCall } from '@grpc/grpc-js'
import { OrderCancelRequest, OrderCancelResponse } from '@megacommerce/proto/orders/v1/order_cancel'

import { cancelOrder } from '@/store/order_cancel'
import { AppErrorErrors, Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'
import { Controller } from '.'

export async function orderCancel(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<OrderCancelRequest, OrderCancelResponse>
): Promise<OrderCancelResponse> {
  const startTime = Date.now()
  ctr.metrics.orderCancelTotal.inc()
  const { refund, reason, orderId } = req.request

  let ai = (id: string, statusCode: StatusCode = StatusCode.INVALID_ARGUMENT, err?: Error) => {
    let errors: AppErrorErrors | undefined
    if (err) errors = { err, errorsInternal: null, errorsNestedInternal: null }
    ctr.metrics.orderCancelErrors.inc()
    return createAppError(ctx, 'orders.controller.orderCancel', id, null, '', statusCode, errors).toProto()
  }

  if (!orderId) return { error: ai('error.not_found', StatusCode.NOT_FOUND) }

  try {
    const res = await cancelOrder(ctr.db, orderId, { reason, refund })
    if (!res.ok) {
      if (res.reason === 'not_found') {
        return { error: ai('error.not_found', StatusCode.NOT_FOUND) }
      }
      return { error: ai('orders.cancel.can_not_cancel', StatusCode.ABORTED) }
    }
    const duration = (Date.now() - startTime) / 1000
    ctr.metrics.requestDuration.observe(duration)
    return { data: { message: 'order cancelled', metadata: { order_id: orderId } } }
  } catch (err: any) {
    ctr.metrics.orderCancelErrors.inc()
    return { error: ai(MSG_ID_ERR_INTERNAL, StatusCode.INTERNAL, err) }
  }
}

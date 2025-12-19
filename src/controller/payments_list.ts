import { ServerUnaryCall } from '@grpc/grpc-js'
import { StatusCode } from 'grpc-web'
import { PaymentsListRequest, PaymentsListResponse, PaymentsListData } from '@megacommerce/proto/orders/v1/payment_method'

import { Controller } from '.'
import { listPaymentMethods } from '@/store/payment_methods'
import { Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'

export async function paymentsList(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<PaymentsListRequest, PaymentsListResponse>
): Promise<PaymentsListResponse> {
  const startTime = Date.now()
  ctr.metrics.paymentsListTotal.inc()
  const path = 'orders.controller.paymentsList'

  try {
    const paymentMethods = await listPaymentMethods(ctr.db, ctx.session.userId)

    const duration = (Date.now() - startTime) / 1000
    ctr.metrics.requestDuration.observe(duration)
    return PaymentsListResponse.create({
      data: PaymentsListData.create({ paymentMethods }),
    })
  } catch (err: any) {
    ctr.metrics.paymentsListErrors.inc()
    const errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return {
      error: createAppError(ctx, path, MSG_ID_ERR_INTERNAL, null, '', StatusCode.INTERNAL, errors).toProto(),
    }
  }
}

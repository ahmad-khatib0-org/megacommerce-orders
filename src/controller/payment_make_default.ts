import { ServerUnaryCall } from '@grpc/grpc-js'
import { StatusCode } from 'grpc-web'
import {
  PaymentMakeDefaultRequest,
  PaymentMakeDefaultResponse,
} from '@megacommerce/proto/orders/v1/payment_method'

import { Controller } from '.'
import { makePaymentMethodDefault } from '@/store/payment_methods'
import { Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'

export async function paymentMakeDefault(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<PaymentMakeDefaultRequest, PaymentMakeDefaultResponse>
): Promise<PaymentMakeDefaultResponse> {
  const path = 'orders.controller.paymentMakeDefault'

  try {
    const method = await makePaymentMethodDefault(ctr.db, ctx.session.userId, req.request.paymentMethodId)

    if (!method) {
      const err = 'Payment method not found'
      return {
        error: createAppError(ctx, path, 'error.not_found', null, err, StatusCode.NOT_FOUND).toProto(),
      }
    }

    return PaymentMakeDefaultResponse.create({ data: method })
  } catch (err: any) {
    const errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return {
      error: createAppError(ctx, path, MSG_ID_ERR_INTERNAL, null, '', StatusCode.INTERNAL, errors).toProto(),
    }
  }
}

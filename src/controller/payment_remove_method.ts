import { ServerUnaryCall } from '@grpc/grpc-js'
import { StatusCode } from 'grpc-web'
import {
  PaymentRemoveMethodRequest,
  PaymentRemoveMethodResponse,
  PaymentRemoveMethodData,
} from '@megacommerce/proto/orders/v1/payment_method'

import { Controller } from '.'
import { removePaymentMethod } from '@/store/payment_methods'
import { Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'

export async function paymentRemoveMethod(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<PaymentRemoveMethodRequest, PaymentRemoveMethodResponse>
): Promise<PaymentRemoveMethodResponse> {
  const path = 'orders.controller.paymentRemoveMethod'

  try {
    const success = await removePaymentMethod(ctr.db, ctx.session.userId, req.request.paymentMethodId)

    if (!success) {
      const err = 'Payment method not found'
      return {
        error: createAppError(ctx, path, 'error.not_found', null, err, StatusCode.NOT_FOUND).toProto(),
      }
    }

    return PaymentRemoveMethodResponse.create({
      data: PaymentRemoveMethodData.create({ success: true }),
    })
  } catch (err: any) {
    const errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return {
      error: createAppError(ctx, path, MSG_ID_ERR_INTERNAL, null, '', StatusCode.INTERNAL, errors).toProto(),
    }
  }
}

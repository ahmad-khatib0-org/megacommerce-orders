import { ServerUnaryCall } from '@grpc/grpc-js'
import { StatusCode } from 'grpc-web'
import {
  PaymentAddMethodRequest,
  PaymentAddMethodResponse,
} from '@megacommerce/proto/orders/v1/payment_method'

import { Controller } from '.'
import { addPaymentMethod } from '@/store/payment_methods'
import { Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'

export async function paymentAddMethod(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<PaymentAddMethodRequest, PaymentAddMethodResponse>
): Promise<PaymentAddMethodResponse> {
  const path = 'orders.controller.paymentAddMethod'

  try {
    const method = await addPaymentMethod(ctr.db, ctx.session.userId, {
      type: req.request.type,
      name: req.request.name,
      lastFour: req.request.lastFour!,
      expiryDate: req.request.expiryDate!,
      token: req.request.token,
    })

    return PaymentAddMethodResponse.create({ data: method })
  } catch (err: any) {
    const errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return {
      error: createAppError(ctx, path, MSG_ID_ERR_INTERNAL, null, '', StatusCode.INTERNAL, errors).toProto(),
    }
  }
}

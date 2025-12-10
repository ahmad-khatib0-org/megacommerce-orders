import { ServerUnaryCall } from '@grpc/grpc-js'
import { StatusCode } from 'grpc-web'
import { OrdersListRequest, OrdersListResponse } from '@megacommerce/proto/orders/v1/orders_list'

import { Controller } from '.'
import { listOrdersForUser } from '@/store/orders_list'
import { Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'
import { buildPaginationResponse, checkLastId } from '@/helpers'

export async function ordersList(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<OrdersListRequest, OrdersListResponse>
): Promise<OrdersListResponse> {
  const path = 'orders.controller.ordersList'
  const pagination = req.request.pagination

  const lastIdErr = checkLastId(ctx, path, pagination)
  if (lastIdErr) return { error: lastIdErr.toProto() }

  try {
    const pageSize = 20
    const lastId = pagination?.lastId ?? ''
    const orders = await listOrdersForUser(ctr.db, ctx.session.userId, { pageSize, lastId })
    return {
      data: {
        orders,
        pagination: buildPaginationResponse(pagination!, orders.length),
      },
    }
  } catch (err: any) {
    const errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return {
      error: createAppError(ctx, path, MSG_ID_ERR_INTERNAL, null, '', StatusCode.INTERNAL, errors).toProto(),
    }
  }
}

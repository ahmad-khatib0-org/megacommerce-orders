import { ServerUnaryCall } from '@grpc/grpc-js'
import { OrdersListRequest, OrdersListResponse } from '@megacommerce/proto/orders/v1/orders_list'

import { Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'
import { listOrdersForUser } from '@/store/orders_list'
import { Controller } from '.'
import { StatusCode } from 'grpc-web'

export async function ordersList(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<OrdersListRequest, OrdersListResponse>
): Promise<OrdersListResponse> {
  const pagination = req.request.pagination
  const pageSize = Number(pagination?.pageSize ?? 20)

  try {
    const orders = await listOrdersForUser(ctr.db, ctx.session.userId, {
      pageSize,
      lastID: pagination?.lastId,
    })
    return {
      data: {
        orders,
        pagination: {
          hasNext: orders.length < pageSize,
          hasPrevious: (pagination?.page ?? 1) > 1,
          nextPageToken: '',
          previousPageToken: '',
        },
      },
    }
  } catch (err: any) {
    return {
      error: createAppError(
        ctx,
        'orders.controller.ordersList',
        MSG_ID_ERR_INTERNAL,
        null,
        '',
        StatusCode.INTERNAL,
        { err, errorsInternal: null, errorsNestedInternal: null }
      ).toProto(),
    }
  }
}

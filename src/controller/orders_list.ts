import { ServerUnaryCall } from '@grpc/grpc-js'
import { StatusCode } from 'grpc-web'
import {
  OrdersListRequest,
  OrdersListResponse,
  OrdersListResponseData,
} from '@megacommerce/proto/orders/v1/orders_list'

import { Controller } from '.'
import { listOrdersForUser } from '@/store/orders_list'
import { Context, createAppError, MSG_ID_ERR_INTERNAL } from '@/models'
import { buildPaginationResponse, checkLastId } from '@/helpers'

export async function ordersList(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<OrdersListRequest, OrdersListResponse>
): Promise<OrdersListResponse> {
  const startTime = Date.now()
  ctr.metrics.orderListTotal.inc()
  const path = 'orders.controller.ordersList'
  const pagination = req.request.pagination

  const lastIdErr = checkLastId(ctx, path, pagination)
  if (lastIdErr) {
    ctr.metrics.orderListErrors.inc()
    return { error: lastIdErr.toProto() }
  }

  try {
    const pageSize = 20
    const lastId = pagination?.lastId ?? ''
    const orders = await listOrdersForUser(ctr.db, ctx.session.userId, { pageSize, lastId })

    const data = OrdersListResponseData.create({
      orders,
      pagination: buildPaginationResponse(pagination!, orders.length),
    })

    const duration = (Date.now() - startTime) / 1000
    ctr.metrics.requestDuration.observe(duration)
    return OrdersListResponse.create({ data })
  } catch (err: any) {
    ctr.metrics.orderListErrors.inc()
    const errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return {
      error: createAppError(ctx, path, MSG_ID_ERR_INTERNAL, null, '', StatusCode.INTERNAL, errors).toProto(),
    }
  }
}

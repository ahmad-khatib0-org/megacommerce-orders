import { StatusCode } from 'grpc-web'

import { SuccessResponseData } from '@megacommerce/proto/shared/v1/types'
import {
  InventoryReserveRequestItem,
  InventoryReserveResponseData,
} from '@megacommerce/proto/inventory/v1/inventory_reserve'
import { InventoryReservationStatus } from '@megacommerce/proto/inventory/v1/reservation_get'

import {
  AppError,
  AppErrorErrors,
  appErrorFromProtoAppError,
  Context,
  createAppError,
  MSG_ID_ERR_INTERNAL,
} from '@/models'
import { inventoryClient } from '@/helpers'

export async function inventoryReserve(
  ctx: Context,
  orderId: string,
  lines: InventoryReserveRequestItem[]
): Promise<{
  error?: AppError
  data?: {
    status: InventoryReservationStatus
    reservationToken: string
  }
}> {
  let ai = (id: string, err?: Error, statusCode: StatusCode = StatusCode.INTERNAL) => {
    let errors: AppErrorErrors | undefined = undefined
    if (err) errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return createAppError(ctx, 'orders.controller.inventoryReserve', id, null, '', statusCode, errors)
  }
  const request = (): Promise<InventoryReserveResponseData> => {
    return new Promise<InventoryReserveResponseData>((resolve, reject) => {
      inventoryClient(ctx).inventoryReserve({ orderId, ttlSeconds: '60', items: lines }, (err, res) => {
        if (err) reject(ai(MSG_ID_ERR_INTERNAL, err))
        if (res.error) reject(appErrorFromProtoAppError(ctx, res.error))
        resolve(res.data!)
      })
    })
  }

  // NOTE: no need for the items, currently I make the logic as: Either reserve
  // all the items the user ordered, or return an error describing what could not
  // be resolved (e.g., due to out of stock, not enough quantity...)
  // later on we can support E.g partial reserving, so items can have a use than
  try {
    const { status, reservationToken } = await request()
    return { data: { status, reservationToken: reservationToken } }
  } catch (err: unknown) {
    return { error: err as AppError }
  }
}

// TODO: implement the function
export async function inventoryRelease(ctx: Context, reservationToken: string) {
  // For now, return a dummy success
  let ai = (id: string, err?: Error, statusCode: StatusCode = StatusCode.INTERNAL) => {
    let errors: AppErrorErrors | undefined = undefined
    if (err) errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return createAppError(ctx, 'orders.controller.inventoryRelease', id, null, '', statusCode, errors)
  }
  const request = (): Promise<SuccessResponseData> => {
    return new Promise<SuccessResponseData>((resolve, reject) => {
      inventoryClient(ctx).inventoryRelease({ reservationToken }, (err, res) => {
        if (err) reject(ai(MSG_ID_ERR_INTERNAL, err))
        if (res.error) reject(appErrorFromProtoAppError(ctx, res.error))
        resolve(res.data!)
      })
    })
  }

  try {
    await request()
  } catch (err: unknown) {
    throw err as AppError
  }
}

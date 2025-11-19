import {
  InventoryReservationStatus,
  InventoryReserveRequestItem,
} from '@megacommerce/proto/inventory/v1/inventory_reserve'

import { Controller } from '.'
import { AppError, getInventoryReservationStatusValue } from '@/models'

// TODO: implement the function
export async function inventoryReserve(
  ctr: Controller,
  orderId: string,
  lines: Array<InventoryReserveRequestItem>,
  ttlSeconds = 600
): Promise<{
  error?: AppError
  data?: {
    status: string
    reservationToken: string
  }
}> {
  // For now, return a dummy success
  return {
    data: {
      status: getInventoryReservationStatusValue(InventoryReservationStatus.INVENTORY_RESERVED),
      reservationToken: 'res_' + orderId,
    },
  }
}

// TODO: implement the function
export async function inventoryRelease(reservationToken: string) {
  // For now, return a dummy success
  return { ok: true }
}

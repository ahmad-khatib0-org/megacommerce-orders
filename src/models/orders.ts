import { OrderStatus, PaymentStatus } from '@megacommerce/proto/orders/v1/order'
import { OrderIdempotencyKeyStatus } from '@megacommerce/proto/orders/v1/order_idempotency_keys'
import { OrderEventType } from '@megacommerce/proto/orders/v1/order_events'
import { InventoryReservationStatus } from '@megacommerce/proto/inventory/v1/reservation_get'

export const ORDER_IDEMPOTENCY_KEY_EXPIRES_AT_MILISECONDS = 3 * 24 * 60 * 60 * 1000 // 3 days

export function getOrderEventTypeValue(eventType: OrderEventType): string {
  const mapping: Record<OrderEventType, string> = {
    [OrderEventType.UNRECOGNIZED]: 'UNRECOGNIZED', // -1 can't happen
    [OrderEventType.ORDER_EVENT_UNKNOWN]: 'UNKNOWN',
    [OrderEventType.ORDER_EVENT_ORDER_CREATED]: 'CREATED',
    [OrderEventType.ORDER_EVENT_PAYMENT_CAPTURED]: 'PAYMENT_CAPTURED',
    [OrderEventType.ORDER_EVENT_PAYMENT_FAILED]: 'PAYMENT_FAILED',
    [OrderEventType.ORDER_EVENT_ORDER_SHIPPED]: 'SHIPPED',
    [OrderEventType.ORDER_EVENT_ORDER_DELIVERED]: 'DELIVERED',
    [OrderEventType.ORDER_EVENT_ORDER_CANCELLED]: 'CANCELLED',
    [OrderEventType.ORDER_EVENT_ORDER_REFUNDED]: 'REFUNDED',
    [OrderEventType.ORDER_EVENT_INVENTORY_RESERVED]: 'INVENTORY_RESERVED',
    [OrderEventType.ORDER_EVENT_INVENTORY_RELEASED]: 'INVENTORY_RELEASED',
  }

  return mapping[eventType]
}

export function getOrderIdempotencyKeyStatusValue(status: OrderIdempotencyKeyStatus): string {
  const mapping: Record<OrderIdempotencyKeyStatus, string> = {
    [OrderIdempotencyKeyStatus.UNRECOGNIZED]: 'UNRECOGNIZED', // -1 can't happen
    [OrderIdempotencyKeyStatus.IN_PROGRESS]: 'IN_PROGRESS',
    [OrderIdempotencyKeyStatus.COMPLETED]: 'COMPLETED',
    [OrderIdempotencyKeyStatus.FAILED]: 'FAILED',
  }

  return mapping[status]
}

export function getInventoryReservationStatusValue(status: InventoryReservationStatus): string {
  const mapping: Record<InventoryReservationStatus, string> = {
    [InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_UNSPECIFIED]: 'UNRECOGNIZED', // 0
    [InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_RESERVED]: 'RESERVED',
    [InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_PARTIALLY_RESERVED]: 'PARTIALLY_RESERVED',
    [InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_NOT_RESERVED]: 'NOT_RESERVED',
    [InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_PENDING]: 'PENDING',
    [InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_RELEASED]: 'RELEASED',
    [InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_FULFILLED]: 'FULFILLED',
    [InventoryReservationStatus.UNRECOGNIZED]: 'UNRECOGNIZED', // -1 i'm not sure why this get added !
  }

  return mapping[status]
}

export function getInventoryReservationStatusFromString(statusStr: string): InventoryReservationStatus {
  const upperStatus = statusStr.toUpperCase()

  switch (upperStatus) {
    case 'RESERVED':
      return InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_RESERVED
    case 'PARTIALLY_RESERVED':
      return InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_PARTIALLY_RESERVED
    case 'NOT_RESERVED':
      return InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_NOT_RESERVED
    case 'PENDING':
      return InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_PENDING
    case 'RELEASED':
      return InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_RELEASED
    case 'FULFILLED':
      return InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_FULFILLED
    case 'UNRECOGNIZED':
      return InventoryReservationStatus.UNRECOGNIZED
    default:
      return InventoryReservationStatus.INVENTORY_RESERVATION_STATUS_UNSPECIFIED
  }
}

export function getPaymentStatusValue(status: PaymentStatus): string {
  const mapping: Record<PaymentStatus, string> = {
    [PaymentStatus.UNRECOGNIZED]: 'UNRECOGNIZED', // -1 can't happen
    [PaymentStatus.PAYMENT_UNKNOWN]: 'UNKNOWN',
    [PaymentStatus.PAYMENT_AUTHORIZED]: 'AUTHORIZED',
    [PaymentStatus.PAYMENT_CAPTURED]: 'CAPTURED',
    [PaymentStatus.PAYMENT_FAILED]: 'FAILED',
  }

  return mapping[status]
}

export function getOrderStatusValue(status: OrderStatus): string {
  const mapping: Record<OrderStatus, string> = {
    [OrderStatus.UNRECOGNIZED]: 'UNRECOGNIZED', // -1 can't happen
    [OrderStatus.ORDER_STATUS_CREATED]: 'CREATED',
    [OrderStatus.ORDER_STATUS_CONFIRMED]: 'CONFIRMED',
    [OrderStatus.ORDER_STATUS_SHIPPED]: 'SHIPPED',
    [OrderStatus.ORDER_STATUS_DELIVERED]: 'DELIVERED',
    [OrderStatus.ORDER_STATUS_CANCELLED]: 'CANCELLED',
    [OrderStatus.ORDER_STATUS_REFUNDED]: 'REFUNDED',
    [OrderStatus.ORDER_STATUS_PAYMENT_FAILED]: 'PAYMENT_FAILED',
    [OrderStatus.ORDER_STATUS_PAYMENT_SUCCEEDED]: 'PAYMENT_SUCCEEDED',
    [OrderStatus.ORDER_STATUS_REFUND_REQUESTED]: 'REFUND_REQUESTED',
  }

  return mapping[status]
}

import { InventoryReservationStatus, OrderStatus, PaymentStatus } from '@megacommerce/proto/orders/v1/order'
import { OrderIdempotencyKeyStatus } from '@megacommerce/proto/orders/v1/order_idempotency_keys'
import { OrderEventType } from '@megacommerce/proto/orders/v1/order_events'

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
    [InventoryReservationStatus.UNRECOGNIZED]: 'UNRECOGNIZED', // -1 can't happen
    [InventoryReservationStatus.INVENTORY_UNKNOWN]: 'UNKNOWN',
    [InventoryReservationStatus.INVENTORY_RESERVED]: 'RESERVED',
    [InventoryReservationStatus.INVENTORY_PARTIALLY_RESERVED]: 'PARTIALLY_RESERVED',
    [InventoryReservationStatus.INVENTORY_NOT_RESERVED]: 'NOT_RESERVED',
    [InventoryReservationStatus.INVENTORY_PENDING]: 'PENDING',
  }

  return mapping[status]
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
    [OrderStatus.CREATED]: 'CREATED',
    [OrderStatus.CONFIRMED]: 'CONFIRMED',
    [OrderStatus.SHIPPED]: 'SHIPPED',
    [OrderStatus.DELIVERED]: 'DELIVERED',
    [OrderStatus.CANCELLED]: 'CANCELLED',
    [OrderStatus.REFUNDED]: 'REFUNDED',
  }

  return mapping[status]
}

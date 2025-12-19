import { Counter, Histogram, register } from 'prom-client'

export interface MetricsCollector {
  orderCreateTotal: Counter
  orderCreateErrors: Counter
  orderGetTotal: Counter
  orderGetErrors: Counter
  orderListTotal: Counter
  orderListErrors: Counter
  orderCancelTotal: Counter
  orderCancelErrors: Counter
  orderRefundTotal: Counter
  orderRefundErrors: Counter
  paymentAddMethodTotal: Counter
  paymentAddMethodErrors: Counter
  paymentRemoveMethodTotal: Counter
  paymentRemoveMethodErrors: Counter
  paymentMakeDefaultTotal: Counter
  paymentMakeDefaultErrors: Counter
  paymentsListTotal: Counter
  paymentsListErrors: Counter
  paymentChargeTotal: Counter
  paymentChargeErrors: Counter
  inventoryReserveTotal: Counter
  inventoryReleaseTotal: Counter
  dbOperationDuration: Histogram
  requestDuration: Histogram
}

export function createMetricsCollector(): MetricsCollector {
  // Order operations
  const orderCreateTotal = new Counter({
    name: 'orders_order_create_total',
    help: 'Total number of order create requests',
    registers: [register],
  })

  const orderCreateErrors = new Counter({
    name: 'orders_order_create_errors_total',
    help: 'Total number of failed order create requests',
    registers: [register],
  })

  const orderGetTotal = new Counter({
    name: 'orders_order_get_total',
    help: 'Total number of order get requests',
    registers: [register],
  })

  const orderGetErrors = new Counter({
    name: 'orders_order_get_errors_total',
    help: 'Total number of failed order get requests',
    registers: [register],
  })

  const orderListTotal = new Counter({
    name: 'orders_order_list_total',
    help: 'Total number of order list requests',
    registers: [register],
  })

  const orderListErrors = new Counter({
    name: 'orders_order_list_errors_total',
    help: 'Total number of failed order list requests',
    registers: [register],
  })

  const orderCancelTotal = new Counter({
    name: 'orders_order_cancel_total',
    help: 'Total number of order cancel requests',
    registers: [register],
  })

  const orderCancelErrors = new Counter({
    name: 'orders_order_cancel_errors_total',
    help: 'Total number of failed order cancel requests',
    registers: [register],
  })

  const orderRefundTotal = new Counter({
    name: 'orders_order_refund_total',
    help: 'Total number of order refund requests',
    registers: [register],
  })

  const orderRefundErrors = new Counter({
    name: 'orders_order_refund_errors_total',
    help: 'Total number of failed order refund requests',
    registers: [register],
  })

  // Payment method operations
  const paymentAddMethodTotal = new Counter({
    name: 'orders_payment_add_method_total',
    help: 'Total number of payment add method requests',
    registers: [register],
  })

  const paymentAddMethodErrors = new Counter({
    name: 'orders_payment_add_method_errors_total',
    help: 'Total number of failed payment add method requests',
    registers: [register],
  })

  const paymentRemoveMethodTotal = new Counter({
    name: 'orders_payment_remove_method_total',
    help: 'Total number of payment remove method requests',
    registers: [register],
  })

  const paymentRemoveMethodErrors = new Counter({
    name: 'orders_payment_remove_method_errors_total',
    help: 'Total number of failed payment remove method requests',
    registers: [register],
  })

  const paymentMakeDefaultTotal = new Counter({
    name: 'orders_payment_make_default_total',
    help: 'Total number of payment make default requests',
    registers: [register],
  })

  const paymentMakeDefaultErrors = new Counter({
    name: 'orders_payment_make_default_errors_total',
    help: 'Total number of failed payment make default requests',
    registers: [register],
  })

  const paymentsListTotal = new Counter({
    name: 'orders_payments_list_total',
    help: 'Total number of payments list requests',
    registers: [register],
  })

  const paymentsListErrors = new Counter({
    name: 'orders_payments_list_errors_total',
    help: 'Total number of failed payments list requests',
    registers: [register],
  })

  // Payment processing
  const paymentChargeTotal = new Counter({
    name: 'orders_payment_charge_total',
    help: 'Total number of payment charge attempts',
    registers: [register],
  })

  const paymentChargeErrors = new Counter({
    name: 'orders_payment_charge_errors_total',
    help: 'Total number of failed payment charges',
    registers: [register],
  })

  // Inventory operations
  const inventoryReserveTotal = new Counter({
    name: 'orders_inventory_reserve_total',
    help: 'Total number of inventory reserve requests',
    registers: [register],
  })

  const inventoryReleaseTotal = new Counter({
    name: 'orders_inventory_release_total',
    help: 'Total number of inventory release requests',
    registers: [register],
  })

  // Latency metrics
  const dbOperationDuration = new Histogram({
    name: 'orders_db_operation_duration_seconds',
    help: 'Database operation duration in seconds',
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register],
  })

  const requestDuration = new Histogram({
    name: 'orders_request_duration_seconds',
    help: 'Request duration in seconds',
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register],
  })

  return {
    orderCreateTotal,
    orderCreateErrors,
    orderGetTotal,
    orderGetErrors,
    orderListTotal,
    orderListErrors,
    orderCancelTotal,
    orderCancelErrors,
    orderRefundTotal,
    orderRefundErrors,
    paymentAddMethodTotal,
    paymentAddMethodErrors,
    paymentRemoveMethodTotal,
    paymentRemoveMethodErrors,
    paymentMakeDefaultTotal,
    paymentMakeDefaultErrors,
    paymentsListTotal,
    paymentsListErrors,
    paymentChargeTotal,
    paymentChargeErrors,
    inventoryReserveTotal,
    inventoryReleaseTotal,
    dbOperationDuration,
    requestDuration,
  }
}

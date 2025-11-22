import { StatusCode } from 'grpc-web'
import { ServerUnaryCall } from '@grpc/grpc-js'
import { validate } from 'uuid'
import { ulid } from 'ulid'

import { Order, OrderStatus, PaymentStatus } from '@megacommerce/proto/orders/v1/order'
import { OrderCreateRequest, OrderCreateResponse } from '@megacommerce/proto/orders/v1/order_create'
import {
  OrderIdempotencyKey,
  OrderIdempotencyKeyStatus,
} from '@megacommerce/proto/orders/v1/order_idempotency_keys'
import { InventoryReserveRequestItem } from '@megacommerce/proto/inventory/v1/inventory_reserve'

import {
  acquireOrderIdempotencyKey,
  insertOrderIdempotencyKey,
  updateOrderIdempotencyKeyAfterSuccessPayment,
  updateOrderIdempotencyKeyStatus,
} from '@/store/idempotency'
import {
  AppErrorErrors,
  Context,
  createAppError,
  getInventoryReservationStatusValue,
  getOrderEventTypeValue,
  getOrderIdempotencyKeyStatusValue,
  getOrderStatusValue,
  getPaymentStatusValue,
  MSG_ID_ERR_INTERNAL,
  ORDER_IDEMPOTENCY_KEY_EXPIRES_AT_MILISECONDS,
  Trans,
} from '@/models'
import { Controller } from '.'
import { objectToStruct } from '@/helpers'
import { insertOrder, updateOrderPaymentStatus, updateOrderPaymentSucceeded } from '@/store/orders'
import { orderCreateLineItemsValidate } from '@/models/order_create'
import { inventoryRelease, inventoryReserve } from './inventory'
import { insertOrderLineItems } from '@/store/order_line_items'
import { insertOrderEvent } from '@/store/order_events'
import { OrderEvent, OrderEventType } from '@megacommerce/proto/orders/v1/order_events'
import Stripe from 'stripe'
import { chargePayment } from './payment'
import { InventoryReservationStatus } from '@megacommerce/proto/inventory/v1/reservation_get'

export async function orderCreate(
  ctr: Controller,
  ctx: Context,
  req: ServerUnaryCall<OrderCreateRequest, OrderCreateResponse>
) {
  // Steps:
  // 1. validate req
  // 2. idempotency check (order_idempotency_keys)
  // 3. fetch product data
  // 4. compute totals
  // 5. reserve inventory (call inventoryClient)
  // 6. insert PENDING order + line items
  // 7. call Stripe to charge
  // 8. update order to CONFIRMED or PAYMENT_FAILED

  let ai = (id: string, statusCode: StatusCode = StatusCode.INVALID_ARGUMENT, err?: Error) => {
    let errors: AppErrorErrors | undefined
    if (err) errors = { err, errorsInternal: null, errorsNestedInternal: null }
    return createAppError(ctx, 'orders.controller.orderCreate', id, null, '', statusCode, errors).toProto()
  }

  // TODO: complete the note, promotion, shipping method validation and insertion
  const {
    idempotencyKey,
    items,
    metadata,
    currencyCode,
    customerNote,
    promotionCodes,
    shippingMethod,
    paymentMethodToken,
    billingAddress,
    shippingAddress,
  } = req.request

  if (!idempotencyKey || !validate(idempotencyKey)) {
    return { error: ai('orders.idempotency_key.error') }
  }

  if (!paymentMethodToken) {
    return { error: ai('orders.payment_method_token.error') }
  }

  if (!items.length) {
    return { error: ai('orders.create.missing_items') }
  }

  const orderId = ulid()
  const nowMs = Date.now()

  const db = ctr.db
  try {
    await db.query('BEGIN')
    const idempotency = await acquireOrderIdempotencyKey(ctr.db, idempotencyKey)
    if (idempotency) {
      if (idempotency.status === getOrderIdempotencyKeyStatusValue(OrderIdempotencyKeyStatus.COMPLETED)) {
        await db.query('COMMIT')
        return {
          data: {
            message: Trans.tr(ctx.acceptLanguage, 'orders.create.already_created'),
          },
        }
      }
      if (idempotency.status === getOrderIdempotencyKeyStatusValue(OrderIdempotencyKeyStatus.IN_PROGRESS)) {
        await db.query('COMMIT')
        return {
          data: {
            message: Trans.tr(ctx.acceptLanguage, 'orders.status.processing'),
          },
        }
      }

      // If status === 'FAILED', we allow continuing by updating it to IN_PROGRESS
      try {
        const status = OrderIdempotencyKeyStatus.IN_PROGRESS
        await updateOrderIdempotencyKeyStatus(db, status, nowMs, idempotencyKey)
        await db.query('COMMIT')
      } catch (err) {
        await db.query('ROLLBACK')
        return { error: ai(MSG_ID_ERR_INTERNAL, StatusCode.INTERNAL), err }
      }
    } else {
      const data: OrderIdempotencyKey = {
        id: ulid(),
        idempotencyKey: idempotencyKey,
        userId: ctx.session.userId,
        status: getOrderIdempotencyKeyStatusValue(OrderIdempotencyKeyStatus.IN_PROGRESS),
        createdAt: nowMs.toString(),
        expiresAt: (nowMs + ORDER_IDEMPOTENCY_KEY_EXPIRES_AT_MILISECONDS).toString(),
      }
      try {
        await insertOrderIdempotencyKey(db, data)
        await db.query('COMMIT')
      } catch (err) {
        await db.query('ROLLBACK')
        return { error: ai(MSG_ID_ERR_INTERNAL, StatusCode.INTERNAL), err }
      }
    }

    const { error, items: lineItems } = await orderCreateLineItemsValidate(ctx, items, nowMs)
    if (error) return { error: error }
    const { subtotalCents, totalDiscountCents, totalTaxCents } = lineItems!

    // Shipping and tax calculation (stubbed)
    const shippingCents = 0 // compute using shipping_method or service
    const totalCents = subtotalCents - totalDiscountCents + totalTaxCents + shippingCents

    const reservationLines: InventoryReserveRequestItem[] = lineItems!.items.map((l) => ({
      orderLineItemId: l.id,
      productId: l.productId,
      variantId: l.variantId,
      sku: l.sku,
      quantity: l.quantity,
    }))

    const inventoryResp = await inventoryReserve(ctx, orderId, reservationLines)
    if (inventoryResp.error) return { error: inventoryResp.error }

    await db.query('BEGIN')

    const inventoryReservationStatus = getInventoryReservationStatusValue(inventoryResp.data!.status)
    const orderPayload: Order = {
      id: orderId,
      userId: ctx.session.userId,
      currencyCode: currencyCode,
      subtotalCents: subtotalCents.toString(),
      shippingCents: shippingCents.toString(),
      taxCents: totalTaxCents.toString(),
      discountCents: totalDiscountCents.toString(),
      totalCents: totalCents.toString(),
      paymentProvider: '',
      paymentTransactionId: '',
      paymentStatus: getPaymentStatusValue(PaymentStatus.PAYMENT_UNKNOWN),
      paymentFeeCents: '',
      inventoryReservationStatus: inventoryReservationStatus,
      productSource: 'products-service',
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      metadata: objectToStruct(metadata),
      status: getOrderStatusValue(OrderStatus.ORDER_STATUS_CREATED),
      createdAt: nowMs.toString(),
      updatedAt: nowMs.toString(),
      deletedAt: undefined,
    }

    try {
      await insertOrder(db, ctx, orderPayload)
      await insertOrderLineItems(db, ctx, lineItems!.items, orderId)
      const eventPayload: { [key: string]: any } = {
        reservation_token: inventoryResp.data!.reservationToken,
        reservation_details: inventoryResp,
        subtotal_cents: subtotalCents,
        total_cents: totalCents,
        currency: currencyCode,
      }
      await insertOrderEvent(db, {
        id: ulid(),
        orderId,
        eventPayload: objectToStruct(eventPayload),
        eventType: getOrderEventTypeValue(OrderEventType.ORDER_EVENT_ORDER_CREATED),
        createdAt: nowMs.toString(),
      })
      await db.query('COMMIT')
    } catch (err) {
      await db.query('ROLLBACK')
      return { error: ai(MSG_ID_ERR_INTERNAL, StatusCode.INTERNAL), err }
    }

    let stripeResult: Stripe.PaymentIntent
    try {
      stripeResult = await chargePayment(ctr, totalCents, currencyCode, paymentMethodToken, idempotencyKey)
    } catch (chargeErr) {
      // Payment failed or timed out: release inventory and mark failure

      // TODO:: retry the request and if still fails, send it to DLQ topic
      try {
        await inventoryRelease(ctx, inventoryResp.data!.reservationToken)
      } catch (err) {
        console.error('inventory release failed after payment error', err)
      }

      // update DB: mark order PAYMENT_FAILED and idempotency FAILED

      // TODO: consider retries and send to DLQ on failure
      const nowAfterFail = Date.now()
      await db.query('BEGIN')
      try {
        const status = OrderStatus.ORDER_STATUS_PAYMENT_FAILED
        await updateOrderPaymentStatus(db, orderId, status, PaymentStatus.PAYMENT_FAILED, nowAfterFail)
      } catch (err) {
        await db.query('ROLLBACK')
        console.error('Failed to update order table after payment failure', err)
      }
      try {
        const event: OrderEvent = {
          id: ulid(),
          orderId,
          eventPayload: objectToStruct({ response: chargeErr }),
          eventType: getOrderEventTypeValue(OrderEventType.ORDER_EVENT_PAYMENT_FAILED),
          createdAt: nowAfterFail.toString(),
        }
        await insertOrderEvent(db, event)
      } catch (err) {
        await db.query('ROLLBACK')
        console.error('Failed to insert order even after payment failure', err)
      }
      try {
        updateOrderIdempotencyKeyStatus(db, OrderIdempotencyKeyStatus.FAILED, nowAfterFail, idempotencyKey)
        await db.query('COMMIT')
      } catch (err) {
        await db.query('ROLLBACK')
        console.error('Failed to update order_idempotency_keys table after payment failure', err)
      }

      return { error: ai('orders.payment.failed', StatusCode.INTERNAL), chargeErr }
    }

    // --- Step F: Payment succeeded — update DB and idempotency (small transaction) ---
    const nowAfterSuccess = Date.now()
    try {
      await db.query('BEGIN')
      updateOrderPaymentSucceeded(db, orderId, stripeResult, nowAfterSuccess)
      await insertOrderEvent(db, {
        id: ulid(),
        orderId,
        eventPayload: objectToStruct({ provider: 'stripe', result: stripeResult }),
        eventType: getOrderEventTypeValue(OrderEventType.ORDER_EVENT_PAYMENT_CAPTURED),
        createdAt: nowAfterSuccess.toString(),
      })
      let status = OrderIdempotencyKeyStatus.COMPLETED
      updateOrderIdempotencyKeyAfterSuccessPayment(db, orderId, status, nowAfterSuccess, idempotencyKey)
      await db.query('COMMIT')
    } catch (successDbErr) {
      await db.query('ROLLBACK')
      // If DB update fails after charge, we need reconciliation. Log and return error.
      //
      // TODO: send the required data to a DLQ to be processed
      const msg = 'Failed to finalize order after successful payment, schedule reconciliation'
      console.error(msg, successDbErr)
      return {
        data: {
          message: Trans.tr(ctx.acceptLanguage, 'orders.create.already_created'),
        },
      }
    }
  } catch (err) {
    console.error('orderCreate unexpected error', err)
    try {
      await db.query('ROLLBACK')
    } catch (rbErr) {
      console.error(rbErr) // ignore
    }
    return { error: ai(MSG_ID_ERR_INTERNAL, StatusCode.INTERNAL), err }
  }
}

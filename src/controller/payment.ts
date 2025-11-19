import { Stripe } from 'stripe'

import { Controller } from '.'

export async function chargePayment(
  ctr: Controller,
  amountCents: number,
  currency: string,
  paymentMethodToken: string,
  idempotencyKey: string
) {
  // Simplified: create PaymentIntent and confirm it
  const pi = await ctr.stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency,
      payment_method: paymentMethodToken,
      confirm: true,
      confirmation_method: 'automatic',
      expand: ['latest_charge', 'latest_charge.balance_transaction'],
    },
    { idempotencyKey }
  )
  return pi
}

export function getPaymentFees(pi: Stripe.PaymentIntent) {
  if (
    pi.latest_charge &&
    typeof pi.latest_charge === 'object' &&
    pi.latest_charge.balance_transaction &&
    typeof pi.latest_charge.balance_transaction === 'object'
  ) {
    const charge = pi.latest_charge
    const balanceTx = charge.balance_transaction
    if (balanceTx && typeof balanceTx === 'object') {
      return balanceTx.fee // Fee in cents
    }
  }
  return null
}

export function getPaymentTransactionID(stripeResult: Stripe.PaymentIntent) {
  let id: string
  if (typeof stripeResult.latest_charge === 'string') {
    id = stripeResult.latest_charge // Charge ID
  } else if (stripeResult.latest_charge?.id) {
    id = stripeResult.latest_charge.id // Charge object ID
  } else {
    id = stripeResult.id // PaymentIntent ID
  }
  return id
}

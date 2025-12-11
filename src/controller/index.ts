import Stripe from 'stripe'
import { PoolClient } from 'pg'
import * as grpc from '@grpc/grpc-js'
import type { sendUnaryData, ServerUnaryCall } from '@grpc/grpc-js'

import { Config } from '@megacommerce/proto/common/v1/config'
const Orders =
  require('@megacommerce/proto/orders/v1/orders') as typeof import('@megacommerce/proto/orders/v1/orders')

import { orderCreate } from './order_create'
import { Context } from '@/models'
import { middlewareContext } from '@/helpers'
import { ordersList } from './orders_list'
import { paymentAddMethod } from './payment_add_method'
import { paymentRemoveMethod } from './payment_remove_method'
import { paymentMakeDefault } from './payment_make_default'
import { paymentsList } from './payments_list'

export interface Controller {
  server: grpc.Server
  db: PoolClient
  stripe: Stripe
  config: Config
}

let _controller: Controller

export function controller() {
  if (!_controller) throw new Error('controller is not initialized')
  return _controller
}

function wrapUnaryHandler<Req, Res>(
  fn: (ctr: Controller, ctx: Context, req: ServerUnaryCall<Req, Res>) => Promise<any>,
  ctr: Controller
) {
  return async (call: ServerUnaryCall<Req, Res>, callback: sendUnaryData<Res>) => {
    const ctx = middlewareContext(call.metadata)

    try {
      const result = await fn(ctr, ctx, call)
      // no need to check result.data or result.error, just return them
      return callback(null, result)
    } catch (err: any) {
      console.error('handler threw error', err)
      const message = err?.message ?? 'handler returned unexpected result'
      return callback({ code: grpc.status.INTERNAL, message }, null)
    }
  }
}

export function initController({ db, config }: { db: PoolClient; config: Config }) {
  const server = new grpc.Server()

  const stripe = new Stripe(process.env['STRIPE_API_KEY'] as string)
  const ctr: Controller = { server, db, stripe, config }

  const handlers = {
    orderCreate: wrapUnaryHandler(orderCreate, ctr),
    ordersList: wrapUnaryHandler(ordersList, ctr),
    orderGet: notImplemented('OrderGet'),
    orderCancel: notImplemented('OrderCancel'),
    orderRefund: notImplemented('OrderRefund'),
    paymentAddMethod: wrapUnaryHandler(paymentAddMethod, ctr),
    paymentRemoveMethod: wrapUnaryHandler(paymentRemoveMethod, ctr),
    paymentMakeDefault: wrapUnaryHandler(paymentMakeDefault, ctr),
    paymentsList: wrapUnaryHandler(paymentsList, ctr),
  }

  server.addService(Orders.OrdersServiceService, handlers)

  _controller = ctr
  return ctr
}

export async function runController(ctr: Controller) {
  await new Promise<void>((_, rej) => {
    const endpoint = process.env['ORDERS_GRPC_ENDPOINT'] as string

    ctr.server.bindAsync(endpoint, grpc.ServerCredentials.createInsecure(), (err, _) => {
      if (err) return rej(err)
      ctr.server.start()
      console.log(`gRPC server started on ${endpoint}`)
    })
  })
}

const notImplemented = <T>(methodName: string) => {
  return (_: any, callback: sendUnaryData<T>) =>
    callback(
      {
        code: grpc.status.UNIMPLEMENTED,
        message: `${methodName} not implemented`,
      },
      null
    )
}

export function shutdownServer() {
  if (!_controller) return
  _controller.server.forceShutdown()
}

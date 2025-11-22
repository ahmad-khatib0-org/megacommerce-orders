import { credentials, InterceptingCall, InterceptorOptions, NextCall, RequesterBuilder } from '@grpc/grpc-js'

import { Struct } from '@megacommerce/proto/shared/v1/struct'
const Common = require('@megacommerce/proto/common/v1') as typeof import('@megacommerce/proto/common/v1')
const Products =
  require('@megacommerce/proto/products/v1') as typeof import('@megacommerce/proto/products/v1')
const Inventory =
  require('@megacommerce/proto/inventory/v1') as typeof import('@megacommerce/proto/inventory/v1')

import { Context, Header } from '@/models'

let cachedCommonClient: InstanceType<typeof Common.Common.CommonServiceClient> | null = null

export function commonClient() {
  if (cachedCommonClient) return cachedCommonClient

  const endpoint = process.env.COMMON_GRPC_ENDPOINT
  if (typeof endpoint !== 'string' || endpoint.trim() === '') {
    throw new Error(
      'COMMON_GRPC_ENDPOINT is not set. Set COMMON_GRPC_ENDPOINT=host:port (e.g. localhost:50051)'
    )
  }

  cachedCommonClient = new Common.Common.CommonServiceClient(endpoint, credentials.createInsecure())
  return cachedCommonClient
}

let cachedProductsClient: InstanceType<typeof Products.Products.ProductsServiceClient> | null = null

export function productsClient(ctx: Context) {
  if (cachedProductsClient) return cachedProductsClient

  const endpoint = process.env.PRODUCTS_GRPC_ENDPOINT
  if (typeof endpoint !== 'string' || endpoint.trim() === '') {
    throw new Error(
      'PRODUCTS_GRPC_ENDPOINT is not set. Set PRODUCTS_GRPC_ENDPOINT =host:port (e.g. localhost:50051)'
    )
  }

  cachedProductsClient = new Products.Products.ProductsServiceClient(endpoint, credentials.createInsecure(), {
    interceptors: [metadataClientInterceptor(ctx)],
  })
  return cachedProductsClient
}

let cachedInventoryClient: InstanceType<typeof Inventory.Inventory.InventoryServiceClient> | null = null

export function inventoryClient(ctx: Context) {
  if (cachedInventoryClient) return cachedInventoryClient

  const endpoint = process.env.INVENTORY_GRPC_ENDPOINT
  if (typeof endpoint !== 'string' || endpoint.trim() === '') {
    throw new Error(
      'INVENTORY_GRPC_ENDPOINT is not set. Set INVENTORY_GRPC_ENDPOINT=host:port (e.g. localhost:50051)'
    )
  }

  cachedInventoryClient = new Inventory.Inventory.InventoryServiceClient(
    endpoint,
    credentials.createInsecure(),
    { interceptors: [metadataClientInterceptor(ctx)] }
  )
  return cachedInventoryClient
}

function metadataClientInterceptor(
  ctx: Context
): (options: InterceptorOptions, nextCall: NextCall) => InterceptingCall {
  return (options, nextCall) => {
    const requester = new RequesterBuilder()
      .withStart((metadata, listener, next) => {
        metadata.set(Header.Authorization, ctx.session.token)
        metadata.set(Header.XRequestId, ctx.requestId)
        metadata.set(Header.XIpAddress, ctx.ipAddress)
        metadata.set(Header.XForwardedFor, ctx.xForwardedFor)
        metadata.set(Header.Path, ctx.path)
        metadata.set(Header.UserAgent, ctx.userAgent)
        metadata.set(Header.AcceptLanguage, ctx.acceptLanguage)
        metadata.set(Header.SessionId, ctx.session.id)
        metadata.set(Header.Token, ctx.session.token)
        metadata.set(Header.CreatedAt, ctx.session.createdAt.toString())
        metadata.set(Header.ExpiresAt, ctx.session.expiresAt.toString())
        metadata.set(Header.LastActivityAt, ctx.session.lastActivityAt.toString())
        metadata.set(Header.UserId, ctx.session.userId)
        metadata.set(Header.DeviceId, ctx.session.deviceId)
        metadata.set(Header.Roles, ctx.session.roles)
        metadata.set(Header.IsOauth, ctx.session.isOauth.toString())

        // Serialize props Map to string
        const propsArray: string[] = []
        ctx.session.props.forEach((value, key) => {
          propsArray.push(`${key}:${value}`)
        })
        metadata.set(Header.Props, propsArray.join(','))

        next(metadata, listener)
      })
      .build()

    return new InterceptingCall(nextCall(options), requester)
  }
}

export function objectToStruct(obj: { [key: string]: any }) {
  const fields: { [key: string]: any } = {}

  for (const [key, value] of Object.entries(obj)) {
    fields[key] = { stringValue: value }
  }

  return Struct.create({ fields })
}

export function jsonObjectToStruct(jsonString: string): Struct {
  if (!jsonString) return Struct.create({ fields: {} })

  const parsedFields = JSON.parse(jsonString)
  const fields: { [key: string]: any } = {}

  for (const [key, value] of Object.entries(parsedFields)) {
    fields[key] = value
  }

  return Struct.create({ fields })
}

export function jsonStringObjectToObject<T>(jsonString: string): { [key: string]: T } {
  if (!jsonString) return {}

  const parsedFields = JSON.parse(jsonString)
  const fields: { [key: string]: T } = {}

  for (const [key, value] of Object.entries(parsedFields)) {
    fields[key] = value as T
  }
  return fields
}

export function structToJsonObject(obj: Struct) {
  const fields: { [key: string]: any } = {}

  for (const [key, value] of Object.entries(obj.fields)) {
    fields[key] = { stringValue: value }
  }

  return JSON.stringify(fields)
}

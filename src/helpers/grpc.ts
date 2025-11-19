import { credentials } from '@grpc/grpc-js'
import { Struct } from '@megacommerce/proto/shared/v1/struct'

const Common = require('@megacommerce/proto/common/v1') as typeof import('@megacommerce/proto/common/v1')
const Products =
  require('@megacommerce/proto/products/v1') as typeof import('@megacommerce/proto/products/v1')

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

export function productsClient() {
  if (cachedProductsClient) return cachedProductsClient

  const endpoint = process.env.PRODUCTS_GRPC_ENDPOINT
  if (typeof endpoint !== 'string' || endpoint.trim() === '') {
    throw new Error(
      'PRODUCTS_GRPC_ENDPOINT is not set. Set PRODUCTS_GRPC_ENDPOINT =host:port (e.g. localhost:50051)'
    )
  }

  cachedProductsClient = new Products.Products.ProductsServiceClient(endpoint, credentials.createInsecure())
  return cachedProductsClient
}

export function objectToStruct(obj: { [key: string]: any }) {
  const fields: { [key: string]: any } = {}

  for (const [key, value] of Object.entries(obj)) {
    fields[key] = { stringValue: value }
  }

  return Struct.create({ fields })
}

export function structToJsonObject(obj: Struct) {
  const fields: { [key: string]: any } = {}

  for (const [key, value] of Object.entries(obj.fields)) {
    fields[key] = { stringValue: value }
  }

  return JSON.stringify(fields)
}

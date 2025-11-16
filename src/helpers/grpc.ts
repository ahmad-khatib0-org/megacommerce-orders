import { credentials } from '@grpc/grpc-js'
const Proto = require('@megacommerce/proto/common/v1') as typeof import('@megacommerce/proto/common/v1')

let cachedCommonClient: InstanceType<typeof Proto.Common.CommonServiceClient> | null = null

export function commonClient() {
  if (cachedCommonClient) return cachedCommonClient

  const endpoint = process.env.COMMON_GRPC_ENDPOINT
  if (typeof endpoint !== 'string' || endpoint.trim() === '') {
    throw new Error(
      'COMMON_GRPC_ENDPOINT is not set. Set COMMON_GRPC_ENDPOINT=host:port (e.g. localhost:50051)'
    )
  }

  cachedCommonClient = new Proto.Common.CommonServiceClient(endpoint, credentials.createInsecure())
  return cachedCommonClient
}

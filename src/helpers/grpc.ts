import { credentials } from '@grpc/grpc-js'
import { Common } from '@megacommerce/proto/common/v1'

export const commonClient = new Common.CommonServiceClient(
  process.env['COMMON_GRPC_ENDPOINT'] as string,
  credentials.createInsecure()
)

import dotenv from 'dotenv'

import { Common } from '@/common'

export async function run() {
  const path = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
  dotenv.config({ path })

  const common = new Common()
  await common.init()
}

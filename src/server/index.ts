import { PoolClient } from 'pg'
import dotenv from 'dotenv'
import { resolve } from 'path'

import { Config } from '@megacommerce/proto/common/v1/config'
import { Common } from '@/common'
import { initController, runController, shutdownServer } from '@/controller'
import { closeDb, initDb } from './database'
import { loadServiceConfig } from './config'

interface Server {
  db: PoolClient
  sharedConfig: Config
}

let _server: Server

export async function run() {
  const path = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
  dotenv.config({ path })

  // Load service config from YAML
  const env = process.env.ENV || 'local'
  const configFilePath = resolve(process.cwd(), `config.${env}.yaml`)
  const serviceConfig = await loadServiceConfig(configFilePath)

  const common = new Common()
  await common.init(serviceConfig.service.env)

  const db = await (await initDb(common.config)).connect()
  const controller = initController({ db, config: common.config })

  shutdown()
  await runController(controller)

  _server = { db, sharedConfig: common.config }
}

function shutdown() {
  const stop = async () => {
    console.log('Shutting down gracefully...')

    try {
      await closeDb()
      shutdownServer()
      console.log('Shutdown completed')
      process.exit(0)
    } catch (error) {
      console.error('Error during shutdown:', error)
      process.exit(1)
    }
  }

  // Register signal handlers
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)

  // Optional: Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    stop()
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    stop()
  })
}

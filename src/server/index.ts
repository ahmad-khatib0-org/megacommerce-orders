import dotenv from 'dotenv'

import { Common } from '@/common'
import { initController, runController } from '@/controller'
import { closeDb, initDb } from './database'

export async function run() {
  const path = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
  dotenv.config({ path })

  const common = new Common()
  await common.init()

  const db = await (await initDb(common.config)).connect()

  shutdown()
  const controller = initController({ db, config: common.config })
  await runController(controller)
}

function shutdown() {
  const stop = async () => {
    console.log('Shutting down gracefully...')

    try {
      // Add your server shutdown here when you have one
      // await server.tryShutdown()

      await closeDb()
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

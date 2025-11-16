import { Config } from '@megacommerce/proto/common/v1'
import { Pool, PoolClient } from 'pg'

let pool: Pool | null = null

export function getDb() {
  if (!pool) throw new Error('DB not initialized')
  return pool
}

export async function initDb(cfg: Config.Config) {
  pool = new Pool({
    connectionString: cfg.sql?.dataSource,
    connectionTimeoutMillis: 5000,
    application_name: 'orders-service',

    // Pool size settings
    max: cfg.sql?.maxOpenConns || 10,
    idleTimeoutMillis: cfg.sql?.connMaxIdleTimeMilliseconds || 120000,

    // Missing important settings:
    min: cfg.sql?.maxIdleConns || 2,
    maxUses: 7500, // Close connection after ~7500 queries to prevent memory leaks
    allowExitOnIdle: false, // Don't allow process exit while connections are active

    // SSL/TLS settings (important for production)
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
          rejectUnauthorized: false,
        }
        : false,

    // Connection validation
    keepAlive: true,
    // Query timeout (prevents hanging queries)
    query_timeout: cfg.sql?.queryTimeout || 30000,
    // Statement timeout
    statement_timeout: cfg.sql?.queryTimeout || 30000,
  })

  pool.on('error', (err: Error) => {
    console.error('Unexpected database pool error:', err)
    // Implement reconnection logic or alerting here
  })

  pool.on('connect', (client) => {
    // Set application-specific settings for each connection
    client.query('SET timezone = "UTC"')
    client.query('SET application_name = "orders-service"')
  })

  // Test connection with retry logic
  await testConnectionWithRetry(pool, 3)
  return pool
}

// Connection test with retry logic
async function testConnectionWithRetry(pool: Pool, maxRetries: number): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1')
      console.log('Database connection established successfully')
      return
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error)
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts`)
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
}

// Graceful shutdown
export async function closeDb(): Promise<void> {
  console.log('Closing database connections...')
  await pool?.end()
  console.log('Database connections closed')
}

export async function withTx<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getDb().connect()
  try {
    await client.query('BEGIN')
    const res = await fn(client)
    await client.query('COMMIT')
    return res
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

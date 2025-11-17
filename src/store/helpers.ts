import { PoolClient } from 'pg'

export async function withTx<T>(connection: PoolClient, fn: (client: PoolClient) => Promise<T>) {
  try {
    await connection.query('BEGIN')
    const res = await fn(connection)
    await connection.query('COMMIT')
    return res
  } catch (err) {
    await connection.query('ROLLBACK')
    throw err
  } finally {
    connection.release()
  }
}

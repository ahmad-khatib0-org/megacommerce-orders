import { PoolClient } from 'pg'
import { v4 as uuid } from 'uuid'
import { PaymentMethod } from '@megacommerce/proto/orders/v1/payment_method'

export async function addPaymentMethod(
  db: PoolClient,
  userId: string,
  {
    type,
    name,
    lastFour,
    expiryDate,
    token,
  }: {
    type: string
    name: string
    lastFour?: string
    expiryDate?: string
    token: string
  }
): Promise<PaymentMethod> {
  const id = uuid()
  const now = Math.floor(Date.now() / 1000)

  // Check if this is the first payment method - make it default
  const existingRes = await db.query(
    'SELECT COUNT(*) as count FROM payment_methods WHERE user_id = $1 AND deleted_at IS NULL',
    [userId]
  )
  const isDefault = existingRes.rows[0].count === 0

  const res = await db.query(
    `
    INSERT INTO payment_methods (id, user_id, type, name, last_four, expiry_date, token, is_default, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, user_id, type, name, last_four, expiry_date, is_default, created_at
    `,
    [id, userId, type, name, lastFour || null, expiryDate || null, token, isDefault, now]
  )

  const row = res.rows[0]
  return PaymentMethod.create({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    name: row.name,
    lastFour: row.last_four,
    expiryDate: row.expiry_date,
    isDefault: row.is_default,
    createdAt: row.created_at,
  })
}

export async function removePaymentMethod(
  db: PoolClient,
  userId: string,
  paymentMethodId: string
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000)

  // Soft delete
  const res = await db.query(
    `
    UPDATE payment_methods
    SET deleted_at = $1
    WHERE id = $2 AND user_id = $3
    RETURNING id
    `,
    [now, paymentMethodId, userId]
  )

  return res.rows.length > 0
}

export async function makePaymentMethodDefault(
  db: PoolClient,
  userId: string,
  paymentMethodId: string
): Promise<PaymentMethod | null> {
  const now = Math.floor(Date.now() / 1000)

  // Start transaction
  await db.query('BEGIN')

  try {
    // Remove default from all other methods
    await db.query(
      'UPDATE payment_methods SET is_default = false WHERE user_id = $1 AND deleted_at IS NULL',
      [userId]
    )

    // Set this method as default
    const res = await db.query(
      `
      UPDATE payment_methods
      SET is_default = true, updated_at = $1
      WHERE id = $2 AND user_id = $3
      RETURNING id, user_id, type, name, last_four, expiry_date, is_default, created_at
      `,
      [now, paymentMethodId, userId]
    )

    await db.query('COMMIT')

    if (res.rows.length === 0) return null

    const row = res.rows[0]
    return PaymentMethod.create({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      name: row.name,
      lastFour: row.last_four,
      expiryDate: row.expiry_date,
      isDefault: row.is_default,
      createdAt: row.created_at,
    })
  } catch (err) {
    await db.query('ROLLBACK')
    throw err
  }
}

export async function listPaymentMethods(db: PoolClient, userId: string): Promise<PaymentMethod[]> {
  const res = await db.query(
    `
    SELECT id, user_id, type, name, last_four, expiry_date, is_default, created_at
    FROM payment_methods
    WHERE user_id = $1 AND deleted_at IS NULL
    ORDER BY is_default DESC, created_at DESC
    `,
    [userId]
  )

  return res.rows.map((row) =>
    PaymentMethod.create({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      name: row.name,
      lastFour: row.last_four,
      expiryDate: row.expiry_date,
      isDefault: row.is_default,
      createdAt: row.created_at,
    })
  )
}

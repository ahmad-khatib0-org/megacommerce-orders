import { createHash } from 'crypto'

// Helper function to calculate content hash
export function calculateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

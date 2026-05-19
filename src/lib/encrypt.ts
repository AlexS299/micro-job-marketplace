import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_ENV = process.env.ENCRYPTION_KEY

function getKey(): Buffer {
  if (!KEY_ENV) {
    // Dev fallback — in production ENCRYPTION_KEY must be set
    return crypto.scryptSync('dev-fallback-key-change-in-prod', 'salt', 32)
  }
  const buf = Buffer.from(KEY_ENV, 'base64')
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64)')
  return buf
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivB64, tagB64, dataB64] = ciphertext.split('.')
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data) + decipher.final('utf8')
}

// Safe decrypt — returns null if token is legacy plaintext or fails
export function safeDecrypt(value: string): string {
  try {
    return decrypt(value)
  } catch {
    return value // legacy plaintext fallback
  }
}

// Generate a secure random key for initial setup
export function generateKey(): string {
  return crypto.randomBytes(32).toString('base64')
}

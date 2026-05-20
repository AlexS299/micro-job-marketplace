// Sliding-window in-memory rate limiter
// For production: swap Map for Redis/Upstash

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

// Clean old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, win] of store) {
      if (win.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  limit: number
  windowMs: number
}

export const LIMITS: Record<string, RateLimitConfig> = {
  login:    { limit: 5,   windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  api:      { limit: 120, windowMs: 60 * 1000 },        // 120 per min
  webhook:  { limit: 300, windowMs: 60 * 1000 },        // 300 per min
  checkout: { limit: 10,  windowMs: 60 * 1000 },        // 10 per min
}

export function rateLimit(key: string, config: RateLimitConfig): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.limit - 1, resetAt }
  }

  existing.count++
  const remaining = Math.max(0, config.limit - existing.count)
  return {
    allowed: existing.count <= config.limit,
    remaining,
    resetAt: existing.resetAt,
  }
}

export function getClientIP(req: Request): string {
  const headers = req instanceof Request ? req.headers : (req as { headers: Headers }).headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

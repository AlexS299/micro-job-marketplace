import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'
import { rateLimit, LIMITS, getClientIP } from '@/lib/rate-limit'

const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control':    'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options':           'SAMEORIGIN',
  'X-Content-Type-Options':    'nosniff',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection':          '1; mode=block',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://api.twilio.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
}

function applyHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v)
  return res
}

const WEBHOOK_PATHS = [
  '/api/whatsapp/webhook',
  '/api/billing/webhook',
  '/api/payments/cardcom/webhook',
  '/api/payments/tranzila/webhook',
  '/api/payments/payme/webhook',
]
const PUBLIC_PATHS  = ['/login', '/pricing', '/api/auth', '/pay/', '/quote/', '/api/quotes/respond/', '/invite/', '/portal/', '/api/portal/', '/onboarding']
const ADMIN_PATHS   = ['/admin', '/api/admin']

export default withAuth(
  function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const ip = getClientIP(req)

    // Rate limit config by endpoint type
    let limitConfig = LIMITS.api
    if (pathname === '/api/auth/callback/credentials')  limitConfig = LIMITS.login
    if (WEBHOOK_PATHS.some(p => pathname.startsWith(p))) limitConfig = LIMITS.webhook
    if (pathname.startsWith('/api/billing/checkout'))    limitConfig = LIMITS.checkout
    if (pathname.startsWith('/api/expenses/scan'))       limitConfig = { limit: 10, windowMs: 60_000 }
    if (pathname.startsWith('/api/tax/submit-vat'))      limitConfig = { limit: 10, windowMs: 3_600_000 }
    if (pathname.startsWith('/api/payroll/run'))         limitConfig = { limit: 20, windowMs: 60_000 }
    if (pathname.startsWith('/api/chat'))                limitConfig = { limit: 30, windowMs: 60_000 }

    const segment = pathname.split('/').slice(0, 4).join('/')
    const { allowed, remaining, resetAt } = rateLimit(`${ip}:${segment}`, limitConfig)

    if (!allowed) {
      return applyHeaders(NextResponse.json(
        { error: 'rate_limit_exceeded', message: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)), 'X-RateLimit-Remaining': '0' } }
      ))
    }

    const res = NextResponse.next()
    res.headers.set('X-RateLimit-Remaining', String(remaining))
    return applyHeaders(res)
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl
        if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return true
        if (WEBHOOK_PATHS.some(p => pathname.startsWith(p))) return true
        if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
          return (token as { role?: string })?.role === 'ADMIN'
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}

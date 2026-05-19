// Central auth helper — replaces getOrCreateBusiness() everywhere
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'
import db from '@/lib/db'

export type AuthBusiness = {
  id: string; name: string; taxType: string; vatReportPeriod: string
  whatsappPhone: string | null; stripeCustomerId: string | null
  vatNumber: string | null; email: string | null; phone: string | null
  paymentProvider: string | null
  cardcomTerminal: string | null; cardcomUsername: string | null
  tranzilaTerminal: string | null; tranzilaApiKey: string | null
  paymeApiKey: string | null
}

export type AuthResult =
  | { business: AuthBusiness; userId: string; role: string; error: null }
  | { business: null; userId: null; role: null; error: NextResponse }

export async function getAuthBusiness(): Promise<AuthResult> {
  const session = await getServerSession(authOptions)
  const u = session?.user as { id?: string; businessId?: string; role?: string } | undefined

  if (!u?.id) {
    return { business: null, userId: null, role: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Use businessId from JWT first (fast path — no extra DB query)
  const businessId = u.businessId
  if (!businessId) {
    // Fallback: re-fetch from DB (e.g. businessId assigned after login)
    const user = await db.user.findUnique({ where: { id: u.id }, select: { businessId: true, role: true } })
    if (!user?.businessId) {
      return { business: null, userId: null, role: null, error: NextResponse.json({ error: 'No business associated with this account' }, { status: 403 }) }
    }
    return fetchBusiness(user.businessId, u.id, user.role ?? 'USER')
  }

  return fetchBusiness(businessId, u.id, u.role ?? 'USER')
}

async function fetchBusiness(businessId: string, userId: string, role: string): Promise<AuthResult> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      id: true, name: true, taxType: true, vatReportPeriod: true,
      whatsappPhone: true, stripeCustomerId: true, vatNumber: true, email: true, phone: true,
      paymentProvider: true,
      cardcomTerminal: true, cardcomUsername: true,
      tranzilaTerminal: true, tranzilaApiKey: true,
      paymeApiKey: true,
    },
  })
  if (!business) {
    return { business: null, userId: null, role: null, error: NextResponse.json({ error: 'Business not found' }, { status: 404 }) }
  }
  return { business, userId, role, error: null }
}

export async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const session = await getServerSession(authOptions)
  const u = session?.user as { id?: string; role?: string } | undefined
  if (!u?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (u.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  return { userId: u.id }
}

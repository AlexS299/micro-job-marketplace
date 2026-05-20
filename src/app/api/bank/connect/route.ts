import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl, SUPPORTED_BANKS, type BankCode } from '@/lib/open-banking'
import { getAuthBusiness } from '@/lib/auth-context'

export async function POST(req: NextRequest) {
  const { bankCode } = await req.json() as { bankCode: string }
  if (!(bankCode in SUPPORTED_BANKS)) {
    return NextResponse.json({ error: 'בנק לא נתמך' }, { status: 400 })
  }

  const { business, error } = await getAuthBusiness()
  if (error) return error

  const state = Buffer.from(JSON.stringify({ businessId: business.id, bankCode, ts: Date.now() })).toString('base64url')
  const redirectUrl = getAuthorizationUrl(bankCode as BankCode, state)

  return NextResponse.json({ redirectUrl })
}

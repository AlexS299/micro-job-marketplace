import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl, SUPPORTED_BANKS, type BankCode } from '@/lib/open-banking'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  const { bankCode } = await req.json() as { bankCode: string }
  if (!(bankCode in SUPPORTED_BANKS)) {
    return NextResponse.json({ error: 'בנק לא נתמך' }, { status: 400 })
  }

  const business = await db.business.findFirst() ?? await db.business.create({ data: { name: 'העסק שלי' } })
  const state = Buffer.from(JSON.stringify({ businessId: business.id, bankCode, ts: Date.now() })).toString('base64url')
  const redirectUrl = getAuthorizationUrl(bankCode as BankCode, state)

  return NextResponse.json({ redirectUrl })
}

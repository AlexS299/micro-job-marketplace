import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { encrypt, safeDecrypt } from '@/lib/encrypt'
import { audit, auditMeta } from '@/lib/audit'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  // Return config with masked credentials (show only last 4 chars)
  const mask = (v: string | null | undefined) =>
    v ? `****${safeDecrypt(v).slice(-4)}` : null

  return NextResponse.json({
    paymentProvider:  business.paymentProvider,
    cardcomTerminal:  mask(business.cardcomTerminal),
    cardcomUsername:  mask(business.cardcomUsername),
    tranzilaTerminal: mask(business.tranzilaTerminal),
    tranzilaApiKey:   mask(business.tranzilaApiKey),
    paymeApiKey:      mask(business.paymeApiKey),
  })
}

export async function PUT(req: NextRequest) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const body = await req.json() as {
    paymentProvider?: string
    cardcomTerminal?: string
    cardcomUsername?: string
    tranzilaTerminal?: string
    tranzilaApiKey?: string
    paymeApiKey?: string
  }

  const allowed = ['CARDCOM', 'TRANZILA', 'PAYME', null, undefined, '']
  if (body.paymentProvider !== undefined && !allowed.includes(body.paymentProvider)) {
    return NextResponse.json({ error: 'ספק לא חוקי' }, { status: 400 })
  }

  const encryptIfPresent = (v: string | undefined, existing: string | null | undefined) => {
    if (v === undefined) return undefined
    if (v === '') return null
    // If the value looks like a masked field (starts with ****), keep existing
    if (v.startsWith('****')) return existing ?? undefined
    return encrypt(v)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (body.paymentProvider !== undefined) data.paymentProvider = body.paymentProvider || null
  if (body.cardcomTerminal  !== undefined) data.cardcomTerminal  = encryptIfPresent(body.cardcomTerminal,  business.cardcomTerminal)
  if (body.cardcomUsername  !== undefined) data.cardcomUsername  = encryptIfPresent(body.cardcomUsername,  business.cardcomUsername)
  if (body.tranzilaTerminal !== undefined) data.tranzilaTerminal = encryptIfPresent(body.tranzilaTerminal, business.tranzilaTerminal)
  if (body.tranzilaApiKey   !== undefined) data.tranzilaApiKey   = encryptIfPresent(body.tranzilaApiKey,   business.tranzilaApiKey)
  if (body.paymeApiKey      !== undefined) data.paymeApiKey      = encryptIfPresent(body.paymeApiKey,      business.paymeApiKey)

  const updated = await db.business.update({ where: { id: business.id }, data })

  await audit(business.id, userId, 'settings.update', {
    changes: { paymentProvider: body.paymentProvider },
    ...auditMeta(req),
  })

  return NextResponse.json({ ok: true, paymentProvider: updated.paymentProvider })
}

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { VAT_RATE } from '@/lib/vat'

function generateQuoteNumber(year: number, count: number) {
  return `Q${year}-${String(count).padStart(4, '0')}`
}

export async function GET(req: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { businessId: business.id }
  if (status) where.status = status
  if (clientId) where.clientId = clientId

  const quotes = await db.quote.findMany({
    where,
    include: { client: { select: { name: true } }, items: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(quotes)
}

export async function POST(req: NextRequest) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const body = await req.json()
  const { clientId, clientName, notes, terms, validDays = 30, items } = body

  if (!items?.length) return NextResponse.json({ error: 'נדרש לפחות פריט אחד' }, { status: 400 })

  let resolvedClientId = clientId
  if (!resolvedClientId && clientName) {
    const existing = await db.client.findFirst({
      where: { businessId: business.id, name: { contains: clientName } },
    })
    resolvedClientId = existing?.id ?? (await db.client.create({
      data: { businessId: business.id, name: clientName },
    })).id
  }

  let subtotal = 0
  const processedItems = items.map((item: { description: string; quantity: number; unitPrice: number; vatIncluded?: boolean }) => {
    const gross = item.unitPrice * item.quantity
    const net = item.vatIncluded ? gross / (1 + VAT_RATE) : gross
    subtotal += net
    return {
      description: item.description,
      quantity:    item.quantity,
      unitPrice:   item.vatIncluded ? net / item.quantity : item.unitPrice,
      total:       net,
      vatIncluded: item.vatIncluded ?? false,
    }
  })

  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
  const total = subtotal + vatAmount

  const count = await db.quote.count({ where: { businessId: business.id } })
  const quoteNumber = generateQuoteNumber(new Date().getFullYear(), count + 1)
  const token = crypto.randomBytes(24).toString('base64url')
  const validUntil = new Date(Date.now() + validDays * 86_400_000)

  const quote = await db.quote.create({
    data: {
      businessId: business.id,
      clientId: resolvedClientId ?? null,
      quoteNumber,
      token,
      validUntil,
      subtotal: Math.round(subtotal * 100) / 100,
      vatAmount,
      vatRate: VAT_RATE,
      total:   Math.round(total * 100) / 100,
      notes: notes ?? null,
      terms: terms ?? null,
      items: { create: processedItems },
    },
    include: { items: true, client: { select: { name: true } } },
  })

  await audit(business.id, userId, 'quote.create', {
    resourceId: quote.id, resourceType: 'quote',
    changes: { quoteNumber, total }, ...auditMeta(req),
  })

  return NextResponse.json(quote, { status: 201 })
}

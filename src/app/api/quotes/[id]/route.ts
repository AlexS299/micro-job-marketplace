import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { VAT_RATE } from '@/lib/vat'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const quote = await db.quote.findFirst({
    where: { id: params.id, businessId: business.id },
    include: { items: true, client: true },
  })
  if (!quote) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 })
  return NextResponse.json(quote)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.quote.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 })
  if (existing.status !== 'DRAFT') return NextResponse.json({ error: 'ניתן לערוך רק הצעות בטיוטה' }, { status: 400 })

  const body = await req.json()
  const { notes, terms, validDays, items, clientId } = body

  // Recalculate if items changed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {}
  if (notes !== undefined) data.notes = notes
  if (terms !== undefined) data.terms = terms
  if (clientId !== undefined) data.clientId = clientId
  if (validDays) data.validUntil = new Date(Date.now() + validDays * 86_400_000)

  if (items?.length) {
    let subtotal = 0
    const processedItems = items.map((item: { description: string; quantity: number; unitPrice: number; vatIncluded?: boolean }) => {
      const net = item.vatIncluded ? (item.unitPrice * item.quantity) / (1 + VAT_RATE) : item.unitPrice * item.quantity
      subtotal += net
      return { description: item.description, quantity: item.quantity, unitPrice: item.vatIncluded ? net / item.quantity : item.unitPrice, total: net, vatIncluded: item.vatIncluded ?? false }
    })
    data.subtotal = Math.round(subtotal * 100) / 100
    data.vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
    data.total = Math.round((subtotal + subtotal * VAT_RATE) * 100) / 100

    await db.quoteItem.deleteMany({ where: { quoteId: params.id } })
    await db.quoteItem.createMany({ data: processedItems.map((i: object) => ({ ...i, quoteId: params.id })) })
  }

  const quote = await db.quote.update({
    where: { id: params.id },
    data,
    include: { items: true, client: { select: { name: true } } },
  })

  await audit(business.id, userId, 'quote.update', {
    resourceId: params.id, resourceType: 'quote', ...auditMeta(req),
  })

  return NextResponse.json(quote)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.quote.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 })

  await db.quote.delete({ where: { id: params.id } })

  await audit(business.id, userId, 'quote.delete', {
    resourceId: params.id, resourceType: 'quote', ...auditMeta(req),
  })

  return NextResponse.json({ success: true })
}

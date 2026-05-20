import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { generateInvoiceNumber } from '@/lib/vat'
import { audit, auditMeta } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const quote = await db.quote.findFirst({
    where: { id: params.id, businessId: business.id },
    include: { items: true },
  })
  if (!quote) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 })
  if (quote.convertedToInvoiceId) {
    return NextResponse.json({ error: 'ההצעה כבר הומרה לחשבונית', invoiceId: quote.convertedToInvoiceId }, { status: 400 })
  }

  const count = await db.invoice.count({ where: { businessId: business.id } })
  const invoiceNumber = generateInvoiceNumber(new Date().getFullYear(), count + 1)

  const body = await req.json().catch(() => ({})) as { type?: string; dueDate?: string }

  const invoice = await db.invoice.create({
    data: {
      businessId:   business.id,
      clientId:     quote.clientId,
      invoiceNumber,
      type:         body.type ?? 'TAX_INVOICE',
      status:       'DRAFT',
      dueDate:      body.dueDate ? new Date(body.dueDate) : quote.validUntil,
      subtotal:     quote.subtotal,
      vatAmount:    quote.vatAmount,
      vatRate:      quote.vatRate,
      total:        quote.total,
      notes:        quote.notes ?? null,
      items: {
        create: quote.items.map(item => ({
          description: item.description,
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          total:       item.total,
          vatIncluded: item.vatIncluded,
        })),
      },
    },
    include: { items: true, client: { select: { name: true } } },
  })

  // Mark quote as converted
  await db.quote.update({
    where: { id: params.id },
    data: { convertedToInvoiceId: invoice.id, status: 'ACCEPTED' },
  })

  await audit(business.id, userId, 'quote.convert', {
    resourceId: params.id, resourceType: 'quote',
    changes: { invoiceId: invoice.id, invoiceNumber }, ...auditMeta(req),
  })
  await audit(business.id, userId, 'invoice.create', {
    resourceId: invoice.id, resourceType: 'invoice',
    changes: { invoiceNumber, total: invoice.total, fromQuote: quote.quoteNumber }, ...auditMeta(req),
  })

  return NextResponse.json({ invoice, quoteId: params.id })
}

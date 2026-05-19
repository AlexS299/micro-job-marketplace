import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { calculateVAT, VAT_RATE, generateInvoiceNumber } from '@/lib/vat'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { parseBody, InvoiceCreateSchema } from '@/lib/validate'
import { checkInvoiceLimit } from '@/lib/plan-gate'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    const { business, error } = await getAuthBusiness()
    if (error) return error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { businessId: business.id }
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    if (dateFrom || dateTo) {
      where.issueDate = {}
      if (dateFrom) where.issueDate.gte = new Date(dateFrom)
      if (dateTo) where.issueDate.lte = new Date(dateTo)
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: { client: true, items: true },
        orderBy: { issueDate: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.invoice.count({ where }),
    ])

    return NextResponse.json({ invoices, total, page, limit })
  } catch (error) {
    console.error('GET invoices error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת חשבוניות' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientId, clientName, type, dueDate, notes, items } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'נדרש לפחות פריט אחד' }, { status: 400 })
    }

    const { business, userId, error } = await getAuthBusiness()
    if (error) return error

    const limitError = await checkInvoiceLimit(business.id)
    if (limitError) return limitError

    // Resolve or create client
    let resolvedClientId = clientId
    if (!resolvedClientId && clientName) {
      const existing = await db.client.findFirst({
        where: { businessId: business.id, name: { contains: clientName } },
      })
      if (existing) {
        resolvedClientId = existing.id
      } else {
        const newClient = await db.client.create({
          data: { businessId: business.id, name: clientName },
        })
        resolvedClientId = newClient.id
      }
    }

    // Calculate totals
    let subtotal = 0
    const processedItems = items.map((item: {
      description: string
      quantity: number
      unitPrice: number
      vatIncluded?: boolean
    }) => {
      const { net } = calculateVAT(item.unitPrice * item.quantity, item.vatIncluded || false)
      subtotal += net
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.vatIncluded ? net / item.quantity : item.unitPrice,
        total: net,
        vatIncluded: item.vatIncluded || false,
      }
    })

    const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
    const total = subtotal + vatAmount

    // Generate invoice number
    const year = new Date().getFullYear()
    const count = await db.invoice.count({ where: { businessId: business.id } })
    const invoiceNumber = generateInvoiceNumber(year, count + 1)

    const invoice = await db.invoice.create({
      data: {
        businessId: business.id,
        clientId: resolvedClientId || null,
        invoiceNumber,
        type: type || 'TAX_INVOICE',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        subtotal,
        vatAmount,
        vatRate: VAT_RATE,
        total,
        items: { create: processedItems },
      },
      include: { items: true, client: true },
    })

    await audit(business.id, userId ?? 'unknown', 'invoice.create', {
      resourceId: invoice.id,
      resourceType: 'invoice',
      changes: { invoiceNumber, total },
      ...auditMeta(req),
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('POST invoice error:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת חשבונית' }, { status: 500 })
  }
}

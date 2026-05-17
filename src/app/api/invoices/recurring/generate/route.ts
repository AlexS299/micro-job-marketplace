import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { VAT_RATE, generateInvoiceNumber } from '@/lib/vat'

export async function POST() {
  const now = new Date()
  const due = await db.recurringInvoice.findMany({
    where: { isActive: true, nextRunDate: { lte: now } },
    include: { business: true, client: true },
  })

  const generated = []

  for (const recurring of due) {
    const items = JSON.parse(recurring.items) as Array<{
      description: string; quantity: number; unitPrice: number
    }>

    let subtotal = 0
    const processedItems = items.map(item => {
      const net = item.unitPrice * item.quantity
      subtotal += net
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: net,
        vatIncluded: false,
      }
    })
    const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
    const total = subtotal + vatAmount

    const count = await db.invoice.count({ where: { businessId: recurring.businessId } })
    const invoiceNumber = generateInvoiceNumber(now.getFullYear(), count + 1)

    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + 30)

    const invoice = await db.invoice.create({
      data: {
        businessId: recurring.businessId,
        clientId: recurring.clientId,
        invoiceNumber,
        type: 'TAX_INVOICE',
        status: 'DRAFT',
        dueDate,
        subtotal,
        vatAmount,
        vatRate: VAT_RATE,
        total,
        notes: `חשבונית חוזרת: ${recurring.description}`,
        items: { create: processedItems },
      },
    })

    // Advance next run date
    const next = new Date(recurring.nextRunDate)
    if (recurring.frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1)
    else if (recurring.frequency === 'QUARTERLY') next.setMonth(next.getMonth() + 3)
    else next.setFullYear(next.getFullYear() + 1)

    await db.recurringInvoice.update({
      where: { id: recurring.id },
      data: { nextRunDate: next, lastRunAt: now },
    })

    generated.push({
      invoiceId: invoice.id,
      invoiceNumber,
      clientName: recurring.client?.name,
      total,
    })
  }

  return NextResponse.json({ generated: generated.length, invoices: generated })
}

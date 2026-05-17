import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { sendReminderEmail } from '@/lib/email'

export async function POST() {
  const now = new Date()
  const overdue = await db.invoice.findMany({
    where: {
      status: 'SENT',
      dueDate: { lt: now },
    },
    include: { client: true, business: true, items: true },
  })

  // Update overdue status
  await db.invoice.updateMany({
    where: { status: 'SENT', dueDate: { lt: now } },
    data: { status: 'OVERDUE' },
  })

  const sent: string[] = []
  for (const invoice of overdue) {
    if (invoice.client?.email) {
      try {
        await sendReminderEmail(invoice, invoice.business, invoice.client)
        sent.push(invoice.invoiceNumber)
      } catch (e) {
        console.error('Reminder email failed:', invoice.invoiceNumber, e)
      }
    }
  }

  return NextResponse.json({ updated: overdue.length, emailsSent: sent.length, invoices: sent })
}

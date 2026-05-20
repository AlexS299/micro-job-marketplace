import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sendReminderEmail } from '@/lib/email'

// Internal cron endpoint — must supply CRON_SECRET in Authorization header
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const overdue = await db.invoice.findMany({
    where: {
      status: 'SENT',
      dueDate: { lt: now },
    },
    include: { client: true, business: true, items: true },
  })

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

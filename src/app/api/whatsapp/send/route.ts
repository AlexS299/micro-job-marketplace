import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sendWhatsAppMessage, ils } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    businessId: string
    type: string
    payload: Record<string, string>
  }
  const { businessId, type, payload } = body

  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const business = await db.business.findUnique({ where: { id: businessId } })
  if (!business?.whatsappPhone) {
    return NextResponse.json({ error: 'No WhatsApp phone registered' }, { status: 400 })
  }

  switch (type) {
    case 'invoice': {
      const invoice = await db.invoice.findFirst({
        where: { businessId, id: payload.invoiceId },
        include: { client: { select: { name: true } } },
      })
      if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

      const msg = `📄 *חשבונית ${invoice.invoiceNumber}*\nלקוח: ${invoice.client?.name || '—'}\nסכום: *${ils(invoice.total)}*\nתאריך: ${new Date(invoice.issueDate).toLocaleDateString('he-IL')}\nסטטוס: ${statusHe(invoice.status)}`
      await sendWhatsAppMessage(business.whatsappPhone, msg)
      return NextResponse.json({ ok: true })
    }

    case 'alert': {
      const msg = `⚠️ *התראה חדשה*\n${payload.title}\n${payload.message || ''}`
      await sendWhatsAppMessage(business.whatsappPhone, msg)
      return NextResponse.json({ ok: true })
    }

    case 'custom': {
      await sendWhatsAppMessage(business.whatsappPhone, payload.message)
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }
}

function statusHe(s: string): string {
  const m: Record<string, string> = { DRAFT: 'טיוטה', SENT: 'נשלחה', PAID: 'שולמה', CANCELLED: 'בוטלה' }
  return m[s] || s
}

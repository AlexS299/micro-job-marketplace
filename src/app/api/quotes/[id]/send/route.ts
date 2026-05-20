import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { sendInvoiceEmail } from '@/lib/email'
import { audit, auditMeta } from '@/lib/audit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const quote = await db.quote.findFirst({
    where: { id: params.id, businessId: business.id },
    include: { client: true, items: true },
  })
  if (!quote) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { email?: string }
  const email = body.email ?? quote.client?.email
  if (!email) return NextResponse.json({ error: 'כתובת אימייל נדרשת' }, { status: 400 })

  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get('host')}`
  const quoteUrl = `${baseUrl}/quote/${quote.token}`

  // Reuse sendInvoiceEmail with custom message
  await sendInvoiceEmail(
    {
      invoiceNumber: quote.quoteNumber,
      total: quote.total,
      subtotal: quote.subtotal,
      vatAmount: quote.vatAmount,
      issueDate: quote.issueDate,
      dueDate: quote.validUntil,
      notes: `הצעת מחיר זו תקפה עד ${quote.validUntil.toLocaleDateString('he-IL')}.\nלצפייה ואישור: ${quoteUrl}`,
    },
    { name: business.name, email: business.email, phone: business.phone, address: null },
    { name: quote.client?.name ?? email, email },
    undefined
  )

  await db.quote.update({
    where: { id: params.id },
    data: { status: quote.status === 'DRAFT' ? 'SENT' : quote.status, sentAt: new Date() },
  })

  await audit(business.id, userId, 'quote.send', {
    resourceId: params.id, resourceType: 'quote',
    changes: { sentTo: email, quoteUrl }, ...auditMeta(req),
  })

  return NextResponse.json({ success: true, sentTo: email, quoteUrl })
}

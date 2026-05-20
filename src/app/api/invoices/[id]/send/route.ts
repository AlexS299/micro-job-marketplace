import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
import { sendInvoiceEmail } from '@/lib/email'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import type { Invoice, Business, Client, InvoiceItem } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  try {
    const body = await req.json().catch(() => ({}))

    const invoice = await db.invoice.findFirst({
      where: { id: params.id, businessId: business.id },
      include: { client: true, items: true, business: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'חשבונית לא נמצאה' }, { status: 404 })
    }

    const email = body.email || invoice.client?.email
    if (!email) {
      return NextResponse.json({ error: 'כתובת אימייל נדרשת' }, { status: 400 })
    }

    const pdfBuffer = await generateInvoicePDF(
      invoice as unknown as Invoice & { items: InvoiceItem[] },
      invoice.business as unknown as Business,
      invoice.client as unknown as Client | null
    )

    await sendInvoiceEmail(
      {
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        subtotal: invoice.subtotal,
        vatAmount: invoice.vatAmount,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
      },
      {
        name: invoice.business.name,
        email: invoice.business.email,
        phone: invoice.business.phone,
        address: invoice.business.address,
      },
      {
        name: invoice.client?.name || email,
        email,
      },
      pdfBuffer
    )

    const updatedInvoice = await db.invoice.update({
      where: { id: params.id },
      data: {
        status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
        emailSentAt: new Date(),
      },
    })

    await audit(business.id, userId, 'invoice.send', {
      resourceId: params.id, resourceType: 'invoice',
      changes: { sentTo: email }, ...auditMeta(req),
    })

    return NextResponse.json({ success: true, sentTo: email, invoice: updatedInvoice })
  } catch (err) {
    console.error('Send invoice error:', err)
    return NextResponse.json({ error: 'שגיאה בשליחת החשבונית' }, { status: 500 })
  }
}

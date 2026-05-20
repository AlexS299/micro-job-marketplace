import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
import { sendInvoiceEmail } from '@/lib/email'
import type { Invoice, Business, Client, InvoiceItem } from '@/types'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, businessId: business.id },
    include: { client: true, items: true, business: true },
  })
  if (!invoice) return NextResponse.json({ error: 'חשבונית לא נמצאה' }, { status: 404 })
  return NextResponse.json(invoice)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const invoice = await db.invoice.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!invoice) return NextResponse.json({ error: 'חשבונית לא נמצאה' }, { status: 404 })

  const body = await req.json() as Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {}
  if (body.status !== undefined) {
    updateData.status = body.status
    if (body.status === 'PAID') updateData.paidAt = new Date()
  }
  if (body.notes !== undefined) updateData.notes = body.notes
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate as string) : null

  const updated = await db.invoice.update({
    where: { id: params.id },
    data: updateData,
    include: { client: true, items: true },
  })

  await audit(business.id, userId, 'invoice.update', {
    resourceId: params.id, resourceType: 'invoice',
    changes: updateData, ...auditMeta(req),
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const invoice = await db.invoice.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!invoice) return NextResponse.json({ error: 'חשבונית לא נמצאה' }, { status: 404 })

  await db.invoice.update({ where: { id: params.id }, data: { status: 'CANCELLED' } })

  await audit(business.id, userId, 'invoice.delete', {
    resourceId: params.id, resourceType: 'invoice',
    changes: { invoiceNumber: invoice.invoiceNumber }, ...auditMeta(req),
  })

  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, businessId: business.id },
    include: { client: true, items: true, business: true },
  })
  if (!invoice) return NextResponse.json({ error: 'חשבונית לא נמצאה' }, { status: 404 })

  const url = new URL(req.url)
  const lastPart = url.pathname.split('/').pop()

  if (lastPart === 'send') {
    const body = await req.json().catch(() => ({})) as { email?: string }
    const email = body.email || invoice.client?.email
    if (!email) return NextResponse.json({ error: 'כתובת אימייל נדרשת' }, { status: 400 })

    try {
      const pdfBuffer = await generateInvoicePDF(
        invoice as unknown as Invoice & { items: InvoiceItem[] },
        invoice.business as unknown as Business,
        invoice.client as unknown as Client | null
      )
      await sendInvoiceEmail(
        { invoiceNumber: invoice.invoiceNumber, total: invoice.total, subtotal: invoice.subtotal, vatAmount: invoice.vatAmount, issueDate: invoice.issueDate, dueDate: invoice.dueDate, notes: invoice.notes },
        { name: invoice.business.name, email: invoice.business.email, phone: invoice.business.phone, address: invoice.business.address },
        { name: invoice.client?.name || email, email },
        pdfBuffer
      )
    } catch (emailErr) {
      console.error('[invoice/send] email failed:', emailErr)
      return NextResponse.json({ error: 'שליחת המייל נכשלה. בדוק הגדרות מייל.' }, { status: 500 })
    }

    await db.invoice.update({
      where: { id: params.id },
      data: { status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status, emailSentAt: new Date() },
    })
    await audit(business.id, userId, 'invoice.send', { resourceId: params.id, resourceType: 'invoice', changes: { sentTo: email }, ...auditMeta(req) })
    return NextResponse.json({ success: true, sentTo: email })
  }

  // Generate PDF
  const pdfBuffer = await generateInvoicePDF(
    invoice as unknown as Invoice & { items: InvoiceItem[] },
    invoice.business as unknown as Business,
    invoice.client as unknown as Client | null
  )
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"` },
  })
}

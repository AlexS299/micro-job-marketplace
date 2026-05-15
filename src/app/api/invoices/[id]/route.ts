import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
import { sendInvoiceEmail } from '@/lib/email'
import type { Invoice, Business, Client, InvoiceItem } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: params.id },
      include: { client: true, items: true, business: true },
    })
    if (!invoice) {
      return NextResponse.json({ error: 'חשבונית לא נמצאה' }, { status: 404 })
    }
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('GET invoice error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת חשבונית' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { status, notes, dueDate } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    if (status !== undefined) {
      updateData.status = status
      if (status === 'PAID') updateData.paidAt = new Date()
    }
    if (notes !== undefined) updateData.notes = notes
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

    const invoice = await db.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: { client: true, items: true },
    })
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('PUT invoice error:', error)
    return NextResponse.json({ error: 'שגיאה בעדכון חשבונית' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete - mark as cancelled
    const invoice = await db.invoice.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    })
    return NextResponse.json({ success: true, invoice })
  } catch (error) {
    console.error('DELETE invoice error:', error)
    return NextResponse.json({ error: 'שגיאה בביטול חשבונית' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    const invoice = await db.invoice.findUnique({
      where: { id: params.id },
      include: { client: true, items: true, business: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'חשבונית לא נמצאה' }, { status: 404 })
    }

    if (action === 'pdf' || params.id) {
      // Check if this is a PDF or send request from the URL path
      const pathParts = url.pathname.split('/')
      const lastPart = pathParts[pathParts.length - 1]

      if (lastPart === 'send') {
        // Send invoice by email
        const body = await req.json().catch(() => ({}))
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

        await db.invoice.update({
          where: { id: params.id },
          data: {
            status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
            emailSentAt: new Date(),
          },
        })

        return NextResponse.json({ success: true, sentTo: email })
      }

      // Default: generate PDF
      const pdfBuffer = await generateInvoicePDF(
        invoice as unknown as Invoice & { items: InvoiceItem[] },
        invoice.business as unknown as Business,
        invoice.client as unknown as Client | null
      )

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 })
  } catch (error) {
    console.error('POST invoice action error:', error)
    return NextResponse.json({ error: 'שגיאה בביצוע הפעולה' }, { status: 500 })
  }
}

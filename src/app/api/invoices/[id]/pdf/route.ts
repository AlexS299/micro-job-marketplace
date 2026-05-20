import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
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
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת PDF' }, { status: 500 })
  }
}

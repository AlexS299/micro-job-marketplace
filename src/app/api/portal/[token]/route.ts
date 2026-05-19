import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const client = await db.client.findUnique({
    where: { portalToken: params.token },
    include: {
      business: { select: { name: true, email: true, phone: true, vatNumber: true } },
      invoices: {
        where: { status: { not: 'DRAFT' } },
        orderBy: { issueDate: 'desc' },
        select: {
          id: true, invoiceNumber: true, type: true, status: true,
          issueDate: true, dueDate: true, total: true, currency: true, pdfUrl: true,
          paymentLinks: {
            where: { status: 'PENDING' },
            select: { id: true, providerUrl: true, amount: true, status: true },
          },
        },
      },
      quotes: {
        where: { status: { not: 'DRAFT' } },
        orderBy: { issueDate: 'desc' },
        select: {
          id: true, quoteNumber: true, status: true, issueDate: true,
          validUntil: true, total: true, currency: true, token: true,
        },
      },
    },
  })

  if (!client) return NextResponse.json({ error: 'פורטל לא נמצא' }, { status: 404 })

  return NextResponse.json({
    client: { name: client.name, email: client.email, phone: client.phone, city: client.city },
    business: client.business,
    invoices: client.invoices,
    quotes: client.quotes,
  })
}

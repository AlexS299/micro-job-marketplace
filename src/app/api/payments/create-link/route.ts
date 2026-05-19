import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { createPaymentLink } from '@/lib/payment-providers'

export async function POST(req: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const body = await req.json() as { invoiceId: string; expiresInDays?: number }
  const { invoiceId, expiresInDays = 7 } = body

  if (!invoiceId) return NextResponse.json({ error: 'invoiceId נדרש' }, { status: 400 })

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, businessId: business.id },
    include: { client: true },
  })
  if (!invoice) return NextResponse.json({ error: 'חשבונית לא נמצאה' }, { status: 404 })

  if (!business.paymentProvider) {
    return NextResponse.json({ error: 'לא הוגדר ספק סליקה. עבור להגדרות → תשלומים.' }, { status: 400 })
  }

  const token = crypto.randomBytes(32).toString('base64url')
  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get('host')}`
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000)

  const params = {
    amount:        invoice.total,
    currency:      invoice.currency,
    invoiceNumber: invoice.invoiceNumber,
    description:   `חשבונית ${invoice.invoiceNumber} — ${business.name}`,
    customerName:  invoice.client?.name ?? 'לקוח',
    customerEmail: invoice.client?.email ?? business.email ?? '',
    successUrl:    `${baseUrl}/pay/${token}/success`,
    errorUrl:      `${baseUrl}/pay/${token}/error`,
    notifyUrl:     `${baseUrl}/api/payments/${business.paymentProvider.toLowerCase()}/webhook`,
    reference:     token,
  }

  const config = {
    cardcomTerminal:  business.cardcomTerminal  ?? undefined,
    cardcomUsername:  business.cardcomUsername  ?? undefined,
    tranzilaTerminal: business.tranzilaTerminal ?? undefined,
    tranzilaApiKey:   business.tranzilaApiKey   ?? undefined,
    paymeApiKey:      business.paymeApiKey      ?? undefined,
  }

  try {
    const { providerUrl, providerReference } = await createPaymentLink(
      business.paymentProvider, params, config
    )

    const link = await db.paymentLink.create({
      data: {
        token,
        invoiceId,
        businessId: business.id,
        provider:   business.paymentProvider,
        providerUrl,
        amount:     invoice.total,
        currency:   invoice.currency,
        status:     'PENDING',
        expiresAt,
        ...(providerReference ? { transactionId: providerReference } : {}),
      },
    })

    return NextResponse.json({ token, paymentUrl: `${baseUrl}/pay/${token}`, link })
  } catch (err) {
    return NextResponse.json(
      { error: 'שגיאה ביצירת לינק תשלום', details: String(err) },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const invoiceId = searchParams.get('invoiceId')

  const where = invoiceId
    ? { businessId: business.id, invoiceId }
    : { businessId: business.id }

  const links = await db.paymentLink.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(links)
}

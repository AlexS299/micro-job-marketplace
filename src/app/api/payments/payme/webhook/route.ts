import { NextRequest, NextResponse } from 'next/server'
import { handlePaymentWebhook } from '@/lib/payment-providers/handle-webhook'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    const text = await req.text()
    body = Object.fromEntries(new URLSearchParams(text)) as Record<string, unknown>
  }
  const result = await handlePaymentWebhook('PAYME', body)
  return NextResponse.json(result, { status: 200 })
}

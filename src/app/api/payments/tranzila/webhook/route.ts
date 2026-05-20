import { NextRequest, NextResponse } from 'next/server'
import { handlePaymentWebhook } from '@/lib/payment-providers/handle-webhook'

export async function POST(req: NextRequest) {
  const text = await req.text()
  const params = Object.fromEntries(new URLSearchParams(text))
  const result = await handlePaymentWebhook('TRANZILA', params)
  return NextResponse.json(result, { status: 200 })
}

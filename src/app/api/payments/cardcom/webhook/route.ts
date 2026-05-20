import { NextRequest, NextResponse } from 'next/server'
import { handlePaymentWebhook } from '@/lib/payment-providers/handle-webhook'

export async function POST(req: NextRequest) {
  const text = await req.text()
  const params = Object.fromEntries(new URLSearchParams(text))
  const result = await handlePaymentWebhook('CARDCOM', params)
  // Cardcom expects HTTP 200 to stop retries
  return NextResponse.json(result, { status: 200 })
}

// Cardcom can also GET on some flows
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = Object.fromEntries(searchParams)
  const result = await handlePaymentWebhook('CARDCOM', params)
  return NextResponse.json(result, { status: 200 })
}

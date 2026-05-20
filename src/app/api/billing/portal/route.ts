import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getAuthBusiness } from '@/lib/auth-context'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return NextResponse.json({ url: '/dashboard/billing' })
  }

  const { business, error } = await getAuthBusiness()
  if (error) return error

  if (!business.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
  }

  const origin = req.headers.get('origin') || 'http://localhost:3000'
  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripeCustomerId,
    return_url: `${origin}/dashboard/billing`,
  })

  return NextResponse.json({ url: session.url })
}

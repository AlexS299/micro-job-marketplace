import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { PLANS, type PlanId } from '@/lib/plans'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

export async function POST(req: NextRequest) {
  const { planId, billing = 'monthly' } = await req.json() as { planId: PlanId; billing?: 'monthly' | 'yearly' }

  const plan = PLANS[planId]
  if (!plan || planId === 'FREE') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Stripe not configured — return mock
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return NextResponse.json({ url: `/dashboard/billing?success=1&plan=${planId}` })
  }

  const { business, error } = await getAuthBusiness()
  if (error) return error

  // Get or create Stripe customer
  let customerId = business.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: business.name,
      email: business.email ?? undefined,
      metadata: { businessId: business.id },
    })
    customerId = customer.id
    await db.business.update({ where: { id: business.id }, data: { stripeCustomerId: customerId } })
  }

  const priceId = billing === 'yearly'
    ? plan.stripePriceIdYearly
    : plan.stripePriceIdMonthly

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 400 })
  }

  const origin = req.headers.get('origin') || 'http://localhost:3000'
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/billing?success=1&plan=${planId}`,
    cancel_url: `${origin}/dashboard/billing?cancelled=1`,
    subscription_data: {
      metadata: { businessId: business.id, plan: planId },
      trial_period_days: 14,
    },
    currency: 'ils',
  })

  return NextResponse.json({ url: session.url })
}

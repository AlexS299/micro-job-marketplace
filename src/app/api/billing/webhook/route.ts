import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import db from '@/lib/db'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break
      const businessId = session.metadata?.businessId
      const plan = (session.metadata?.plan ?? 'PRO') as string
      if (!businessId) break

      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      await upsertSubscription(businessId, plan, sub)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const businessId = sub.metadata?.businessId
      if (!businessId) break
      const plan = (sub.metadata?.plan ?? 'PRO') as string
      await upsertSubscription(businessId, plan, sub)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const businessId = sub.metadata?.businessId
      if (!businessId) break
      await db.subscription.upsert({
        where: { businessId },
        update: { plan: 'FREE', status: 'cancelled', stripeSubscriptionId: null },
        create: { businessId, plan: 'FREE', status: 'cancelled' },
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      const business = await db.business.findFirst({ where: { stripeCustomerId: customerId } })
      if (business) {
        await db.subscription.updateMany({
          where: { businessId: business.id },
          data: { status: 'past_due' },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

async function upsertSubscription(
  businessId: string,
  plan: string,
  sub: Stripe.Subscription
) {
  await db.subscription.upsert({
    where: { businessId },
    update: {
      plan,
      status: sub.status,
      stripeSubscriptionId: sub.id,
      stripePriceId: sub.items.data[0]?.price.id,
      currentPeriodStart: new Date(((sub as unknown as { current_period_start: number }).current_period_start) * 1000),
      currentPeriodEnd: new Date(((sub as unknown as { current_period_end: number }).current_period_end) * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    create: {
      businessId,
      plan,
      status: sub.status,
      stripeSubscriptionId: sub.id,
      stripePriceId: sub.items.data[0]?.price.id,
      currentPeriodStart: new Date(((sub as unknown as { current_period_start: number }).current_period_start) * 1000),
      currentPeriodEnd: new Date(((sub as unknown as { current_period_end: number }).current_period_end) * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  })
}

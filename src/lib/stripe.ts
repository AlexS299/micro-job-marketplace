import Stripe from 'stripe'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
}) as Stripe

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

import { NextResponse } from 'next/server'
import { PLANS } from '@/lib/plans'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const subscription = await db.subscription.findUnique({
    where: { businessId: business.id },
  })
  const currentPlan = subscription?.plan ?? 'FREE'

  return NextResponse.json({
    plans: Object.values(PLANS),
    currentPlan,
    subscription: subscription ?? null,
  })
}

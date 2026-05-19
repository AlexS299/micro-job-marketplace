import { NextResponse } from 'next/server'
import { PLANS } from '@/lib/plans'
import db from '@/lib/db'

export async function GET() {
  const business = await db.business.findFirst({
    include: { subscription: true },
  })
  const currentPlan = business?.subscription?.plan ?? 'FREE'

  return NextResponse.json({
    plans: Object.values(PLANS),
    currentPlan,
    subscription: business?.subscription ?? null,
  })
}

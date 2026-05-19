import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getPlan } from '@/lib/plans'

export async function GET() {
  const business = await db.business.findFirst({
    include: {
      subscription: true,
      _count: { select: { invoices: true, employees: true } },
    },
  })

  if (!business) return NextResponse.json({ plan: 'FREE', subscription: null, usage: null })

  const sub = business.subscription
  const plan = getPlan(sub?.plan ?? 'FREE')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const invoicesThisMonth = await db.invoice.count({
    where: { businessId: business.id, createdAt: { gte: monthStart } },
  })

  return NextResponse.json({
    plan: plan.id,
    subscription: sub,
    planDetails: plan,
    usage: {
      invoicesThisMonth,
      invoicesLimit: plan.features.invoicesPerMonth,
      totalInvoices: business._count.invoices,
      totalEmployees: business._count.employees,
      employeesLimit: plan.features.employees,
    },
  })
}

// Downgrade to free (cancel)
export async function DELETE() {
  const business = await db.business.findFirst({ include: { subscription: true } })
  if (!business?.subscription) return NextResponse.json({ ok: true })

  await db.subscription.update({
    where: { businessId: business.id },
    data: { plan: 'FREE', status: 'cancelled', cancelAtPeriodEnd: true },
  })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getPlan } from '@/lib/plans'
import { requireAdmin } from '@/lib/auth-context'
import { audit } from '@/lib/audit'

export async function GET() {
  const adminCheck = await requireAdmin()
  if (adminCheck instanceof NextResponse) return adminCheck
  await audit('system', adminCheck.userId, 'admin.view')

  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [businesses, users, invoicesThisMonth, invoicesLastMonth] = await Promise.all([
    db.business.findMany({
      include: {
        subscription: true,
        _count: { select: { invoices: true, employees: true, clients: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.user.count(),
    db.invoice.count({ where: { createdAt: { gte: thisMonth } } }),
    db.invoice.count({ where: { createdAt: { gte: lastMonth, lte: lastMonthEnd } } }),
  ])

  // MRR calculation
  let mrr = 0
  const planDistribution: Record<string, number> = { FREE: 0, PRO: 0, BUSINESS: 0 }

  for (const b of businesses) {
    const planId = b.subscription?.plan ?? 'FREE'
    planDistribution[planId] = (planDistribution[planId] ?? 0) + 1
    const plan = getPlan(planId)
    if (b.subscription?.status === 'active' || b.subscription?.status === 'trialing') {
      mrr += plan.price
    }
  }

  const activeSubscriptions = businesses.filter(b =>
    b.subscription?.status === 'active' || b.subscription?.status === 'trialing'
  ).length

  const churnedThisMonth = businesses.filter(b =>
    b.subscription?.status === 'cancelled' &&
    b.subscription.updatedAt >= thisMonth
  ).length

  return NextResponse.json({
    summary: {
      totalBusinesses: businesses.length,
      totalUsers: users,
      mrr,
      arr: mrr * 12,
      activeSubscriptions,
      churnedThisMonth,
      invoicesThisMonth,
      invoicesLastMonth,
      planDistribution,
    },
    businesses: businesses.map(b => ({
      id: b.id,
      name: b.name,
      email: b.email,
      plan: b.subscription?.plan ?? 'FREE',
      status: b.subscription?.status ?? 'free',
      invoices: b._count.invoices,
      employees: b._count.employees,
      clients: b._count.clients,
      createdAt: b.createdAt,
      currentPeriodEnd: b.subscription?.currentPeriodEnd,
    })),
  })
}

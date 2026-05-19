import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getPlan } from '@/lib/plans'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const [businessWithCounts, sub] = await Promise.all([
    db.business.findUnique({
      where: { id: business.id },
      include: { _count: { select: { invoices: true, employees: true } } },
    }),
    db.subscription.findUnique({ where: { businessId: business.id } }),
  ])

  if (!businessWithCounts) return NextResponse.json({ plan: 'FREE', subscription: null, usage: null })

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
      totalInvoices: businessWithCounts._count.invoices,
      totalEmployees: businessWithCounts._count.employees,
      employeesLimit: plan.features.employees,
    },
  })
}

// Downgrade to free (cancel)
export async function DELETE() {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const sub = await db.subscription.findUnique({ where: { businessId: business.id } })
  if (!sub) return NextResponse.json({ ok: true })

  await db.subscription.update({
    where: { businessId: business.id },
    data: { plan: 'FREE', status: 'cancelled', cancelAtPeriodEnd: true },
  })
  return NextResponse.json({ ok: true })
}

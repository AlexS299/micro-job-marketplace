// Plan enforcement helpers — use in API routes to gate features
import db from '@/lib/db'
import { getPlan, isWithinLimit, canUseFeature, type PlanFeatures } from '@/lib/plans'
import { NextResponse } from 'next/server'

export async function getBusinessPlan() {
  const business = await db.business.findFirst({
    include: { subscription: true },
  })
  if (!business) return null
  const plan = getPlan(business.subscription?.plan ?? 'FREE')
  return { business, plan }
}

export async function requireFeature(feature: keyof PlanFeatures) {
  const result = await getBusinessPlan()
  if (!result) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  if (!canUseFeature(result.plan, feature)) {
    return NextResponse.json({
      error: 'feature_not_available',
      message: `תכונה זו אינה זמינה במסלול ${result.plan.name}. שדרג כדי להשתמש.`,
      upgradeUrl: '/dashboard/billing',
    }, { status: 403 })
  }
  return null
}

export async function checkInvoiceLimit(): Promise<NextResponse | null> {
  const result = await getBusinessPlan()
  if (!result) return null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const invoicesThisMonth = await db.invoice.count({
    where: { businessId: result.business.id, createdAt: { gte: monthStart } },
  })

  if (!isWithinLimit(result.plan, 'invoicesPerMonth', invoicesThisMonth)) {
    return NextResponse.json({
      error: 'invoice_limit_reached',
      message: `הגעת למגבלת החשבוניות החודשית (${result.plan.features.invoicesPerMonth}) במסלול ${result.plan.name}.`,
      upgradeUrl: '/dashboard/billing',
    }, { status: 403 })
  }
  return null
}

export async function checkEmployeeLimit(): Promise<NextResponse | null> {
  const result = await getBusinessPlan()
  if (!result) return null

  const employeeCount = await db.employee.count({
    where: { businessId: result.business.id, isActive: true },
  })

  if (!isWithinLimit(result.plan, 'employees', employeeCount)) {
    return NextResponse.json({
      error: 'employee_limit_reached',
      message: `הגעת למגבלת העובדים (${result.plan.features.employees}) במסלול ${result.plan.name}.`,
      upgradeUrl: '/dashboard/billing',
    }, { status: 403 })
  }
  return null
}

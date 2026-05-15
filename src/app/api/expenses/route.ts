import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

async function getOrCreateBusiness() {
  let business = await db.business.findFirst()
  if (!business) {
    business = await db.business.create({
      data: { name: 'העסק שלי', taxType: 'OSEK_MURSHEH', vatReportPeriod: 'BIMONTHLY' },
    })
  }
  return business
}

export async function GET(request: NextRequest) {
  try {
    const business = await getOrCreateBusiness()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { businessId: business.id }
    if (category) where.category = category
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    const totals = expenses.reduce(
      (acc, e) => ({
        total: acc.total + e.total,
        vatDeductible: acc.vatDeductible + (e.vatDeductible ? e.vatAmount * (e.vatDeductiblePercent / 100) : 0),
      }),
      { total: 0, vatDeductible: 0 }
    )

    return NextResponse.json({ expenses, totals })
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה בטעינת הוצאות' }, { status: 500 })
  }
}

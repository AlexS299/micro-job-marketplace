import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { buildPnL, getPeriodDates, type Period } from '@/lib/financial-statements'

async function getBusiness() {
  let b = await db.business.findFirst()
  if (!b) b = await db.business.create({ data: { name: 'העסק שלי', taxType: 'OSEK_MURSHEH', vatReportPeriod: 'BIMONTHLY' } })
  return b
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') || 'year') as Period
  const refDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()

  const { start, end, label } = getPeriodDates(period, refDate)
  const business = await getBusiness()
  const statement = await buildPnL(db, business.id, start, end, label)
  return NextResponse.json(statement)
}

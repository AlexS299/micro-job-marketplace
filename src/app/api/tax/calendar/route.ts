import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateTaxCalendar } from '@/lib/tax-authority'

export async function GET() {
  const business = await db.business.findFirst()
  const period = (business?.vatReportPeriod as 'MONTHLY' | 'BIMONTHLY') || 'BIMONTHLY'
  const deadlines = generateTaxCalendar(period)
  return NextResponse.json(deadlines)
}

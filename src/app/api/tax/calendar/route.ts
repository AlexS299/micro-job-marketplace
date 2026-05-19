import { NextResponse } from 'next/server'
import { generateTaxCalendar } from '@/lib/tax-authority'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const period = (business.vatReportPeriod as 'MONTHLY' | 'BIMONTHLY') || 'BIMONTHLY'
  const deadlines = generateTaxCalendar(period)
  return NextResponse.json(deadlines)
}

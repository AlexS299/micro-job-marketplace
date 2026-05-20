import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { buildPnL, getPeriodDates, type Period } from '@/lib/financial-statements'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') || 'year') as Period
  const refDate = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()

  const { start, end, label } = getPeriodDates(period, refDate)
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const statement = await buildPnL(db, business.id, start, end, label)
  return NextResponse.json(statement)
}

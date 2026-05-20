import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { buildBalanceSheet } from '@/lib/financial-statements'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const asOf = searchParams.get('asOf') ? new Date(searchParams.get('asOf')!) : new Date()
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const sheet = await buildBalanceSheet(db, business.id, asOf)
  return NextResponse.json(sheet)
}

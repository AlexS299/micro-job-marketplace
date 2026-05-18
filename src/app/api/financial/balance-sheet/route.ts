import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { buildBalanceSheet } from '@/lib/financial-statements'

async function getBusiness() {
  let b = await db.business.findFirst()
  if (!b) b = await db.business.create({ data: { name: 'העסק שלי', taxType: 'OSEK_MURSHEH', vatReportPeriod: 'BIMONTHLY' } })
  return b
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const asOf = searchParams.get('asOf') ? new Date(searchParams.get('asOf')!) : new Date()
  const business = await getBusiness()
  const sheet = await buildBalanceSheet(db, business.id, asOf)
  return NextResponse.json(sheet)
}

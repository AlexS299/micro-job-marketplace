import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateAlerts } from '@/lib/alerts'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const alerts = await generateAlerts(db, business.id)
  return NextResponse.json(alerts)
}

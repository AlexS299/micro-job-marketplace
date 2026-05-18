import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { generateAlerts } from '@/lib/alerts'

export async function GET() {
  const alerts = await generateAlerts(db)
  return NextResponse.json(alerts)
}

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const recurring = await db.recurringInvoice.findMany({
    where: { businessId: business.id },
    include: { client: true },
    orderBy: { nextRunDate: 'asc' },
  })
  return NextResponse.json(recurring)
}

export async function POST(request: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const body = await request.json()

  const nextRun = new Date()
  nextRun.setDate(body.dayOfMonth || 1)
  if (nextRun <= new Date()) nextRun.setMonth(nextRun.getMonth() + 1)

  const recurring = await db.recurringInvoice.create({
    data: {
      businessId: business.id,
      clientId: body.clientId || null,
      description: body.description,
      items: JSON.stringify(body.items),
      frequency: body.frequency || 'MONTHLY',
      dayOfMonth: body.dayOfMonth || 1,
      nextRunDate: nextRun,
      isActive: true,
      emailReminder: body.emailReminder ?? true,
      reminderDays: body.reminderDays ?? 7,
    },
    include: { client: true },
  })
  return NextResponse.json(recurring)
}

export async function PATCH(request: NextRequest) {
  const { id, isActive } = await request.json()
  const updated = await db.recurringInvoice.update({
    where: { id },
    data: { isActive },
    include: { client: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })
  await db.recurringInvoice.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

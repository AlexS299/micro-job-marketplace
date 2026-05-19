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

  const dayOfMonth = Math.min(Math.max(Number(body.dayOfMonth) || 1, 1), 31)
  const reminderDays = Math.min(Math.max(Number(body.reminderDays ?? 7), 0), 30)

  const nextRun = new Date()
  nextRun.setDate(dayOfMonth)
  if (nextRun <= new Date()) nextRun.setMonth(nextRun.getMonth() + 1)

  const recurring = await db.recurringInvoice.create({
    data: {
      businessId: business.id,
      clientId: body.clientId || null,
      description: body.description,
      items: JSON.stringify(body.items),
      frequency: body.frequency || 'MONTHLY',
      dayOfMonth,
      nextRunDate: nextRun,
      isActive: true,
      emailReminder: body.emailReminder ?? true,
      reminderDays,
    },
    include: { client: true },
  })
  return NextResponse.json(recurring)
}

export async function PATCH(request: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const { id, isActive } = await request.json()
  if (!id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })

  const existing = await db.recurringInvoice.findFirst({
    where: { id, businessId: business.id },
  })
  if (!existing) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })

  const updated = await db.recurringInvoice.update({
    where: { id },
    data: { isActive },
    include: { client: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'חסר מזהה' }, { status: 400 })

  const existing = await db.recurringInvoice.findFirst({
    where: { id, businessId: business.id },
  })
  if (!existing) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })

  await db.recurringInvoice.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

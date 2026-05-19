import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.expense.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'הוצאה לא נמצאה' }, { status: 404 })

  const body = await req.json() as Record<string, unknown>
  const expense = await db.expense.update({
    where: { id: params.id },
    data: {
      vendor:              body.vendor as string | undefined,
      description:         body.description as string | undefined,
      date:                body.date ? new Date(body.date as string) : undefined,
      subtotal:            body.subtotal !== undefined ? Number(body.subtotal) : undefined,
      vatAmount:           body.vatAmount !== undefined ? Number(body.vatAmount) : undefined,
      total:               body.total !== undefined ? Number(body.total) : undefined,
      category:            body.category as string | undefined,
      receiptNumber:       body.receiptNumber as string | undefined,
      vatDeductible:       body.vatDeductible as boolean | undefined,
      vatDeductiblePercent:body.vatDeductiblePercent !== undefined ? Number(body.vatDeductiblePercent) : undefined,
      status:              body.status as string | undefined,
      notes:               body.notes as string | undefined,
    },
  })

  await audit(business.id, userId, 'expense.update', {
    resourceId: params.id, resourceType: 'expense', ...auditMeta(req),
  })

  return NextResponse.json(expense)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.expense.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'הוצאה לא נמצאה' }, { status: 404 })

  await db.expense.delete({ where: { id: params.id } })

  await audit(business.id, userId, 'expense.delete', {
    resourceId: params.id, resourceType: 'expense', ...auditMeta(req),
  })

  return NextResponse.json({ success: true })
}

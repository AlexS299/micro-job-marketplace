import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { encrypt, safeDecrypt } from '@/lib/encrypt'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.employee.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 })

  const body = await req.json() as Record<string, unknown>
  const employee = await db.employee.update({
    where: { id: params.id },
    data: {
      firstName:      body.firstName as string,
      lastName:       body.lastName as string,
      idNumber:       body.idNumber ? encrypt(body.idNumber as string) : existing.idNumber,
      email:          (body.email as string) || null,
      phone:          (body.phone as string) || null,
      address:        (body.address as string) || null,
      jobTitle:       (body.jobTitle as string) || null,
      employeeType:   body.employeeType as string,
      grossSalary:    Number(body.grossSalary),
      taxCreditPoints:Number(body.taxCreditPoints),
      bankAccount:    (body.bankAccount as string) || null,
      bankBranch:     (body.bankBranch as string) || null,
      bankName:       (body.bankName as string) || null,
      includePension: body.includePension as boolean,
      pensionFund:    (body.pensionFund as string) || null,
      includeKeren:   body.includeKeren as boolean,
      isActive:       body.isActive as boolean,
      endDate:        body.endDate ? new Date(body.endDate as string) : null,
    },
  })

  await audit(business.id, userId, 'employee.update', {
    resourceId: params.id, resourceType: 'employee',
    changes: { firstName: body.firstName, lastName: body.lastName }, ...auditMeta(req),
  })

  return NextResponse.json({ ...employee, idNumber: safeDecrypt(employee.idNumber) })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.employee.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 })

  await db.employee.update({ where: { id: params.id }, data: { isActive: false } })

  await audit(business.id, userId, 'employee.delete', {
    resourceId: params.id, resourceType: 'employee', ...auditMeta(req),
  })

  return NextResponse.json({ success: true })
}

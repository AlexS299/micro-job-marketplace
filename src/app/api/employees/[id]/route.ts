import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { encrypt, safeDecrypt } from '@/lib/encrypt'
import { parseBody, EmployeeCreateSchema } from '@/lib/validate'
import { z } from 'zod'

const EmployeeUpdateSchema = EmployeeCreateSchema.omit({ startDate: true, idNumber: true }).extend({
  idNumber:  z.string().min(5).max(20).optional(),
  address:   z.string().max(200).optional().nullable(),
  pensionFund: z.string().max(100).optional().nullable(),
  isActive:  z.boolean().optional(),
  endDate:   z.string().datetime().optional().nullable(),
}).partial()

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.employee.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'עובד לא נמצא' }, { status: 404 })

  const { data, error: valError } = await parseBody(req, EmployeeUpdateSchema)
  if (valError) return valError

  const employee = await db.employee.update({
    where: { id: params.id },
    data: {
      firstName:      data.firstName,
      lastName:       data.lastName,
      idNumber:       data.idNumber ? encrypt(data.idNumber) : existing.idNumber,
      email:          data.email || null,
      phone:          data.phone || null,
      address:        data.address || null,
      jobTitle:       data.jobTitle || null,
      employeeType:   data.employeeType,
      grossSalary:    data.grossSalary,
      taxCreditPoints:data.taxCreditPoints,
      bankAccount:    data.bankAccount || null,
      bankBranch:     data.bankBranch || null,
      bankName:       data.bankName || null,
      includePension: data.includePension,
      pensionFund:    data.pensionFund || null,
      includeKeren:   data.includeKeren,
      isActive:       data.isActive,
      endDate:        data.endDate ? new Date(data.endDate) : null,
    },
  })

  await audit(business.id, userId, 'employee.update', {
    resourceId: params.id, resourceType: 'employee',
    changes: { firstName: data.firstName, lastName: data.lastName }, ...auditMeta(req),
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

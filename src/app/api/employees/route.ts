import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { encrypt, safeDecrypt } from '@/lib/encrypt'
import { parseBody, EmployeeCreateSchema } from '@/lib/validate'
import { checkEmployeeLimit } from '@/lib/plan-gate'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const employees = await db.employee.findMany({
    where: { businessId: business.id },
    orderBy: { lastName: 'asc' },
  })

  return NextResponse.json(employees.map(e => ({ ...e, idNumber: safeDecrypt(e.idNumber) })))
}

export async function POST(request: NextRequest) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const limitError = await checkEmployeeLimit(business.id)
  if (limitError) return limitError

  const { data, error: valError } = await parseBody(request, EmployeeCreateSchema)
  if (valError) return valError

  const employee = await db.employee.create({
    data: {
      businessId:      business.id,
      firstName:       data.firstName,
      lastName:        data.lastName,
      idNumber:        encrypt(data.idNumber),
      email:           data.email || null,
      phone:           data.phone || null,
      startDate:       new Date(data.startDate),
      jobTitle:        data.jobTitle || null,
      employeeType:    data.employeeType,
      grossSalary:     data.grossSalary,
      taxCreditPoints: data.taxCreditPoints,
      bankAccount:     data.bankAccount || null,
      bankBranch:      data.bankBranch || null,
      bankName:        data.bankName || null,
      includePension:  data.includePension,
      includeKeren:    data.includeKeren,
    },
  })

  await audit(business.id, userId, 'employee.create', {
    resourceId: employee.id, resourceType: 'employee',
    changes: { firstName: data.firstName, lastName: data.lastName }, ...auditMeta(request),
  })

  return NextResponse.json({ ...employee, idNumber: safeDecrypt(employee.idNumber) })
}

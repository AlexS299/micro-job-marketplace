import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { encrypt, safeDecrypt } from '@/lib/encrypt'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const employees = await db.employee.findMany({
    where: { businessId: business.id },
    orderBy: { lastName: 'asc' },
  })

  // Decrypt idNumber before returning
  return NextResponse.json(employees.map(e => ({ ...e, idNumber: safeDecrypt(e.idNumber) })))
}

export async function POST(request: NextRequest) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const body = await request.json() as Record<string, unknown>
  const employee = await db.employee.create({
    data: {
      businessId:      business.id,
      firstName:       body.firstName as string,
      lastName:        body.lastName as string,
      idNumber:        encrypt(body.idNumber as string),
      email:           (body.email as string) || null,
      phone:           (body.phone as string) || null,
      address:         (body.address as string) || null,
      startDate:       new Date(body.startDate as string),
      jobTitle:        (body.jobTitle as string) || null,
      employeeType:    (body.employeeType as string) || 'FULL_TIME',
      grossSalary:     Number(body.grossSalary),
      taxCreditPoints: Number(body.taxCreditPoints) || 2.25,
      bankAccount:     (body.bankAccount as string) || null,
      bankBranch:      (body.bankBranch as string) || null,
      bankName:        (body.bankName as string) || null,
      includePension:  (body.includePension as boolean) ?? true,
      pensionFund:     (body.pensionFund as string) || null,
      includeKeren:    (body.includeKeren as boolean) ?? false,
    },
  })

  await audit(business.id, userId, 'employee.create', {
    resourceId: employee.id, resourceType: 'employee',
    changes: { firstName: body.firstName, lastName: body.lastName }, ...auditMeta(request),
  })

  return NextResponse.json({ ...employee, idNumber: safeDecrypt(employee.idNumber) })
}

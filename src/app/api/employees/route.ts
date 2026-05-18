import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

async function getBusiness() {
  let b = await db.business.findFirst()
  if (!b) b = await db.business.create({ data: { name: 'העסק שלי', taxType: 'OSEK_MURSHEH', vatReportPeriod: 'BIMONTHLY' } })
  return b
}

export async function GET() {
  const business = await getBusiness()
  const employees = await db.employee.findMany({
    where: { businessId: business.id },
    orderBy: { lastName: 'asc' },
  })
  return NextResponse.json(employees)
}

export async function POST(request: NextRequest) {
  const business = await getBusiness()
  const body = await request.json()
  const employee = await db.employee.create({
    data: {
      businessId: business.id,
      firstName: body.firstName,
      lastName: body.lastName,
      idNumber: body.idNumber,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      startDate: new Date(body.startDate),
      jobTitle: body.jobTitle || null,
      employeeType: body.employeeType || 'FULL_TIME',
      grossSalary: Number(body.grossSalary),
      taxCreditPoints: Number(body.taxCreditPoints) || 2.25,
      bankAccount: body.bankAccount || null,
      bankBranch: body.bankBranch || null,
      bankName: body.bankName || null,
      includePension: body.includePension ?? true,
      pensionFund: body.pensionFund || null,
      includeKeren: body.includeKeren ?? false,
    },
  })
  return NextResponse.json(employee)
}

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json()
  const employee = await db.employee.update({
    where: { id: params.id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      idNumber: body.idNumber,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      jobTitle: body.jobTitle || null,
      employeeType: body.employeeType,
      grossSalary: Number(body.grossSalary),
      taxCreditPoints: Number(body.taxCreditPoints),
      bankAccount: body.bankAccount || null,
      bankBranch: body.bankBranch || null,
      bankName: body.bankName || null,
      includePension: body.includePension,
      pensionFund: body.pensionFund || null,
      includeKeren: body.includeKeren,
      isActive: body.isActive,
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  })
  return NextResponse.json(employee)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await db.employee.update({ where: { id: params.id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}

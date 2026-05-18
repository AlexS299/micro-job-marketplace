import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { calculatePayroll } from '@/lib/payroll'

async function getBusiness() {
  let b = await db.business.findFirst()
  if (!b) b = await db.business.create({ data: { name: 'העסק שלי', taxType: 'OSEK_MURSHEH', vatReportPeriod: 'BIMONTHLY' } })
  return b
}

// GET /api/payroll/run?month=5&year=2025
export async function GET(request: NextRequest) {
  const business = await getBusiness()
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined
  const year  = searchParams.get('year')  ? Number(searchParams.get('year'))  : undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { businessId: business.id }
  if (month) where.month = month
  if (year)  where.year  = year

  const runs = await db.payrollRun.findMany({
    where,
    include: {
      employees: { include: { employee: true } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return NextResponse.json(runs)
}

// POST — create or recalculate a payroll run
export async function POST(request: NextRequest) {
  const business = await getBusiness()
  const body = await request.json()
  const month = Number(body.month)
  const year  = Number(body.year)

  // Delete existing draft for this period
  const existing = await db.payrollRun.findFirst({
    where: { businessId: business.id, month, year, status: 'DRAFT' },
  })
  if (existing) {
    await db.payrollRun.delete({ where: { id: existing.id } })
  }

  const employees = await db.employee.findMany({
    where: { businessId: business.id, isActive: true },
  })

  const employeePayrolls = employees.map(emp => {
    const bonus = (body.bonuses?.[emp.id] as number) || 0
    const result = calculatePayroll({
      grossSalary: emp.grossSalary,
      bonus,
      taxCreditPoints: emp.taxCreditPoints,
      includePension: emp.includePension,
      includeKeren: emp.includeKeren,
    })
    return { emp, result, bonus }
  })

  const totals = employeePayrolls.reduce(
    (acc, { result }) => ({
      totalGross:        acc.totalGross        + result.totalGross,
      totalNet:          acc.totalNet          + result.netSalary,
      totalTax:          acc.totalTax          + result.incomeTax,
      totalNI:           acc.totalNI           + result.nationalInsEmp,
      totalEmployerCost: acc.totalEmployerCost + result.totalEmployerCost,
    }),
    { totalGross: 0, totalNet: 0, totalTax: 0, totalNI: 0, totalEmployerCost: 0 }
  )

  const run = await db.payrollRun.create({
    data: {
      businessId: business.id,
      month,
      year,
      status: 'DRAFT',
      ...totals,
      employees: {
        create: employeePayrolls.map(({ emp, result, bonus }) => ({
          employeeId:          emp.id,
          grossSalary:         result.grossSalary,
          bonus,
          incomeTax:           result.incomeTax,
          nationalInsEmp:      result.nationalInsEmp,
          healthTaxEmp:        result.healthTaxEmp,
          pensionEmp:          result.pensionEmp,
          kerenEmp:            result.kerenEmp,
          totalDeductions:     result.totalDeductions,
          netSalary:           result.netSalary,
          nationalInsEmployer: result.nationalInsEmployer,
          pensionEmployer:     result.pensionEmployer,
          severanceEmployer:   result.severanceEmployer,
          kerenEmployer:       result.kerenEmployer,
          totalEmployerCost:   result.totalEmployerCost,
        })),
      },
    },
    include: { employees: { include: { employee: true } } },
  })

  return NextResponse.json(run)
}

// PATCH — approve payroll run
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const run = await db.payrollRun.update({
    where: { id: body.id },
    data: { status: 'APPROVED' },
  })
  return NextResponse.json(run)
}

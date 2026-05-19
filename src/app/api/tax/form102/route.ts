import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { formatForm102XML, type Form102Data } from '@/lib/tax-authority'
import { getAuthBusiness } from '@/lib/auth-context'

export async function POST(request: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const body = await request.json()
  const month = Number(body.month)
  const year  = Number(body.year)

  // Find payroll run for this period
  const payrollRun = await db.payrollRun.findFirst({
    where: { businessId: business.id, month, year },
    include: { employees: true },
  })

  if (!payrollRun) {
    return NextResponse.json(
      { error: 'לא נמצאה הרצת שכר לתקופה זו. הפק שכר קודם.' },
      { status: 404 }
    )
  }

  const form102Data: Form102Data = {
    employerVatNumber: business.vatNumber || '000000000',
    month,
    year,
    employeeCount: payrollRun.employees.length,
    totalGrossSalaries: payrollRun.totalGross,
    totalIncomeTaxDeducted: payrollRun.totalTax,
    totalNIEmployee: payrollRun.employees.reduce((s, e) => s + e.nationalInsEmp, 0),
    totalNIEmployer: payrollRun.employees.reduce((s, e) => s + e.nationalInsEmployer, 0),
    totalHealthTax: payrollRun.employees.reduce((s, e) => s + e.healthTaxEmp, 0),
    totalPensionEmployee: payrollRun.employees.reduce((s, e) => s + e.pensionEmp, 0),
    totalPensionEmployer: payrollRun.employees.reduce((s, e) => s + e.pensionEmployer, 0),
    totalSeverance: payrollRun.employees.reduce((s, e) => s + e.severanceEmployer, 0),
  }

  const xml = formatForm102XML(form102Data)
  const totalPayment = form102Data.totalIncomeTaxDeducted
    + form102Data.totalNIEmployee
    + form102Data.totalNIEmployer
    + form102Data.totalHealthTax

  return NextResponse.json({
    form102Data,
    xml,
    totalPayment: Math.round(totalPayment * 100) / 100,
    dueDate: new Date(year, month, 15).toISOString(),
    manualUrl: 'https://www.btl.gov.il/Employer%20Service/NikuiMass/Pages/Form102.aspx',
  })
}

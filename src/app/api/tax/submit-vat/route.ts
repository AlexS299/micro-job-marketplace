import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { formatPCN874, type VATReportData } from '@/lib/tax-authority'
import { VAT_RATE } from '@/lib/vat'
import { getAuthBusiness } from '@/lib/auth-context'

export async function POST(request: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const body = await request.json()

  const periodStart = new Date(body.periodStart)
  const periodEnd   = new Date(body.periodEnd)

  // Calculate from invoices
  const invoices = await db.invoice.findMany({
    where: {
      businessId: business.id,
      issueDate: { gte: periodStart, lte: periodEnd },
      status: { notIn: ['CANCELLED', 'DRAFT'] },
    },
  })

  // Calculate from approved expenses (input VAT)
  const expenses = await db.expense.findMany({
    where: {
      businessId: business.id,
      date: { gte: periodStart, lte: periodEnd },
      status: 'APPROVED',
      vatDeductible: true,
    },
  })

  const outputBase = invoices.reduce((s, i) => s + i.subtotal, 0)
  const outputVAT  = invoices.reduce((s, i) => s + i.vatAmount, 0)

  const inputVAT = expenses.reduce(
    (s, e) => s + e.vatAmount * (e.vatDeductiblePercent / 100), 0
  )
  const inputBase = inputVAT / VAT_RATE

  const netVAT = Math.round((outputVAT - inputVAT) * 100) / 100

  const reportData: VATReportData = {
    dealerVatNumber: business.vatNumber || '000000000',
    periodStart,
    periodEnd,
    outputVAT: Math.round(outputVAT * 100) / 100,
    outputBase: Math.round(outputBase * 100) / 100,
    inputVAT: Math.round(inputVAT * 100) / 100,
    inputBase: Math.round(inputBase * 100) / 100,
    netVAT,
    transactionCount: invoices.length,
  }

  const pcn874 = formatPCN874(reportData)

  // If SHAAM_API_KEY is set — submit electronically; otherwise return ready-to-submit data
  if (process.env.SHAAM_API_KEY) {
    try {
      const response = await fetch('https://api.shaam.gov.il/vat/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SHAAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pcn874, ...reportData }),
      })
      const result = await response.json()

      // Save report
      await db.vATReport.create({
        data: {
          businessId: business.id,
          periodStart,
          periodEnd,
          outputVAT: reportData.outputVAT,
          inputVAT: reportData.inputVAT,
          vatOwed: netVAT,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          reportData: JSON.stringify({ ...reportData, submissionResult: result }),
        },
      })

      return NextResponse.json({ submitted: true, confirmationNumber: result.confirmationNumber, reportData, pcn874 })
    } catch (error) {
      return NextResponse.json({ error: 'שגיאה בהגשה לשע"מ', details: String(error) }, { status: 500 })
    }
  }

  // Save as draft report
  const existing = await db.vATReport.findFirst({
    where: { businessId: business.id, periodStart, periodEnd },
  })

  if (!existing) {
    await db.vATReport.create({
      data: {
        businessId: business.id,
        periodStart,
        periodEnd,
        outputVAT: reportData.outputVAT,
        inputVAT: reportData.inputVAT,
        vatOwed: netVAT,
        status: 'DRAFT',
        reportData: JSON.stringify(reportData),
      },
    })
  }

  return NextResponse.json({
    submitted: false,
    readyToSubmit: true,
    reportData,
    pcn874,
    message: 'הדוח מוכן להגשה. הגדר SHAAM_API_KEY להגשה אוטומטית, או השתמש בנתונים להגשה ידנית',
    manualUrl: 'https://www.misim.gov.il/mm856SheyletatDivuah/Default.aspx',
  })
}

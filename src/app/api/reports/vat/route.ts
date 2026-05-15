import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { VAT_RATE, getVATReportPeriod } from '@/lib/vat'

async function getOrCreateBusiness() {
  let business = await db.business.findFirst()
  if (!business) {
    business = await db.business.create({
      data: { name: 'העסק שלי', taxType: 'OSEK_MURSHEH', vatReportPeriod: 'BIMONTHLY' },
    })
  }
  return business
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const businessId = searchParams.get('businessId')

    const business = await getOrCreateBusiness()
    const bId = businessId || business.id

    // Get all VAT reports for the business
    const reports = await db.vATReport.findMany({
      where: { businessId: bId },
      orderBy: { periodStart: 'desc' },
    })

    // Also compute current period summary
    const currentPeriod = getVATReportPeriod(
      new Date(),
      business.vatReportPeriod as 'MONTHLY' | 'BIMONTHLY'
    )

    const [invoices, bankAccounts] = await Promise.all([
      db.invoice.findMany({
        where: {
          businessId: bId,
          issueDate: { gte: currentPeriod.start, lte: currentPeriod.end },
          status: { notIn: ['CANCELLED', 'DRAFT'] },
        },
      }),
      db.bankAccount.findMany({ where: { businessId: bId } }),
    ])

    const accountIds = bankAccounts.map((a) => a.id)
    const transactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: accountIds },
        date: { gte: currentPeriod.start, lte: currentPeriod.end },
        category: 'EXPENSE',
        amount: { lt: 0 },
      },
    })

    const outputVAT = invoices.reduce((s, i) => s + i.vatAmount, 0)
    const totalRevenue = invoices.reduce((s, i) => s + i.subtotal, 0)
    const totalExpenses = Math.abs(transactions.reduce((s, t) => s + t.amount, 0))
    const inputVAT = Math.round(totalExpenses * VAT_RATE * 100) / 100
    const vatOwed = Math.round((outputVAT - inputVAT) * 100) / 100

    return NextResponse.json({
      reports,
      currentPeriod: {
        ...currentPeriod,
        outputVAT: Math.round(outputVAT * 100) / 100,
        inputVAT,
        vatOwed,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        invoiceCount: invoices.length,
        label: currentPeriod.label,
      },
    })
  } catch (error) {
    console.error('GET VAT report error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת דוחות מע"מ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { periodStart, periodEnd } = body

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: 'תאריכי תקופה נדרשים' }, { status: 400 })
    }

    const business = await getOrCreateBusiness()
    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    const [invoices, bankAccounts] = await Promise.all([
      db.invoice.findMany({
        where: {
          businessId: business.id,
          issueDate: { gte: start, lte: end },
          status: { notIn: ['CANCELLED', 'DRAFT'] },
        },
      }),
      db.bankAccount.findMany({ where: { businessId: business.id } }),
    ])

    const accountIds = bankAccounts.map((a) => a.id)
    const expenseTransactions = await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: accountIds },
        date: { gte: start, lte: end },
        category: 'EXPENSE',
        amount: { lt: 0 },
      },
    })

    const outputVAT = Math.round(invoices.reduce((s, i) => s + i.vatAmount, 0) * 100) / 100
    const totalRevenue = Math.round(invoices.reduce((s, i) => s + i.subtotal, 0) * 100) / 100
    const totalExpenses = Math.round(Math.abs(expenseTransactions.reduce((s, t) => s + t.amount, 0)) * 100) / 100
    const inputVAT = Math.round(totalExpenses * VAT_RATE * 100) / 100
    const vatOwed = Math.round((outputVAT - inputVAT) * 100) / 100

    const reportData = JSON.stringify({
      invoicesCount: invoices.length,
      totalRevenue,
      totalExpenses,
      transactionsCount: expenseTransactions.length,
    })

    const report = await db.vATReport.create({
      data: {
        businessId: business.id,
        periodStart: start,
        periodEnd: end,
        outputVAT,
        inputVAT,
        vatOwed,
        status: 'DRAFT',
        reportData,
      },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('POST VAT report error:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת דוח מע"מ' }, { status: 500 })
  }
}

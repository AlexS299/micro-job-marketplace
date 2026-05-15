import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getVATReportPeriod } from '@/lib/vat'

export async function GET() {
  try {
    let business = await db.business.findFirst()
    if (!business) {
      business = await db.business.create({
        data: { name: 'העסק שלי', taxType: 'OSEK_MURSHEH', vatReportPeriod: 'BIMONTHLY' },
      })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Current period for VAT
    const vatPeriod = getVATReportPeriod(
      now,
      business.vatReportPeriod as 'MONTHLY' | 'BIMONTHLY'
    )

    const [
      thisMonthInvoices,
      lastMonthInvoices,
      outstandingInvoices,
      vatPeriodInvoices,
      bankAccounts,
      recentInvoices,
      recentTransactions,
    ] = await Promise.all([
      db.invoice.findMany({
        where: {
          businessId: business.id,
          issueDate: { gte: startOfMonth },
          status: 'PAID',
        },
      }),
      db.invoice.findMany({
        where: {
          businessId: business.id,
          issueDate: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: 'PAID',
        },
      }),
      db.invoice.findMany({
        where: {
          businessId: business.id,
          status: { in: ['SENT', 'OVERDUE'] },
        },
      }),
      db.invoice.findMany({
        where: {
          businessId: business.id,
          issueDate: { gte: vatPeriod.start, lte: vatPeriod.end },
          status: { notIn: ['CANCELLED', 'DRAFT'] },
        },
      }),
      db.bankAccount.findMany({ where: { businessId: business.id } }),
      db.invoice.findMany({
        where: { businessId: business.id },
        include: { client: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.bankTransaction.findMany({
        where: { bankAccount: { businessId: business.id } },
        include: { bankAccount: true },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ])

    const revenueThisMonth = thisMonthInvoices.reduce((s, i) => s + i.total, 0)
    const revenueLastMonth = lastMonthInvoices.reduce((s, i) => s + i.total, 0)
    const outstandingAmount = outstandingInvoices.reduce((s, i) => s + i.total, 0)
    const bankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0)
    const vatDue = vatPeriodInvoices.reduce((s, i) => s + i.vatAmount, 0)

    // Monthly revenue for last 6 months
    const monthlyRevenue = []
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      const [monthInvoices, monthExpenses] = await Promise.all([
        db.invoice.findMany({
          where: {
            businessId: business.id,
            issueDate: { gte: monthStart, lte: monthEnd },
            status: 'PAID',
          },
          select: { total: true },
        }),
        db.bankTransaction.findMany({
          where: {
            bankAccount: { businessId: business.id },
            date: { gte: monthStart, lte: monthEnd },
            amount: { lt: 0 },
            category: 'EXPENSE',
          },
          select: { amount: true },
        }),
      ])

      monthlyRevenue.push({
        month: monthNames[monthStart.getMonth()],
        revenue: Math.round(monthInvoices.reduce((s, i) => s + i.total, 0) * 100) / 100,
        expenses: Math.round(Math.abs(monthExpenses.reduce((s, t) => s + t.amount, 0)) * 100) / 100,
      })
    }

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        vatNumber: business.vatNumber,
        taxType: business.taxType,
        vatReportPeriod: business.vatReportPeriod,
      },
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      revenueLastMonth: Math.round(revenueLastMonth * 100) / 100,
      outstandingInvoices: Math.round(outstandingAmount * 100) / 100,
      outstandingCount: outstandingInvoices.length,
      vatDue: Math.round(vatDue * 100) / 100,
      vatPeriodLabel: vatPeriod.label,
      bankBalance: Math.round(bankBalance * 100) / 100,
      monthlyRevenue,
      recentInvoices,
      recentTransactions,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת נתוני לוח הבקרה' }, { status: 500 })
  }
}

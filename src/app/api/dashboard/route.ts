import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getVATReportPeriod } from '@/lib/vat'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET() {
  try {
    const { business, error } = await getAuthBusiness()
    if (error) return error

    const now = new Date()
    const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const twelveMonthsAgo  = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const vatPeriod = getVATReportPeriod(
      now,
      business.vatReportPeriod as 'MONTHLY' | 'BIMONTHLY'
    )

    // Single round-trip for all invoices/expenses needed (no N+1 loop)
    const [
      allInvoicesSince,
      allExpensesSince,
      bankTransactionsSince,
      outstandingInvoices,
      vatPeriodInvoices,
      bankAccounts,
      recentInvoices,
      recentTransactions,
      topClientsRaw,
    ] = await Promise.all([
      // All invoices for 12-month chart — one query
      db.invoice.findMany({
        where: {
          businessId: business.id,
          issueDate: { gte: twelveMonthsAgo },
          status: { notIn: ['CANCELLED', 'DRAFT'] },
        },
        select: { total: true, issueDate: true, status: true, vatAmount: true },
      }),

      // All approved expenses for 12-month chart
      db.expense.findMany({
        where: {
          businessId: business.id,
          date: { gte: twelveMonthsAgo },
          status: 'APPROVED',
        },
        select: { total: true, date: true },
      }),

      // Bank transactions for balance/expense fallback
      db.bankTransaction.findMany({
        where: {
          bankAccount: { businessId: business.id },
          date: { gte: twelveMonthsAgo },
        },
        select: { amount: true, date: true, category: true },
      }),

      // Outstanding (SENT + OVERDUE)
      db.invoice.findMany({
        where: { businessId: business.id, status: { in: ['SENT', 'OVERDUE'] } },
        select: { total: true, status: true, invoiceNumber: true, id: true, dueDate: true, client: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
      }),

      // VAT period invoices
      db.invoice.findMany({
        where: {
          businessId: business.id,
          issueDate: { gte: vatPeriod.start, lte: vatPeriod.end },
          status: { notIn: ['CANCELLED', 'DRAFT'] },
        },
        select: { vatAmount: true },
      }),

      db.bankAccount.findMany({ where: { businessId: business.id }, select: { balance: true } }),

      db.invoice.findMany({
        where: { businessId: business.id },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),

      db.bankTransaction.findMany({
        where: { bankAccount: { businessId: business.id } },
        orderBy: { date: 'desc' },
        take: 6,
        select: { id: true, date: true, description: true, amount: true, category: true },
      }),

      // Top 5 clients by total paid
      db.invoice.groupBy({
        by: ['clientId'],
        where: {
          businessId: business.id,
          status: 'PAID',
          clientId: { not: null },
        },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ])

    // ── KPI calculations ────────────────────────────────────────────────
    const paidThisMonth  = allInvoicesSince.filter(i => i.status === 'PAID' && i.issueDate >= startOfMonth)
    const paidLastMonth  = allInvoicesSince.filter(i => i.status === 'PAID' && i.issueDate >= startOfLastMonth && i.issueDate <= endOfLastMonth)

    const expensesThisMonth = allExpensesSince
      .filter(e => e.date >= startOfMonth)
      .reduce((s, e) => s + e.total, 0)

    const revenueThisMonth = paidThisMonth.reduce((s, i) => s + i.total, 0)
    const revenueLastMonth = paidLastMonth.reduce((s, i) => s + i.total, 0)
    const netProfitThisMonth = revenueThisMonth - expensesThisMonth
    const bankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0)
    const vatDue = vatPeriodInvoices.reduce((s, i) => s + i.vatAmount, 0)

    // Invoice status breakdown (all-time)
    const allStatusInvoices = await db.invoice.groupBy({
      by: ['status'],
      where: { businessId: business.id },
      _count: { id: true },
      _sum: { total: true },
    })
    const statusBreakdown = allStatusInvoices.map(s => ({
      status: s.status,
      count: s._count.id,
      total: s._sum.total ?? 0,
    }))

    // ── Monthly chart data (computed in-memory — no extra queries) ────
    const monthNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
    const monthlyData: Array<{ month: string; revenue: number; expenses: number; profit: number }> = []

    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      const rev = allInvoicesSince
        .filter(inv => inv.status === 'PAID' && inv.issueDate >= mStart && inv.issueDate <= mEnd)
        .reduce((s, inv) => s + inv.total, 0)

      const exp = allExpensesSince
        .filter(e => e.date >= mStart && e.date <= mEnd)
        .reduce((s, e) => s + e.total, 0)

      // Fallback to bank transactions if no expense records
      const bankExp = exp === 0
        ? Math.abs(bankTransactionsSince
            .filter(t => t.amount < 0 && t.category === 'EXPENSE' && t.date >= mStart && t.date <= mEnd)
            .reduce((s, t) => s + t.amount, 0))
        : exp

      monthlyData.push({
        month:    monthNames[mStart.getMonth()],
        revenue:  Math.round(rev * 100) / 100,
        expenses: Math.round(bankExp * 100) / 100,
        profit:   Math.round((rev - bankExp) * 100) / 100,
      })
    }

    // ── Resolve top client names ─────────────────────────────────────
    const clientIds = topClientsRaw.map(c => c.clientId).filter(Boolean) as string[]
    const clientNames = await db.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    })
    const clientMap = Object.fromEntries(clientNames.map(c => [c.id, c.name]))
    const topClients = topClientsRaw.map(c => ({
      clientId: c.clientId,
      name: clientMap[c.clientId ?? ''] ?? 'לא ידוע',
      total: Math.round((c._sum.total ?? 0) * 100) / 100,
    }))

    // ── Upcoming VAT deadline ────────────────────────────────────────
    const vatDeadline = new Date(vatPeriod.end)
    vatDeadline.setDate(vatDeadline.getDate() + 15) // VAT due 15th of following month
    const daysUntilVat = Math.ceil((vatDeadline.getTime() - now.getTime()) / 86_400_000)

    return NextResponse.json({
      business: {
        id: business.id,
        name: business.name,
        vatNumber: business.vatNumber,
        taxType: business.taxType,
        vatReportPeriod: business.vatReportPeriod,
      },
      // KPIs
      revenueThisMonth:  Math.round(revenueThisMonth  * 100) / 100,
      revenueLastMonth:  Math.round(revenueLastMonth  * 100) / 100,
      expensesThisMonth: Math.round(expensesThisMonth * 100) / 100,
      netProfitThisMonth:Math.round(netProfitThisMonth* 100) / 100,
      outstandingInvoices: Math.round(outstandingInvoices.reduce((s, i) => s + i.total, 0) * 100) / 100,
      outstandingCount: outstandingInvoices.filter(i => i.status === 'SENT').length,
      overdueCount: outstandingInvoices.filter(i => i.status === 'OVERDUE').length,
      overdueAmount: Math.round(outstandingInvoices.filter(i => i.status === 'OVERDUE').reduce((s,i) => s + i.total, 0) * 100) / 100,
      overdueInvoices: outstandingInvoices.filter(i => i.status === 'OVERDUE').slice(0, 3),
      vatDue: Math.round(vatDue * 100) / 100,
      vatPeriodLabel: vatPeriod.label,
      vatDeadline: vatDeadline.toISOString(),
      daysUntilVat,
      bankBalance: Math.round(bankBalance * 100) / 100,
      // Charts
      monthlyRevenue: monthlyData,
      statusBreakdown,
      topClients,
      // Lists
      recentInvoices,
      recentTransactions,
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return NextResponse.json({ error: 'שגיאה בטעינת נתוני לוח הבקרה' }, { status: 500 })
  }
}

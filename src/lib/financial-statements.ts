// Financial Statements Engine — Israeli GAAP (aligned)
// Produces P&L, Balance Sheet, and Cash Flow from existing data

import { PrismaClient } from '@prisma/client'

type DB = PrismaClient

function r(n: number) { return Math.round(n * 100) / 100 }

// ─── Period helpers ────────────────────────────────────────────────────────────
export type Period = 'month' | 'quarter' | 'year' | 'custom'

export function getPeriodDates(
  period: Period,
  ref: Date = new Date(),
  customStart?: Date,
  customEnd?: Date
): { start: Date; end: Date; label: string } {
  const y = ref.getFullYear()
  const m = ref.getMonth()

  if (period === 'month') {
    return {
      start: new Date(y, m, 1),
      end:   new Date(y, m + 1, 0, 23, 59, 59),
      label: ref.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }),
    }
  }
  if (period === 'quarter') {
    const q = Math.floor(m / 3)
    return {
      start: new Date(y, q * 3, 1),
      end:   new Date(y, q * 3 + 3, 0, 23, 59, 59),
      label: `רבעון ${q + 1} ${y}`,
    }
  }
  if (period === 'year') {
    return {
      start: new Date(y, 0, 1),
      end:   new Date(y, 11, 31, 23, 59, 59),
      label: `שנת ${y}`,
    }
  }
  return {
    start: customStart!,
    end:   customEnd!,
    label: `${customStart!.toLocaleDateString('he-IL')} – ${customEnd!.toLocaleDateString('he-IL')}`,
  }
}

// ─── P&L ──────────────────────────────────────────────────────────────────────
export interface PnLLine {
  label: string
  amount: number
  indent?: number
  bold?: boolean
  separator?: boolean
  note?: string
}

export interface PnLStatement {
  periodLabel: string
  start: Date
  end: Date
  lines: PnLLine[]
  // Key totals
  totalRevenue: number
  grossProfit: number
  operatingProfit: number
  netProfit: number
  // Revenue breakdown
  revenueByClient: { name: string; amount: number }[]
  expenseByCategory: { category: string; label: string; amount: number }[]
}

const EXPENSE_LABELS: Record<string, string> = {
  OFFICE:       'ציוד וחומרי משרד',
  TRAVEL:       'נסיעות ותחבורה',
  MEALS:        'ארוחות ובידור',
  PROFESSIONAL: 'שירותים מקצועיים',
  MARKETING:    'שיווק ופרסום',
  RENT:         'שכירות ואחזקה',
  UTILITIES:    'חשמל, מים, תקשורת',
  INSURANCE:    'ביטוח',
  SALARY:       'הוצאות שכר',
  SOFTWARE:     'תוכנה ומנויים',
  OTHER:        'אחר',
}

export async function buildPnL(
  db: DB,
  businessId: string,
  start: Date,
  end: Date,
  periodLabel: string
): Promise<PnLStatement> {
  const [invoices, expenses, payrollRuns] = await Promise.all([
    db.invoice.findMany({
      where: { businessId, issueDate: { gte: start, lte: end }, status: { notIn: ['CANCELLED', 'DRAFT'] } },
      include: { client: true },
    }),
    db.expense.findMany({
      where: { businessId, date: { gte: start, lte: end }, status: 'APPROVED' },
    }),
    db.payrollRun.findMany({
      where: { businessId, createdAt: { gte: start, lte: end }, status: 'APPROVED' },
      include: { employees: true },
    }),
  ])

  // Revenue
  const revenueGross = r(invoices.reduce((s, i) => s + i.subtotal, 0))
  const revenueVAT   = r(invoices.reduce((s, i) => s + i.vatAmount, 0))

  // Revenue by client
  const clientMap: Record<string, number> = {}
  for (const inv of invoices) {
    const name = inv.client?.name || 'ללא לקוח'
    clientMap[name] = r((clientMap[name] || 0) + inv.subtotal)
  }
  const revenueByClient = Object.entries(clientMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Expenses by category
  const expMap: Record<string, number> = {}
  for (const e of expenses) {
    expMap[e.category] = r((expMap[e.category] || 0) + e.subtotal)
  }
  const expenseByCategory = Object.entries(expMap)
    .map(([category, amount]) => ({ category, label: EXPENSE_LABELS[category] || category, amount }))
    .sort((a, b) => b.amount - a.amount)
  const totalExpenses = r(expenseByCategory.reduce((s, e) => s + e.amount, 0))

  // Payroll cost (gross + employer contributions)
  const payrollGross    = r(payrollRuns.reduce((s, p) => s + p.totalGross, 0))
  const payrollEmployer = r(payrollRuns.reduce((s, p) =>
    s + p.employees.reduce((e, ep) =>
      e + ep.nationalInsEmployer + ep.pensionEmployer + ep.severanceEmployer + ep.kerenEmployer, 0), 0))
  const totalPayrollCost = r(payrollGross + payrollEmployer)

  // Totals
  const totalRevenue     = revenueGross
  const totalCosts       = r(totalExpenses + totalPayrollCost)
  const grossProfit      = r(totalRevenue - totalPayrollCost)
  const operatingProfit  = r(grossProfit - totalExpenses)
  // Simplified tax provision (25% for company, 17% bracket for self-employed est.)
  const taxProvision     = operatingProfit > 0 ? r(operatingProfit * 0.20) : 0
  const netProfit        = r(operatingProfit - taxProvision)

  const lines: PnLLine[] = [
    { label: 'הכנסות', amount: 0, bold: true },
    { label: 'הכנסות ממכירות / שירותים', amount: revenueGross, indent: 1 },
    { label: 'מע"מ על עסקאות', amount: revenueVAT, indent: 1, note: 'אינו חלק מהכנסה החייבת' },
    { label: 'סה"כ הכנסות (ללא מע"מ)', amount: totalRevenue, bold: true, separator: true },

    { label: 'עלויות שכר', amount: 0, bold: true },
    { label: 'שכר עובדים (ברוטו)', amount: payrollGross, indent: 1 },
    { label: 'תשלומי מעסיק (ביטוח לאומי + פנסיה)', amount: payrollEmployer, indent: 1 },
    { label: 'סה"כ עלויות שכר', amount: totalPayrollCost, bold: true },
    { label: 'רווח גולמי', amount: grossProfit, bold: true, separator: true },

    { label: 'הוצאות תפעוליות', amount: 0, bold: true },
    ...expenseByCategory.map(e => ({ label: e.label, amount: e.amount, indent: 1 })),
    { label: 'סה"כ הוצאות תפעוליות', amount: totalExpenses, bold: true },
    { label: 'רווח תפעולי (EBIT)', amount: operatingProfit, bold: true, separator: true },

    ...(taxProvision > 0 ? [
      { label: 'הפרשה למס הכנסה (הערכה 20%)', amount: taxProvision, indent: 1, note: 'הערכה — יש לאשר עם רואה חשבון' },
    ] : []),
    { label: 'רווח נקי', amount: netProfit, bold: true, separator: true },
  ]

  return { periodLabel, start, end, lines, totalRevenue, grossProfit, operatingProfit, netProfit, revenueByClient, expenseByCategory }
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────
export interface BalanceSheetLine {
  label: string
  amount: number
  indent?: number
  bold?: boolean
  separator?: boolean
}

export interface BalanceSheet {
  asOf: Date
  assets: BalanceSheetLine[]
  liabilities: BalanceSheetLine[]
  equity: BalanceSheetLine[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
}

export async function buildBalanceSheet(
  db: DB,
  businessId: string,
  asOf: Date
): Promise<BalanceSheet> {
  const [bankAccounts, invoices, expenses, payrollRuns] = await Promise.all([
    db.bankAccount.findMany({ where: { businessId } }),
    db.invoice.findMany({ where: { businessId, status: { notIn: ['CANCELLED', 'DRAFT'] } } }),
    db.expense.findMany({ where: { businessId, status: 'APPROVED' } }),
    db.payrollRun.findMany({
      where: { businessId, status: 'APPROVED' },
      include: { employees: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 1,
    }),
  ])

  // Assets
  const cashBalance   = r(bankAccounts.reduce((s, a) => s + a.balance, 0))
  const receivables   = r(invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + i.total, 0))
  const vatReceivable = r(expenses.reduce((s, e) => s + e.vatAmount * (e.vatDeductiblePercent / 100), 0))
  const totalCurrentAssets = r(cashBalance + receivables)

  // Liabilities
  const payablesAmount = r(expenses.filter(e => {
    const expDate = new Date(e.date)
    return expDate <= asOf
  }).reduce((s, e) => s + e.total, 0))

  // VAT net position
  const vatOutput = r(invoices.filter(i => i.status !== 'CANCELLED').reduce((s, i) => s + i.vatAmount, 0))
  const vatInput  = vatReceivable
  const vatNet    = r(vatOutput - vatInput)
  const vatPayable    = vatNet > 0 ? vatNet : 0
  const vatRefundable = vatNet < 0 ? Math.abs(vatNet) : 0

  // Salaries payable (last approved payroll net)
  const lastPayroll = payrollRuns[0]
  const salariesPayable = lastPayroll ? r(lastPayroll.totalNet) : 0

  const totalLiabilities = r(vatPayable + salariesPayable)

  // Equity (simplified: assets - liabilities)
  const totalAssets      = r(totalCurrentAssets + vatRefundable)
  const totalEquity      = r(totalAssets - totalLiabilities)

  const assets: BalanceSheetLine[] = [
    { label: 'נכסים שוטפים', amount: 0, bold: true },
    { label: 'מזומנים ושווי מזומנים', amount: cashBalance, indent: 1 },
    { label: 'חייבים — לקוחות', amount: receivables, indent: 1, },
    ...(vatRefundable > 0 ? [{ label: 'מע"מ לקבל', amount: vatRefundable, indent: 1 }] : []),
    { label: 'סה"כ נכסים שוטפים', amount: totalCurrentAssets + vatRefundable, bold: true, separator: true },
    { label: 'סה"כ נכסים', amount: totalAssets, bold: true },
  ]

  const liabilities: BalanceSheetLine[] = [
    { label: 'התחייבויות שוטפות', amount: 0, bold: true },
    ...(vatPayable > 0 ? [{ label: 'מע"מ לשלם', amount: vatPayable, indent: 1 }] : []),
    ...(salariesPayable > 0 ? [{ label: 'שכר לשלם', amount: salariesPayable, indent: 1 }] : []),
    { label: 'סה"כ התחייבויות', amount: totalLiabilities, bold: true, separator: true },
  ]

  const equity: BalanceSheetLine[] = [
    { label: 'הון עצמי', amount: 0, bold: true },
    { label: 'עודפים / גירעון מצטבר', amount: totalEquity, indent: 1 },
    { label: 'סה"כ הון עצמי', amount: totalEquity, bold: true, separator: true },
    { label: 'סה"כ התחייבויות והון עצמי', amount: totalAssets, bold: true },
  ]

  return { asOf, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity }
}

// Proactive Alert Engine — detects issues before the business owner does
import { PrismaClient } from '@prisma/client'
import { generateTaxCalendar } from './tax-authority'

type DB = PrismaClient

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'opportunity'
export type AlertCategory = 'tax' | 'cashflow' | 'invoices' | 'payroll' | 'expenses' | 'insights'

export interface Alert {
  id: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  message: string
  detail?: string
  amount?: number
  daysLeft?: number
  actionLabel?: string
  actionHref?: string
  data?: Record<string, unknown>
  createdAt: Date
}

function r(n: number) { return Math.round(n * 100) / 100 }
function fmt(n: number) { return `₪${Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })}` }

export async function generateAlerts(db: DB, businessId?: string): Promise<Alert[]> {
  const alerts: Alert[] = []
  const now = new Date()
  const business = businessId
    ? await db.business.findUnique({ where: { id: businessId } })
    : await db.business.findFirst()
  if (!business) return alerts

  const [invoices, expenses, payrollRuns, bankAccounts, employees] = await Promise.all([
    db.invoice.findMany({
      where: { businessId: business.id, status: { notIn: ['CANCELLED'] } },
      include: { client: true },
      orderBy: { issueDate: 'desc' },
    }),
    db.expense.findMany({ where: { businessId: business.id } }),
    db.payrollRun.findMany({
      where: { businessId: business.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 3,
    }),
    db.bankAccount.findMany({ where: { businessId: business.id } }),
    db.employee.findMany({ where: { businessId: business.id, isActive: true } }),
  ])

  const totalCash = r(bankAccounts.reduce((s, a) => s + a.balance, 0))

  // ── 1. Tax deadlines ────────────────────────────────────────────────────────
  const vatPeriod = (business.vatReportPeriod as 'MONTHLY' | 'BIMONTHLY') || 'BIMONTHLY'
  const taxDeadlines = generateTaxCalendar(vatPeriod, now)

  for (const d of taxDeadlines.slice(0, 6)) {
    const days = Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / 86400000)
    if (days < 0) {
      alerts.push({
        id: `tax-overdue-${d.id}`,
        severity: 'critical',
        category: 'tax',
        title: `${d.title} — באיחור!`,
        message: `המועד האחרון עבר לפני ${Math.abs(days)} ימים. הגש מיד למניעת קנסות.`,
        daysLeft: days,
        actionLabel: 'עבור למרכז מס',
        actionHref: '/dashboard/tax',
        createdAt: now,
      })
    } else if (days <= 5) {
      alerts.push({
        id: `tax-urgent-${d.id}`,
        severity: 'critical',
        category: 'tax',
        title: `${d.title} — ${days} ימים`,
        message: d.description,
        daysLeft: days,
        actionLabel: 'הכן הגשה',
        actionHref: '/dashboard/tax',
        createdAt: now,
      })
    } else if (days <= 14) {
      alerts.push({
        id: `tax-soon-${d.id}`,
        severity: 'warning',
        category: 'tax',
        title: `${d.title} — בעוד ${days} ימים`,
        message: d.description,
        daysLeft: days,
        actionLabel: 'בדוק',
        actionHref: '/dashboard/tax',
        createdAt: now,
      })
    }
  }

  // ── 2. Overdue invoices ─────────────────────────────────────────────────────
  const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE')
  const overdueTotal = r(overdueInvoices.reduce((s, i) => s + i.total, 0))
  if (overdueInvoices.length > 0) {
    const oldest = overdueInvoices.reduce((a, b) =>
      new Date(a.issueDate) < new Date(b.issueDate) ? a : b)
    const daysSince = Math.ceil((now.getTime() - new Date(oldest.issueDate).getTime()) / 86400000)
    alerts.push({
      id: 'invoices-overdue',
      severity: overdueInvoices.length >= 3 || overdueTotal > 20000 ? 'critical' : 'warning',
      category: 'invoices',
      title: `${overdueInvoices.length} חשבוניות באיחור — ${fmt(overdueTotal)}`,
      message: `הלקוח הכי ותיק בחוב: ${oldest.client?.name || 'לא ידוע'} — ${daysSince} ימים ללא תשלום.`,
      amount: overdueTotal,
      detail: overdueInvoices.map(i => `${i.client?.name || '?'}: ${fmt(i.total)}`).join(' | '),
      actionLabel: 'שלח תזכורות',
      actionHref: '/dashboard/invoices',
      data: { count: overdueInvoices.length, oldest: oldest.id },
      createdAt: now,
    })
  }

  // ── 3. Large sent invoice unpaid > 30 days ──────────────────────────────────
  const largeSent = invoices.filter(i => {
    if (i.status !== 'SENT') return false
    const days = (now.getTime() - new Date(i.issueDate).getTime()) / 86400000
    return i.total > 10000 && days > 30
  })
  for (const inv of largeSent.slice(0, 2)) {
    const days = Math.ceil((now.getTime() - new Date(inv.issueDate).getTime()) / 86400000)
    alerts.push({
      id: `large-unpaid-${inv.id}`,
      severity: 'warning',
      category: 'invoices',
      title: `חשבונית גדולה לא שולמה — ${fmt(inv.total)}`,
      message: `${inv.client?.name || 'לקוח'} לא שילם ${fmt(inv.total)} כבר ${days} ימים (${inv.invoiceNumber}).`,
      amount: inv.total,
      actionLabel: 'שלח תזכורת',
      actionHref: '/dashboard/invoices',
      createdAt: now,
    })
  }

  // ── 4. Draft invoices sitting idle ─────────────────────────────────────────
  const staleDrafts = invoices.filter(i => {
    if (i.status !== 'DRAFT') return false
    const days = (now.getTime() - new Date(i.createdAt).getTime()) / 86400000
    return days > 7
  })
  if (staleDrafts.length > 0) {
    const total = r(staleDrafts.reduce((s, i) => s + i.total, 0))
    alerts.push({
      id: 'stale-drafts',
      severity: 'info',
      category: 'invoices',
      title: `${staleDrafts.length} טיוטות חשבוניות לא נשלחו`,
      message: `${fmt(total)} ממתין לשליחה ללקוחות. שלח כדי לזרז תשלום.`,
      amount: total,
      actionLabel: 'שלח חשבוניות',
      actionHref: '/dashboard/invoices',
      createdAt: now,
    })
  }

  // ── 5. Cash flow — low runway ───────────────────────────────────────────────
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0)

  const lastMonthExpenses = r(expenses
    .filter(e => {
      const d = new Date(e.date)
      return d >= lastMonthStart && d <= lastMonthEnd && e.status === 'APPROVED'
    })
    .reduce((s, e) => s + e.total, 0))

  const monthlyBurn = lastMonthExpenses > 0 ? lastMonthExpenses : 0
  if (totalCash > 0 && monthlyBurn > 0) {
    const runwayMonths = totalCash / monthlyBurn
    if (runwayMonths < 2) {
      alerts.push({
        id: 'low-cash-runway',
        severity: runwayMonths < 1 ? 'critical' : 'warning',
        category: 'cashflow',
        title: `יתרת מזומנים נמוכה — ${runwayMonths.toFixed(1)} חודשי runway`,
        message: `יתרה: ${fmt(totalCash)} | הוצאות חודשיות: ${fmt(monthlyBurn)}. בקצב הנוכחי יש לך ${Math.round(runwayMonths * 30)} ימים.`,
        amount: totalCash,
        actionLabel: 'ראה תזרים',
        actionHref: '/dashboard/financial',
        data: { runway: runwayMonths, cash: totalCash, burn: monthlyBurn },
        createdAt: now,
      })
    }
  }

  // ── 6. Revenue drop ─────────────────────────────────────────────────────────
  const thisMonthRevenue = r(invoices
    .filter(i => new Date(i.issueDate) >= thisMonthStart && i.status !== 'DRAFT')
    .reduce((s, i) => s + i.subtotal, 0))
  const lastMonthRevenue = r(invoices
    .filter(i => {
      const d = new Date(i.issueDate)
      return d >= lastMonthStart && d <= lastMonthEnd && i.status !== 'DRAFT'
    })
    .reduce((s, i) => s + i.subtotal, 0))

  if (lastMonthRevenue > 5000 && thisMonthRevenue < lastMonthRevenue * 0.6) {
    const drop = Math.round(((lastMonthRevenue - thisMonthRevenue) / lastMonthRevenue) * 100)
    alerts.push({
      id: 'revenue-drop',
      severity: 'warning',
      category: 'insights',
      title: `ירידה של ${drop}% בהכנסות לעומת החודש הקודם`,
      message: `החודש: ${fmt(thisMonthRevenue)} | החודש הקודם: ${fmt(lastMonthRevenue)}. שווה לבדוק את הסיבה.`,
      amount: thisMonthRevenue,
      actionLabel: 'ראה דוח כספי',
      actionHref: '/dashboard/financial',
      data: { current: thisMonthRevenue, previous: lastMonthRevenue, dropPct: drop },
      createdAt: now,
    })
  }

  // ── 7. Payroll not run this month ──────────────────────────────────────────
  if (employees.length > 0 && now.getDate() >= 8) {
    const thisMonthPayroll = payrollRuns.find(
      p => p.month === now.getMonth() + 1 && p.year === now.getFullYear()
    )
    if (!thisMonthPayroll) {
      alerts.push({
        id: 'payroll-not-run',
        severity: now.getDate() >= 15 ? 'critical' : 'warning',
        category: 'payroll',
        title: `שכר ${now.toLocaleString('he-IL', { month: 'long' })} לא הופק`,
        message: `יש לך ${employees.length} עובדים פעילים. הפק שכר ושלח טופס 102 עד ה-15.`,
        actionLabel: 'הפק שכר',
        actionHref: '/dashboard/payroll',
        data: { employeeCount: employees.length },
        createdAt: now,
      })
    }
  }

  // ── 8. Unapproved expense scans ─────────────────────────────────────────────
  const pendingExpenses = expenses.filter(e => e.status === 'PENDING')
  if (pendingExpenses.length >= 3) {
    const total = r(pendingExpenses.reduce((s, e) => s + e.total, 0))
    const deductibleVAT = r(pendingExpenses.reduce((s, e) => s + e.vatAmount * (e.vatDeductiblePercent / 100), 0))
    alerts.push({
      id: 'pending-expenses',
      severity: 'info',
      category: 'expenses',
      title: `${pendingExpenses.length} הוצאות ממתינות לאישור`,
      message: `${fmt(total)} בהוצאות שנסרקו. אישורן יוסיף ${fmt(deductibleVAT)} מע"מ תשומות לניכוי.`,
      amount: deductibleVAT,
      actionLabel: 'אשר הוצאות',
      actionHref: '/dashboard/expenses',
      createdAt: now,
    })
  }

  // ── 9. Tax optimization opportunity ────────────────────────────────────────
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const yearRevenue = r(invoices
    .filter(i => new Date(i.issueDate) >= yearStart && i.status === 'PAID')
    .reduce((s, i) => s + i.subtotal, 0))
  const yearExpenses = r(expenses
    .filter(e => new Date(e.date) >= yearStart && e.status === 'APPROVED')
    .reduce((s, e) => s + e.subtotal, 0))
  const yearPayroll = r(payrollRuns
    .filter(p => p.year === now.getFullYear())
    .reduce((s, p) => s + p.totalGross, 0))
  const estimatedProfit = r(yearRevenue - yearExpenses - yearPayroll)

  if (now.getMonth() >= 9 && estimatedProfit > 100000) {
    alerts.push({
      id: 'tax-optimization',
      severity: 'opportunity',
      category: 'insights',
      title: `הזדמנות חיסכון מס — רווח משוער ${fmt(estimatedProfit)}`,
      message: `אתה בדרך לרווח של ${fmt(estimatedProfit)} השנה. שקול להקדים הוצאות לפני ה-31/12 כדי להקטין מס.`,
      amount: estimatedProfit,
      actionLabel: 'ייעוץ מהAI',
      actionHref: '/dashboard/chat',
      data: { profit: estimatedProfit },
      createdAt: now,
    })
  }

  // ── 10. Revenue milestone ───────────────────────────────────────────────────
  const milestones = [50000, 100000, 250000, 500000, 1000000]
  const prevYearRevenue = r(invoices
    .filter(i => {
      const d = new Date(i.issueDate)
      return d >= yearStart && d < now
    })
    .reduce((s, i) => s + i.subtotal, 0))

  for (const m of milestones) {
    const dayAgo = new Date(now.getTime() - 7 * 86400000)
    const recentCrossed = invoices
      .filter(i => {
        const d = new Date(i.issueDate)
        return d >= dayAgo && d >= yearStart && i.status !== 'DRAFT'
      })
      .reduce((s, i) => s + i.subtotal, prevYearRevenue - invoices
        .filter(i2 => {
          const d = new Date(i2.issueDate)
          return d >= yearStart && d < dayAgo && i2.status !== 'DRAFT'
        })
        .reduce((s2, i2) => s2 + i2.subtotal, 0))
    if (recentCrossed <= 0) break
    if (yearRevenue >= m && (yearRevenue - recentCrossed) < m) {
      alerts.push({
        id: `milestone-${m}`,
        severity: 'info',
        category: 'insights',
        title: `🎉 עברת ${fmt(m)} הכנסות השנה!`,
        message: `מזל טוב! הגעת ל-${fmt(m)} הכנסות ב${now.getFullYear()}. ${yearRevenue >= 120000 && business.taxType === 'OSEK_PATUR' ? '⚠️ שים לב: אתה מתקרב לתקרת עוסק פטור!' : ''}`,
        amount: m,
        actionLabel: 'ראה דוח שנתי',
        actionHref: '/dashboard/financial',
        createdAt: now,
      })
      break
    }
  }

  // ── 11. Osek patur threshold warning ───────────────────────────────────────
  if (business.taxType === 'OSEK_PATUR' && yearRevenue > 100000) {
    const pct = Math.round((yearRevenue / 120000) * 100)
    alerts.push({
      id: 'osek-patur-threshold',
      severity: yearRevenue > 110000 ? 'critical' : 'warning',
      category: 'tax',
      title: `עוסק פטור — ${pct}% מהתקרה (${fmt(yearRevenue)})`,
      message: `התקרה לעוסק פטור היא ${fmt(120000)} (2025). חרגת? חובה לעבור לעוסק מורשה ולגבות מע"מ.`,
      amount: yearRevenue,
      actionLabel: 'ייעוץ מהAI',
      actionHref: '/dashboard/chat',
      createdAt: now,
    })
  }

  // ── 12. Allocation number (חשבונית ישראל) — large invoices ────────────────
  // Alert if there are recently-issued invoices above ₪20K (2025 threshold)
  // without an allocation number (reference stored in notes for now)
  const allocationThreshold = 20000 // ₪20K in 2025, drops to ₪10K Jan 2026, ₪5K Jun 2026
  const largeInvoicesNoAllocation = invoices.filter(i => {
    const isRecent = (now.getTime() - new Date(i.issueDate).getTime()) / 86400000 < 90
    const isLarge  = i.subtotal >= allocationThreshold
    const hasNote  = (i.notes ?? '').includes('הקצאה')
    return isRecent && isLarge && i.status !== 'CANCELLED' && i.status !== 'DRAFT' && !hasNote
  })
  if (largeInvoicesNoAllocation.length > 0) {
    alerts.push({
      id: 'allocation-number-missing',
      severity: 'warning',
      category: 'tax',
      title: `${largeInvoicesNoAllocation.length} חשבוניות מעל ₪${allocationThreshold.toLocaleString()} — בדוק מספר הקצאה`,
      message: `מינואר 2025: חשבוניות מעל ₪${allocationThreshold.toLocaleString()} ללא מע"מ חייבות במספר הקצאה מרשות המסים. ללא מספר הקצאה — הלקוח לא יוכל לנכות מס תשומות.`,
      detail: `מינואר 2026 הסף יורד ל-₪10,000, ויוני 2026 — ₪5,000.`,
      actionLabel: 'קבל מספר הקצאה',
      actionHref: '/dashboard/invoices',
      data: { count: largeInvoicesNoAllocation.length, threshold: allocationThreshold },
      createdAt: now,
    })
  }

  // ── 13. Approaching ₪500K turnover → detailed PCN required from Jan 2026 ──
  if (yearRevenue >= 400000 && yearRevenue < 600000 && now.getMonth() >= 8) {
    const onTrack = Math.round((yearRevenue / (now.getMonth() + 1)) * 12)
    if (onTrack >= 500000) {
      alerts.push({
        id: 'pcn-detailed-reporting',
        severity: 'info',
        category: 'tax',
        title: `בדרך למחזור ₪500K — PCN מפורט מינואר 2026`,
        message: `לפי הקצב, מחזורך השנתי יהיה ~${fmt(onTrack)}. מינואר 2026, עסקים מעל ₪500K חייבים בדיווח PCN מפורט — כל חשבונית שהוצאת ושקיבלת.`,
        amount: onTrack,
        actionLabel: 'ייעוץ מהAI',
        actionHref: '/dashboard/chat',
        data: { projectedRevenue: onTrack },
        createdAt: now,
      })
    }
  }

  // Sort: critical → warning → opportunity → info
  const order: AlertSeverity[] = ['critical', 'warning', 'opportunity', 'info']
  return alerts.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
}

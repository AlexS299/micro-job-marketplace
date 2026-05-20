// Israeli Tax Authority (שע"מ) Integration Layer
// Formats data per official specifications for electronic filing

export interface VATReportData {
  dealerVatNumber: string   // מספר עוסק
  periodStart: Date
  periodEnd: Date
  outputVAT: number         // מע"מ עסקאות
  outputBase: number        // בסיס עסקאות (לפני מע"מ)
  inputVAT: number          // מע"מ תשומות
  inputBase: number         // בסיס תשומות
  netVAT: number            // לתשלום / להחזר
  transactionCount: number
}

export interface Form102Data {
  employerVatNumber: string
  month: number
  year: number
  employeeCount: number
  totalGrossSalaries: number
  totalIncomeTaxDeducted: number
  totalNIEmployee: number
  totalNIEmployer: number
  totalHealthTax: number
  totalPensionEmployee: number
  totalPensionEmployer: number
  totalSeverance: number
}

// ─── PCN874 Format (מע"מ) ─────────────────────────────────────────────────────
// Official format for periodic VAT report submission to Shaam
export function formatPCN874(data: VATReportData): string {
  const period = formatVATPeriod(data.periodStart)
  const lines: string[] = []

  // Header record
  lines.push([
    '874',
    data.dealerVatNumber.replace(/\D/g, ''),
    period,
    '',  // report type (regular)
    formatAmount(data.outputBase),
    formatAmount(data.outputVAT),
    formatAmount(data.inputBase),
    formatAmount(data.inputVAT),
    formatAmount(Math.abs(data.netVAT)),
    data.netVAT >= 0 ? '1' : '2',  // 1=לתשלום, 2=להחזר
    data.transactionCount.toString(),
  ].join('|'))

  return lines.join('\n')
}

// ─── Form 102 XML ─────────────────────────────────────────────────────────────
export function formatForm102XML(data: Form102Data): string {
  const period = `${data.year}${String(data.month).padStart(2, '0')}`
  return `<?xml version="1.0" encoding="UTF-8"?>
<Form102 xmlns="http://www.misim.gov.il/form102">
  <Header>
    <EmployerTaxId>${data.employerVatNumber.replace(/\D/g, '')}</EmployerTaxId>
    <ReportPeriod>${period}</ReportPeriod>
    <EmployeeCount>${data.employeeCount}</EmployeeCount>
  </Header>
  <Salaries>
    <TotalGross>${formatAmount(data.totalGrossSalaries)}</TotalGross>
    <IncomeTax>${formatAmount(data.totalIncomeTaxDeducted)}</IncomeTax>
    <NIEmployee>${formatAmount(data.totalNIEmployee)}</NIEmployee>
    <NIEmployer>${formatAmount(data.totalNIEmployer)}</NIEmployer>
    <HealthTax>${formatAmount(data.totalHealthTax)}</HealthTax>
    <PensionEmployee>${formatAmount(data.totalPensionEmployee)}</PensionEmployee>
    <PensionEmployer>${formatAmount(data.totalPensionEmployer)}</PensionEmployer>
    <Severance>${formatAmount(data.totalSeverance)}</Severance>
  </Salaries>
  <Payments>
    <TaxDue>${formatAmount(data.totalIncomeTaxDeducted + data.totalNIEmployee + data.totalNIEmployer + data.totalHealthTax)}</TaxDue>
  </Payments>
</Form102>`
}

// ─── Tax Calendar ─────────────────────────────────────────────────────────────
export interface TaxDeadline {
  id: string
  title: string
  description: string
  dueDate: Date
  type: 'VAT' | 'INCOME_TAX' | 'NI' | 'FORM_102' | 'ANNUAL'
  urgency: 'overdue' | 'urgent' | 'upcoming' | 'future'
  amount?: number
}

export function generateTaxCalendar(
  vatReportPeriod: 'MONTHLY' | 'BIMONTHLY',
  referenceDate: Date = new Date()
): TaxDeadline[] {
  const deadlines: TaxDeadline[] = []
  const now = referenceDate
  const year = now.getFullYear()

  // VAT deadlines (15th of month after period)
  if (vatReportPeriod === 'BIMONTHLY') {
    // Bi-monthly: Jan-Feb → March 15, Mar-Apr → May 15, etc.
    const vatPeriods = [
      { month: 3,  label: 'ינואר-פברואר' },
      { month: 5,  label: 'מרץ-אפריל' },
      { month: 7,  label: 'מאי-יוני' },
      { month: 9,  label: 'יולי-אוגוסט' },
      { month: 11, label: 'ספטמבר-אוקטובר' },
      { month: 1,  label: 'נובמבר-דצמבר', nextYear: true },
    ]
    for (const p of vatPeriods) {
      const y = p.nextYear ? year + 1 : year
      const due = new Date(y, p.month - 1, 15)
      if (due >= new Date(now.getFullYear(), now.getMonth() - 1, 1)) {
        deadlines.push({
          id: `vat-${p.month}-${y}`,
          title: `דוח מע"מ — ${p.label}`,
          description: 'הגשת דוח תקופתי מע"מ לשע"מ',
          dueDate: due,
          type: 'VAT',
          urgency: getUrgency(due, now),
        })
      }
    }
  } else {
    // Monthly VAT
    for (let m = 1; m <= 14; m++) {
      const due = new Date(year, m - 1, 15)
      if (due >= new Date(now.getFullYear(), now.getMonth() - 1, 1)) {
        const reportMonth = m === 1 ? 12 : m - 1
        const reportYear  = m === 1 ? year - 1 : year
        deadlines.push({
          id: `vat-${m}-${year}`,
          title: `דוח מע"מ — ${getHebrewMonth(reportMonth)} ${reportYear}`,
          description: 'הגשת דוח חודשי מע"מ',
          dueDate: due,
          type: 'VAT',
          urgency: getUrgency(due, now),
        })
      }
    }
  }

  // Form 102 — 15th of every month
  for (let m = 1; m <= 13; m++) {
    const due = new Date(year, m - 1, 15)
    if (due >= new Date(now.getFullYear(), now.getMonth(), 1)) {
      deadlines.push({
        id: `form102-${m}-${year}`,
        title: `טופס 102 — ${getHebrewMonth(m === 13 ? 1 : m)}`,
        description: 'דיווח חודשי על ניכויי שכר — מס הכנסה + ביטוח לאומי',
        dueDate: due,
        type: 'FORM_102',
        urgency: getUrgency(due, now),
      })
    }
  }

  // Annual returns
  const annualSelfEmployed = new Date(year, 4, 31)  // May 31
  const annualCorporate    = new Date(year, 3, 30)  // April 30

  deadlines.push({
    id: `annual-self-${year}`,
    title: `דוח שנתי עצמאים ${year - 1}`,
    description: 'הגשת דוח שנתי לעצמאים / עוסקים מורשים',
    dueDate: annualSelfEmployed,
    type: 'ANNUAL',
    urgency: getUrgency(annualSelfEmployed, now),
  })

  deadlines.push({
    id: `annual-corp-${year}`,
    title: `דוח שנתי חברות ${year - 1}`,
    description: 'הגשת דוח שנתי לחברות בע"מ',
    dueDate: annualCorporate,
    type: 'ANNUAL',
    urgency: getUrgency(annualCorporate, now),
  })

  return deadlines
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 12)
}

// ─── Advance Tax Payment (מקדמות מס הכנסה) ───────────────────────────────────
export function estimateAdvanceTax(
  monthlyRevenue: number,
  advanceRate: number = 0.20  // typical 20% — set by tax authority per business
): {
  monthlyAdvance: number
  dueDate: Date
  annualEstimate: number
} {
  const now = new Date()
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15)
  return {
    monthlyAdvance: Math.round(monthlyRevenue * advanceRate * 100) / 100,
    dueDate,
    annualEstimate: Math.round(monthlyRevenue * 12 * advanceRate * 100) / 100,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAmount(n: number): string {
  return Math.round(n).toString()
}

function formatVATPeriod(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  // Bi-monthly: return period number (1-6)
  const period = Math.ceil(m / 2)
  return `${y}${period}`
}

function getUrgency(due: Date, now: Date): TaxDeadline['urgency'] {
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0)  return 'overdue'
  if (daysLeft <= 7) return 'urgent'
  if (daysLeft <= 30) return 'upcoming'
  return 'future'
}

function getHebrewMonth(m: number): string {
  const months = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  return months[m] || ''
}

export const URGENCY_CONFIG = {
  overdue:  { label: 'באיחור!',    bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
  urgent:   { label: 'דחוף',       bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  upcoming: { label: 'בקרוב',      bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-100',   dot: 'bg-blue-500' },
  future:   { label: 'עתידי',      bg: 'bg-slate-50',   text: 'text-slate-500',  border: 'border-slate-100',  dot: 'bg-slate-300' },
}

export const TAX_TYPE_CONFIG = {
  VAT:         { label: 'מע"מ',           icon: '🧾' },
  INCOME_TAX:  { label: 'מס הכנסה',       icon: '💰' },
  NI:          { label: 'ביטוח לאומי',    icon: '🏛️' },
  FORM_102:    { label: 'טופס 102',       icon: '📋' },
  ANNUAL:      { label: 'דוח שנתי',       icon: '📅' },
}

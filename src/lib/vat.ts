export const VAT_RATE = 0.18

export interface VATCalculation {
  net: number
  vat: number
  gross: number
}

export interface VATSummary {
  outputVAT: number   // מע"מ עסקאות (on sales)
  inputVAT: number    // מע"מ תשומות (on purchases)
  vatOwed: number     // לתשלום (+) / להחזר (-)
  totalRevenue: number
  totalExpenses: number
  periodLabel: string
}

export interface VATReportPeriod {
  start: Date
  end: Date
  label: string
}

/**
 * Calculate VAT components
 * @param amount - The amount to calculate VAT on
 * @param includesVAT - Whether the amount already includes VAT
 */
export function calculateVAT(amount: number, includesVAT: boolean = false): VATCalculation {
  if (includesVAT) {
    const net = amount / (1 + VAT_RATE)
    const vat = amount - net
    return { net: round2(net), vat: round2(vat), gross: round2(amount) }
  } else {
    const vat = amount * VAT_RATE
    const gross = amount + vat
    return { net: round2(amount), vat: round2(vat), gross: round2(gross) }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Format amount as Israeli Shekel
 */
export function formatILS(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date as DD/MM/YYYY (Israeli format)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Get VAT report period boundaries
 * @param date - Reference date within the period
 * @param period - MONTHLY or BIMONTHLY
 */
export function getVATReportPeriod(date: Date, period: 'MONTHLY' | 'BIMONTHLY'): VATReportPeriod {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() // 0-indexed

  if (period === 'MONTHLY') {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59)
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ]
    return {
      start,
      end,
      label: `${monthNames[month]} ${year}`,
    }
  } else {
    // BIMONTHLY - Israeli tax authority uses odd months: Jan-Feb, Mar-Apr, etc.
    const periodIndex = Math.floor(month / 2)
    const startMonth = periodIndex * 2
    const endMonth = startMonth + 1
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, endMonth + 1, 0, 23, 59, 59)
    const periodLabels = [
      'ינואר-פברואר',
      'מרץ-אפריל',
      'מאי-יוני',
      'יולי-אוגוסט',
      'ספטמבר-אוקטובר',
      'נובמבר-דצמבר',
    ]
    return {
      start,
      end,
      label: `${periodLabels[periodIndex]} ${year}`,
    }
  }
}

export interface InvoiceForVAT {
  total: number
  vatAmount: number
  subtotal: number
  status: string
  issueDate: Date | string
}

export interface TransactionForVAT {
  amount: number
  category: string | null
  date: Date | string
}

/**
 * Calculate VAT report summary from invoices and bank transactions
 */
export function calculateVATReport(
  invoices: InvoiceForVAT[],
  transactions: TransactionForVAT[],
  period: VATReportPeriod
): VATSummary {
  // Output VAT = VAT collected on sales (from paid/sent invoices)
  const paidInvoices = invoices.filter(
    (inv) => inv.status !== 'CANCELLED' && inv.status !== 'DRAFT'
  )
  const outputVAT = paidInvoices.reduce((sum, inv) => sum + inv.vatAmount, 0)
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.subtotal, 0)

  // Input VAT = VAT paid on business expenses
  const expenseTransactions = transactions.filter(
    (t) => t.amount < 0 && t.category === 'EXPENSE'
  )
  const totalExpenses = Math.abs(expenseTransactions.reduce((sum, t) => sum + t.amount, 0))
  const inputVAT = round2(totalExpenses * VAT_RATE) // Estimated; ideally from receipts

  const vatOwed = round2(outputVAT - inputVAT)

  return {
    outputVAT: round2(outputVAT),
    inputVAT: round2(inputVAT),
    vatOwed,
    totalRevenue: round2(totalRevenue),
    totalExpenses: round2(totalExpenses),
    periodLabel: period.label,
  }
}

/**
 * Get next VAT report due date
 */
export function getVATReportDueDate(periodEnd: Date): Date {
  const due = new Date(periodEnd)
  due.setDate(due.getDate() + 15) // Israel: 15th of following month
  return due
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(3, '0')}`
}

// Israeli Payroll Calculations 2025
// Sources: רשות המיסים, המוסד לביטוח לאומי, משרד העבודה

// ─── מדרגות מס הכנסה 2025 ─────────────────────────────────────────────────────
// מדרגות מס הכנסה 2025 — הוקפאו לשנים 2025–2027 (מקור: רשות המסים, ינואר 2025)
const TAX_BRACKETS = [
  { max: 7010,     rate: 0.10 },
  { max: 10060,    rate: 0.14 },
  { max: 16150,    rate: 0.20 },
  { max: 22440,    rate: 0.31 },
  { max: 46690,    rate: 0.35 },
  { max: 60130,    rate: 0.47 },
  { max: Infinity, rate: 0.50 },
]

// ─── קבועים 2025 ──────────────────────────────────────────────────────────────
export const TAX_CREDIT_POINT_VALUE   = 242      // ₪ לנקודת זיכוי לחודש (2025)
export const NI_LOW_THRESHOLD         = 7522      // 60% מהשכר הממוצע (2025)
export const NI_MONTHLY_CEILING       = 50695     // תקרת ביטוח לאומי חודשית (2025)
export const PENSION_EMPLOYEE_RATE    = 0.06      // 6% עובד
export const PENSION_EMPLOYER_RATE    = 0.065     // 6.5% מעסיק (תגמולים)
export const SEVERANCE_EMPLOYER_RATE  = 0.0833    // 8.33% מעסיק (פיצויים)
export const KEREN_EMPLOYEE_RATE      = 0.025     // 2.5% עובד קרן השתלמות
export const KEREN_EMPLOYER_RATE      = 0.075     // 7.5% מעסיק קרן השתלמות
export const KEREN_CEILING            = 15712     // תקרת הפקדה לקרן השתלמות

// ─── חישוב מס הכנסה ───────────────────────────────────────────────────────────
export function calculateIncomeTax(grossMonthly: number, creditPoints: number): number {
  let tax = 0
  let prevMax = 0

  for (const bracket of TAX_BRACKETS) {
    if (grossMonthly <= prevMax) break
    const taxableInBracket = Math.min(grossMonthly, bracket.max) - prevMax
    tax += taxableInBracket * bracket.rate
    prevMax = bracket.max
  }

  const credits = creditPoints * TAX_CREDIT_POINT_VALUE
  return Math.max(0, round2(tax - credits))
}

// ─── חישוב ביטוח לאומי ────────────────────────────────────────────────────────
export function calculateNationalInsurance(gross: number): {
  employee: number
  employer: number
} {
  const capped = Math.min(gross, NI_MONTHLY_CEILING)
  const low    = Math.min(capped, NI_LOW_THRESHOLD)
  const high   = Math.max(0, capped - NI_LOW_THRESHOLD)

  return {
    employee: round2(low * 0.035 + high * 0.12),
    employer: round2(low * 0.0355 + high * 0.076),
  }
}

// ─── חישוב מס בריאות ──────────────────────────────────────────────────────────
export function calculateHealthTax(gross: number): number {
  const low  = Math.min(gross, NI_LOW_THRESHOLD)
  const high = Math.max(0, gross - NI_LOW_THRESHOLD)
  return round2(low * 0.031 + high * 0.05)
}

// ─── חישוב פנסיה ──────────────────────────────────────────────────────────────
export function calculatePension(gross: number): {
  employee: number
  pensionEmployer: number
  severanceEmployer: number
  total: number
} {
  const employee         = round2(gross * PENSION_EMPLOYEE_RATE)
  const pensionEmployer  = round2(gross * PENSION_EMPLOYER_RATE)
  const severanceEmployer = round2(gross * SEVERANCE_EMPLOYER_RATE)
  return {
    employee,
    pensionEmployer,
    severanceEmployer,
    total: round2(employee + pensionEmployer + severanceEmployer),
  }
}

// ─── חישוב קרן השתלמות ───────────────────────────────────────────────────────
export function calculateKeren(gross: number): {
  employee: number
  employer: number
} {
  const base = Math.min(gross, KEREN_CEILING)
  return {
    employee: round2(base * KEREN_EMPLOYEE_RATE),
    employer: round2(base * KEREN_EMPLOYER_RATE),
  }
}

// ─── חישוב מלא לעובד ─────────────────────────────────────────────────────────
export interface PayrollInput {
  grossSalary: number
  bonus?: number
  taxCreditPoints?: number
  includePension?: boolean
  includeKeren?: boolean
  workDays?: number
  vacationDays?: number
  sickDays?: number
}

export interface PayrollResult {
  grossSalary: number
  bonus: number
  totalGross: number
  // ניכויי עובד
  incomeTax: number
  nationalInsEmp: number
  healthTaxEmp: number
  pensionEmp: number
  kerenEmp: number
  totalDeductions: number
  netSalary: number
  // עלות מעסיק
  nationalInsEmployer: number
  pensionEmployer: number
  severanceEmployer: number
  kerenEmployer: number
  totalEmployerAdditions: number
  totalEmployerCost: number
  // פירוט
  breakdown: {
    label: string
    employee: number | null
    employer: number | null
    note?: string
  }[]
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const {
    grossSalary,
    bonus = 0,
    taxCreditPoints = 2.25,
    includePension = true,
    includeKeren = false,
  } = input

  const totalGross = grossSalary + bonus

  const incomeTax     = calculateIncomeTax(totalGross, taxCreditPoints)
  const ni            = calculateNationalInsurance(totalGross)
  const healthTax     = calculateHealthTax(totalGross)
  const pension       = includePension ? calculatePension(grossSalary) : { employee: 0, pensionEmployer: 0, severanceEmployer: 0, total: 0 }
  const keren         = includeKeren   ? calculateKeren(grossSalary)   : { employee: 0, employer: 0 }

  const totalDeductions = round2(
    incomeTax + ni.employee + healthTax + pension.employee + keren.employee
  )
  const netSalary = round2(totalGross - totalDeductions)

  const totalEmployerAdditions = round2(
    ni.employer + pension.pensionEmployer + pension.severanceEmployer + keren.employer
  )
  const totalEmployerCost = round2(totalGross + totalEmployerAdditions)

  const breakdown = [
    { label: 'שכר ברוטו', employee: grossSalary, employer: null },
    ...(bonus > 0 ? [{ label: 'בונוס', employee: bonus, employer: null }] : []),
    { label: 'מס הכנסה', employee: -incomeTax, employer: null },
    { label: 'ביטוח לאומי', employee: -ni.employee, employer: ni.employer },
    { label: 'מס בריאות', employee: -healthTax, employer: null },
    ...(includePension ? [
      { label: 'פנסיה תגמולים', employee: -pension.employee, employer: pension.pensionEmployer },
      { label: 'פיצויים (מעסיק)', employee: null, employer: pension.severanceEmployer },
    ] : []),
    ...(includeKeren ? [
      { label: 'קרן השתלמות', employee: -keren.employee, employer: keren.employer, note: `תקרה: ₪${KEREN_CEILING.toLocaleString()}` },
    ] : []),
    { label: 'שכר נטו', employee: netSalary, employer: null },
    { label: 'עלות מעסיק', employee: null, employer: totalEmployerCost },
  ]

  return {
    grossSalary,
    bonus,
    totalGross,
    incomeTax,
    nationalInsEmp: ni.employee,
    healthTaxEmp: healthTax,
    pensionEmp: pension.employee,
    kerenEmp: keren.employee,
    totalDeductions,
    netSalary,
    nationalInsEmployer: ni.employer,
    pensionEmployer: pension.pensionEmployer,
    severanceEmployer: pension.severanceEmployer,
    kerenEmployer: keren.employer,
    totalEmployerAdditions,
    totalEmployerCost,
    breakdown,
  }
}

// ─── עזרים ────────────────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatILS(n: number): string {
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `-₪${formatted}` : `₪${formatted}`
}

export function getMonthName(month: number): string {
  const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  return names[month - 1] || ''
}

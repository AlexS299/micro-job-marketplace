/**
 * Israeli Tax & Accounting Knowledge Base — 2025–2026
 * Sources: רשות המסים, ביטוח לאומי, משרד העבודה, PwC, KPMG, Herzog Law
 * Last updated: May 2026
 */

// ─── מע"מ (VAT) ───────────────────────────────────────────────────────────────

export const VAT = {
  rate: 0.18,                     // 18% מינואר 2025 (היה 17% עד דצמבר 2024)
  osekPaturThreshold: 120000,     // עוסק פטור עד 120,000 ₪ (122,833 ₪ מ-2026)
  osekPaturThreshold2026: 122833,
  bimonthlyThreshold: 1510000,    // עד 1.51M ₪ — דיווח דו-חודשי; מעל — חודשי
  detailedPCNThreshold: 500000,   // מ-2026: PCN מפורט מעל 500K ₪
  lateFilingPenaltyPer2Weeks: 239, // ₪239 לכל 2 שבועות איחור

  // חשבונית ישראל — מספר הקצאה (Allocation Number)
  allocationNumber: {
    threshold2025: 20000,          // מ-1/1/2025: חשבוניות מעל 20,000 ₪ לפני מע"מ
    threshold2026Jan: 10000,       // מ-1/1/2026: 10,000 ₪
    threshold2026Jun: 5000,        // מ-1/6/2026: 5,000 ₪
  },

  // Input VAT deductibility rules
  inputVATRules: {
    passengerCarPurchase: 0,        // 0% — רכב פרטי: אין ניכוי מע"מ על קנייה
    passengerCarOperating: 2/3,     // 2/3 על הוצאות תפעול (דלק, תיקונים)
    commercialVehicle: 1,           // 100% — רכב מסחרי מעל 3.5 טון
    employeeMeals: 0,               // 0% — ארוחות עובדים חסומות (תקנה 15א)
    employeeGifts: 0,               // 0% — מתנות לעובדים חסומות
    entertainment: 0,               // 0% — בידור חסום (למעט אורחים זרים)
    mobilePhone: 0.5,               // 50% — טלפון נייד (שימוש מעורב)
  },

  // Exempt transactions
  exemptions: [
    'השכרת דירה למגורים (עד 25 שנה)',
    'שירותי בנקאות ופיננסים (ממוסים במס שכר ורווח 18%)',
    'עמותות — פעילות ציבורית (ממוסות במס שכר 7.5%)',
    'אזור אילת החופשי',
    'מקרקעין — עסקאות יד שנייה בין פרטיים',
  ],

  // Zero-rated transactions
  zeroRated: [
    'יצוא טובין',
    'שירותים לתושב חוץ (סעיף 30(א)(5)) — בתנאים',
    'הובלה בינלאומית',
    'שירות לנציגות דיפלומטית',
  ],
}

// ─── מס הכנסה (Income Tax) ────────────────────────────────────────────────────

export const INCOME_TAX = {
  // מדרגות מס 2025 (הוקפאו לשנים 2025–2027) — שנתי
  bracketsAnnual: [
    { max: 84120,   rate: 0.10 },
    { max: 120720,  rate: 0.14 },
    { max: 193800,  rate: 0.20 },
    { max: 269280,  rate: 0.31 },
    { max: 560280,  rate: 0.35 },
    { max: 721560,  rate: 0.47 },
    { max: Infinity, rate: 0.50 }, // 47% + 3% מס יסף
  ],

  // מדרגות חודשיות
  bracketsMonthly: [
    { max: 7010,    rate: 0.10 },
    { max: 10060,   rate: 0.14 },
    { max: 16150,   rate: 0.20 },
    { max: 22440,   rate: 0.31 },
    { max: 46690,   rate: 0.35 },
    { max: 60130,   rate: 0.47 },
    { max: Infinity, rate: 0.50 },
  ],

  // מס יסף (Surtax)
  surtaxThresholdAnnual: 721560,  // 3% על כל הכנסה מעל סף זה
  surtaxRate: 0.03,
  passiveIncomeSurtaxExtra: 0.02, // +2% נוסף מ-2025 על הכנסות פאסיביות מעל הסף

  // נקודות זיכוי
  taxCreditPointMonthly: 242,     // ₪242 לנקודה לחודש (₪2,904 לשנה)
  taxCreditPointAnnual: 2904,
  baseCreditPointsMale: 2.25,
  baseCreditPointsFemale: 2.75,

  // מס חברות
  corporateTaxRate: 0.23,         // 23% (2025)
  dividendTaxMinority: 0.25,      // 25% — מחזיק פחות מ-10%
  dividendTaxControlling: 0.30,   // 30% — מחזיק 10%+ (שנה קודמת)

  // מפעל מועדף
  preferredEnterprise: 0.16,      // 16%
  preferredEnterpriseZoneA: 0.075, // 7.5% — אזור פיתוח א'
  preferredTechEnterprise: 0.12,  // 12%
  preferredTechEnterpriseZoneA: 0.075,

  // הוצאות מוכרות
  deductibleExpenses: {
    car: 0.45,                    // 45% — הוצאות רכב פרטי
    carDepreciation: 0.15,        // 15%/שנה פחת רכב
    phone: 0.50,                  // 50% — טלפון נייד
    meals: 0.80,                  // 80% — ארוחות עסקיות (עם לקוח)
    giftPerPerson: 210,           // ₪210 מתנות ללקוח לשנה
  },

  // שיעורי פחת (Depreciation Rates)
  depreciationRates: {
    computer: 0.33,               // 33%/שנה
    software: 0.33,               // 33%/שנה
    car: 0.15,                    // 15%/שנה
    furniture: 0.07,              // 7%/שנה
    airConditioner: 0.15,         // 15%/שנה
    machinery: 0.20,              // 20%/שנה
    building: 0.02,               // 2%/שנה
    goodwill: 0.10,               // 10%/שנה
  },

  // עוסק זעיר (New 2025 — micro business reform)
  osekZairThreshold: 120000,      // ₪120,000 מחזור שנתי
  osekZairAutoDeduction: 0.30,    // 30% ניכוי אוטומטי ללא קבלות

  // שיעורי ניכוי מס במקור
  withholdingTaxDefault: 0.30,    // 30% ללא אישור
  withholdingTaxDividend: 0.25,   // 25% דיבידנד
  withholdingTaxInterest: 0.25,   // 25% ריבית
  withholdingTaxRoyalties: 0.23,  // 23% תמלוגים

  // מועדי הגשה לשנת מס 2025
  filingDeadlines: {
    individualPaper: '2026-04-30',
    individualOnline: '2026-05-31',
    corporationsAndControlling: '2026-07-30',
  },
}

// ─── ביטוח לאומי (National Insurance) 2025 ────────────────────────────────────

export const NATIONAL_INSURANCE = {
  averageWage: 13316,             // שכר ממוצע חודשי 2025
  lowThreshold: 7522,             // 60% מהשכר הממוצע
  monthlyCeiling: 50695,          // תקרה חודשית

  // שכיר (Employee)
  employee: {
    niRateLow: 0.004,             // 0.4% — עד הסף
    niRateHigh: 0.070,            // 7.0% — מעל הסף
    healthRateLow: 0.031,         // 3.1% — עד הסף
    healthRateHigh: 0.050,        // 5.0% — מעל הסף
    totalLow: 0.035,              // 3.5% סה"כ עד הסף
    totalHigh: 0.120,             // 12.0% סה"כ מעל הסף
  },

  // מעסיק (Employer)
  employer: {
    rateLow: 0.0355,              // 3.55% — עד הסף
    rateHigh: 0.076,              // 7.6% — מעל הסף
  },

  // עצמאי (Self-Employed) — מ-פברואר 2025 לאחר תיקון 252
  selfEmployed: {
    niRateLow: 0.0447,            // 4.47% — עד 60% שכר ממוצע
    niRateHigh: 0.1283,           // 12.83% — מעל
    healthRateLow: 0.0323,        // 3.23%
    healthRateHigh: 0.0517,       // 5.17%
    totalLow: 0.077,              // ~7.7%
    totalHigh: 0.180,             // ~18%
  },
}

// ─── שכר מינימום (Minimum Wage) ───────────────────────────────────────────────

export const MINIMUM_WAGE = {
  monthly_jan_mar_2025: 5880,
  monthly_apr_2025: 6247.67,      // מ-1 באפריל 2025 (+6.25%)
  monthly_apr_2026: 6443.85,      // מ-1 באפריל 2026 (מתוכנן)
  hourly_apr_2025: 34.32,
}

// ─── פנסיה וקרן השתלמות ───────────────────────────────────────────────────────

export const PENSION_KEREN = {
  pension: {
    employeeRate: 0.06,           // 6% עובד
    employerRate: 0.065,          // 6.5% מעסיק (תגמולים)
    severanceRate: 0.0833,        // 8.33% מעסיק (פיצויים — סעיף 14)
  },
  kerenHishtalmut: {
    employeeRate: 0.025,          // 2.5% עובד
    employerRate: 0.075,          // 7.5% מעסיק
    salaryCeiling: 15712,         // תקרת שכר ₪15,712 לחודש (הטבת מס)
    selfEmployedMaxDeductible: 13203, // ₪13,203/שנה ניכוי מס עצמאי (4.5% מהכנסה)
    selfEmployedIncomeLimit: 293400,  // תקרת הכנסה לניכוי
    withdrawalYears: 6,           // נזילה אחרי 6 שנים (3 שנים לצורך השתלמות)
  },
}

// ─── שכר (Payroll) ────────────────────────────────────────────────────────────

export const PAYROLL = {
  // ימי חופשה (Annual Leave) — עפ"י חוק חופשה שנתית
  vacationDays: [
    { yearsMin: 1,  yearsMax: 4,  days: 12 },
    { yearsMin: 5,  yearsMax: 5,  days: 14 },
    { yearsMin: 6,  yearsMax: 10, days: 16 },
    { yearsMin: 11, yearsMax: 15, days: 18 },
    { yearsMin: 16, yearsMax: 19, days: 20 },
    { yearsMin: 20, yearsMax: Infinity, days: 24 },
  ],

  // מחלה (Sick Leave)
  sickLeave: {
    accrualPerMonth: 1.5,         // 1.5 ימים לחודש = 18 ימים/שנה
    maxAccumulation: 90,          // מקסימום 90 ימים
    day1Pay: 0,                   // יום 1 — ללא תשלום
    days2_3Pay: 0.50,             // ימים 2-3 — 50%
    day4PlusPayRate: 1.00,        // יום 4 ואילך — 100%
  },

  // דמי הבראה (Recuperation Pay) 2025 — הוקפאו
  recuperationPay: {
    dailyRatePrivate: 418,        // ₪418/יום — מגזר פרטי (הוקפא)
    dailyRatePublic: 471.40,      // ₪471.40/יום — מגזר ציבורי
    daysTable: [
      { yearsMin: 1,  yearsMax: 1,  days: 5 },
      { yearsMin: 2,  yearsMax: 3,  days: 6 },
      { yearsMin: 4,  yearsMax: 10, days: 7 },
      { yearsMin: 11, yearsMax: 15, days: 8 },
      { yearsMin: 16, yearsMax: 19, days: 9 },
      { yearsMin: 20, yearsMax: Infinity, days: 10 },
    ],
    // 2025 special: one day deducted per employee for IDF reservists
    deductOneDayForReservists2025: true,
  },

  // נסיעות (Commute Reimbursement)
  commuteMaxPerDay: 26.40,        // ₪26.40 ליום (עדכון אפריל 2025)

  // Form 102 — monthly employer report to Bituach Leumi
  form102DueDay: 15,              // ה-15 לחודש שלאחר החודש המדווח
}

// ─── ניהול ספרים וחשבוניות ────────────────────────────────────────────────────

export const BOOKKEEPING = {
  // סוגי מסמכים
  documentTypes: {
    TAX_INVOICE: 'חשבונית מס',
    TAX_INVOICE_RECEIPT: 'חשבונית מס/קבלה',
    TRANSACTION_INVOICE: 'חשבונית עסקה',
    RECEIPT: 'קבלה',
    CREDIT_NOTE: 'חשבונית זיכוי',
    PROFORMA: 'חשבון',
    CONSOLIDATED: 'מסמך איחוד חשבוניות',
  },

  // שמירת מסמכים (Retention)
  retentionYears: 7,              // 7 שנים מסוף שנת המס (או 6 שנים מהגשת הדוח)

  // מגבלת מזומן (Cash Limit Law)
  cashLimitBusiness: 6000,        // ₪6,000 לעסקה — עסקים
  cashLimitIndividual: 15000,     // ₪15,000 לעסקה — פרטיים

  // תקופת ספירת מלאי (Inventory Count Window)
  inventoryCountStart: 'December 20',
  inventoryCountEnd: 'January 10',

  // שיטות הנהלת חשבונות
  methods: {
    SINGLE_ENTRY: 'חד-צידי',      // לעסקים קטנים
    DOUBLE_ENTRY: 'כפול',          // חובה לחברות בע"מ ומעל סף
  },
  doubleEntryThreshold: 3800000,  // ~₪3.8M מחזור — חובת חד"צ ליצרנים/סיטונאים
}

// ─── מבני עסק (Business Structures) ─────────────────────────────────────────

export const BUSINESS_STRUCTURES = {
  OSEK_PATUR: {
    nameHe: 'עוסק פטור',
    annualTurnoverLimit: 120000,  // ₪120,000
    vatExempt: true,
    liabilityUnlimited: true,
    taxedAt: 'personal_rates',
  },
  OSEK_MURSHEH: {
    nameHe: 'עוסק מורשה',
    vatRegistered: true,
    liabilityUnlimited: true,
    taxedAt: 'personal_rates',
    filingRequirements: ['VAT_PERIODIC', 'ANNUAL_RETURN', 'ADVANCE_PAYMENTS'],
  },
  COMPANY_LTD: {
    nameHe: 'חברה בע"מ',
    corporateTaxRate: 0.23,
    dividendTax: 0.25,           // minority
    dividendTaxControlling: 0.30,
    liabilityLimited: true,
    // 2025 reform: undistributed profits tax 2%/year (unless distributing 5% of accumulated)
    undistributedProfitsTax2025: 0.02,
    // Personal service companies: >25% profitability → excess taxed at owner's personal rate
    personalServiceExcessThreshold: 0.25,
  },
  PARTNERSHIP: {
    nameHe: 'שותפות',
    taxTransparent: true,        // שקופה לצרכי מס
  },
  AMUTA: {
    nameHe: 'עמותה',
    taxExemptPublicActivity: true,
    wageTaxRate: 0.075,          // 7.5% מס שכר על פעילות לא עסקית
    donorTaxCreditRate: 0.35,    // 35% זיכוי ממס לתורמים
  },
}

// ─── לוח מועדים מרכזי 2025–2026 ──────────────────────────────────────────────

export const TAX_CALENDAR = {
  vatReportDueDay: 15,            // ה-15 לחודש שלאחר התקופה (19 מקוון)
  advancePaymentDueDay: 15,       // ה-15 לכל חודש
  form102DueDay: 15,              // ה-15 לחודש שלאחר החודש
  form106DueDate: 'March 31',     // 31 מרץ — תלוש 106 שנתי
  vatAnnualSummaryDue: 'April 30',
  annualReturnIndividualPaper: 'April 30, 2026',
  annualReturnIndividualOnline: 'May 31, 2026',
  annualReturnCorporation: 'July 30, 2026', // extended 2025 tax year

  // מע"מ — תאריכים ספציפיים לפי תקופה
  allocationNumberThresholdChange2026Jan: '2026-01-01', // ₪20K → ₪10K
  allocationNumberThresholdChange2026Jun: '2026-06-01', // ₪10K → ₪5K
  pcnDetailedReportingExpansion: '2026-01-01',          // PCN מפורט מ-₪500K
}

// ─── נדל"ן (Real Estate) ──────────────────────────────────────────────────────

export const REAL_ESTATE_TAX = {
  masShevach: 0.25,               // 25% — מס שבח (לא פטור)
  masShevachPrimaryResidenceExemptionCap: 5008000, // פטור עד ₪5,008,000

  // מס רכישה — דירה יחידה (2025–2027 מוקפאות)
  masRechishaPrimaryBrackets: [
    { max: 1919155,  rate: 0 },
    { max: 2276360,  rate: 0.035 },
    { max: 5872725,  rate: 0.05 },
    { max: 19575000, rate: 0.08 },
    { max: Infinity, rate: 0.10 },
  ],

  // מס רכישה — דירה נוספת/משקיע
  masRechishaInvestorRate1: 0.08, // 8% על 6,055,070 ₪ הראשונים
  masRechishaInvestorRate2: 0.10, // 10% מעל

  // הכנסה משכירות
  rentalExemptionMonthly: 5654,   // ₪5,654/חודש פטורים ממס
  rentalFlatRate: 0.10,           // מסלול 10% על שכר דירה ברוטו
}

// ─── הטבות מיוחדות ────────────────────────────────────────────────────────────

export const SPECIAL_BENEFITS = {
  newImmigrant: {
    foreignIncomeExemptYears: 10,
    // 2026 new law: Israeli income exempt up to ₪1M/year for first 2 years
    israeliIncomeExemption2026: [
      { year: 1, limit: 1000000 },
      { year: 2, limit: 1000000 },
      { year: 3, limit: 600000 },
      { year: 4, limit: 350000 },
      { year: 5, limit: 150000 },
    ],
  },
  highTech2025: {
    carriedInterestRate: 0.27,    // 27% carried interest (במקום עד 50%)
    mergerRatio: '1:19',          // תיקון 279 — יחס גודל מיזוג
    ipValuationSafeHarbor: 0.85,  // 85% ממחיר המכירה = IP value
  },
}

// ─── Helper: חישוב מס הכנסה שנתי לעצמאי ─────────────────────────────────────

export function estimateAnnualIncomeTax(annualIncome: number, creditPoints: number = 2.25): number {
  let tax = 0
  let prev = 0
  for (const b of INCOME_TAX.bracketsAnnual) {
    if (annualIncome <= prev) break
    tax += (Math.min(annualIncome, b.max) - prev) * b.rate
    prev = b.max
  }
  const credits = creditPoints * INCOME_TAX.taxCreditPointAnnual
  return Math.max(0, Math.round((tax - credits) * 100) / 100)
}

// ─── Helper: סיכום עלות מעסיק ────────────────────────────────────────────────

export function estimateEmployerCost(grossSalary: number, withKeren = false): {
  pension: number
  severance: number
  ni: number
  keren: number
  recuperation: number
  total: number
  totalPercent: number
} {
  const low  = Math.min(grossSalary, NATIONAL_INSURANCE.lowThreshold)
  const high = Math.max(0, Math.min(grossSalary, NATIONAL_INSURANCE.monthlyCeiling) - NATIONAL_INSURANCE.lowThreshold)
  const ni   = Math.round((low * NATIONAL_INSURANCE.employer.rateLow + high * NATIONAL_INSURANCE.employer.rateHigh) * 100) / 100
  const pension    = Math.round(grossSalary * PENSION_KEREN.pension.employerRate * 100) / 100
  const severance  = Math.round(grossSalary * PENSION_KEREN.pension.severanceRate * 100) / 100
  const keren      = withKeren ? Math.round(Math.min(grossSalary, PENSION_KEREN.kerenHishtalmut.salaryCeiling) * PENSION_KEREN.kerenHishtalmut.employerRate * 100) / 100 : 0
  const recuperation = Math.round((PAYROLL.recuperationPay.dailyRatePrivate * 7 / 12) * 100) / 100 // ~₪244/month amortized
  const total = pension + severance + ni + keren + recuperation
  return { pension, severance, ni, keren, recuperation, total: Math.round(total * 100) / 100, totalPercent: Math.round(total / grossSalary * 1000) / 10 }
}

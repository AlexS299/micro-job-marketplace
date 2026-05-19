// SaaS Plans — Israeli pricing in ILS
// All limits: -1 = unlimited

export type PlanId = 'FREE' | 'PRO' | 'BUSINESS'

export interface PlanFeatures {
  invoicesPerMonth: number
  employees: number
  aiAlerts: boolean
  whatsappBot: boolean
  openBanking: boolean
  multiUser: boolean
  maxUsers: number
  advancedReports: boolean
  prioritySupport: boolean
  apiAccess: boolean
}

export interface Plan {
  id: PlanId
  name: string
  price: number
  yearlyPrice: number
  description: string
  stripePriceIdMonthly?: string
  stripePriceIdYearly?: string
  features: PlanFeatures
  highlight?: boolean
  badge?: string
}

export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: 'FREE',
    name: 'חינמי',
    price: 0,
    yearlyPrice: 0,
    description: 'להתחיל לנהל את העסק',
    features: {
      invoicesPerMonth: 10,
      employees: 2,
      aiAlerts: false,
      whatsappBot: false,
      openBanking: false,
      multiUser: false,
      maxUsers: 1,
      advancedReports: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  PRO: {
    id: 'PRO',
    name: 'פרו',
    price: 99,
    yearlyPrice: 79,
    description: 'לפרילנסרים ועצמאיים',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    highlight: true,
    badge: 'הכי פופולרי',
    features: {
      invoicesPerMonth: -1,
      employees: 5,
      aiAlerts: true,
      whatsappBot: true,
      openBanking: true,
      multiUser: false,
      maxUsers: 1,
      advancedReports: true,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'עסקי',
    price: 249,
    yearlyPrice: 199,
    description: 'לעסקים עם צוות',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    stripePriceIdYearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
    features: {
      invoicesPerMonth: -1,
      employees: -1,
      aiAlerts: true,
      whatsappBot: true,
      openBanking: true,
      multiUser: true,
      maxUsers: 10,
      advancedReports: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
}

export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] ?? PLANS.FREE
}

export function canUseFeature(plan: Plan, feature: keyof PlanFeatures): boolean {
  const val = plan.features[feature]
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val !== 0
  return false
}

export function isWithinLimit(plan: Plan, feature: 'invoicesPerMonth' | 'employees' | 'maxUsers', current: number): boolean {
  const limit = plan.features[feature]
  if (limit === -1) return true
  return current < limit
}

export function formatPrice(price: number): string {
  if (price === 0) return 'חינם'
  return `₪${price}`
}

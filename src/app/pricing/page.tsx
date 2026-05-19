'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Zap, Building2, Gift } from 'lucide-react'
import { PLANS, type PlanId, formatPrice } from '@/lib/plans'
import clsx from 'clsx'

const FEATURE_ROWS = [
  { key: 'invoicesPerMonth', label: 'חשבוניות לחודש' },
  { key: 'employees', label: 'עובדים' },
  { key: 'aiAlerts', label: 'התראות AI חכמות' },
  { key: 'whatsappBot', label: 'WhatsApp Bot' },
  { key: 'openBanking', label: 'חיבור בנקאות פתוחה' },
  { key: 'advancedReports', label: 'דוחות מתקדמים' },
  { key: 'multiUser', label: 'מספר משתמשים' },
  { key: 'prioritySupport', label: 'תמיכה מועדפת' },
  { key: 'apiAccess', label: 'גישת API' },
] as const

function featureValue(plan: (typeof PLANS)[PlanId], key: string): string | boolean | number {
  const features = plan.features as unknown as Record<string, unknown>
  const val = features[key]
  if (key === 'invoicesPerMonth' || key === 'employees' || key === 'maxUsers') {
    if (val === -1) return 'ללא הגבלה'
    return String(val)
  }
  return val as boolean
}

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<PlanId | null>(null)

  async function selectPlan(planId: PlanId) {
    if (planId === 'FREE') { router.push('/dashboard'); return }
    setLoading(planId)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, billing }),
    })
    const data = await res.json() as { url?: string }
    if (data.url) window.location.href = data.url
    setLoading(null)
  }

  const plans = Object.values(PLANS)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" dir="rtl">
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">תמחור פשוט ושקוף</h1>
          <p className="text-xl text-gray-500 mb-8">ניהול עסק חכם — מתחילים בחינם</p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={clsx('px-5 py-2 rounded-full text-sm font-medium transition-all', billing === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
            >
              חודשי
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={clsx('px-5 py-2 rounded-full text-sm font-medium transition-all', billing === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
            >
              שנתי
              <span className="mr-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">חסוך 20%</span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {plans.map(plan => {
            const price = billing === 'yearly' ? plan.yearlyPrice : plan.price
            return (
              <div
                key={plan.id}
                className={clsx(
                  'relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md',
                  plan.highlight ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-200'
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3.5 right-6 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {plan.id === 'FREE' && <Gift className="w-5 h-5 text-gray-400" />}
                    {plan.id === 'PRO' && <Zap className="w-5 h-5 text-indigo-600" />}
                    {plan.id === 'BUSINESS' && <Building2 className="w-5 h-5 text-purple-600" />}
                    <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                  </div>
                  <p className="text-gray-500 text-sm">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-gray-900">{formatPrice(price)}</span>
                  {price > 0 && <span className="text-gray-500 text-sm mr-1">/ חודש</span>}
                  {billing === 'yearly' && price > 0 && (
                    <p className="text-green-600 text-xs mt-1">חיוב שנתי — ₪{price * 12} / שנה</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {FEATURE_ROWS.map(row => {
                    const val = featureValue(plan, row.key)
                    const hasIt = val !== false && val !== '0'
                    return (
                      <li key={row.key} className="flex items-center gap-2.5 text-sm">
                        <Check className={clsx('w-4 h-4 shrink-0', hasIt ? 'text-green-500' : 'text-gray-200')} />
                        <span className={hasIt ? 'text-gray-700' : 'text-gray-300'}>
                          {row.label}
                          {typeof val === 'string' && val !== 'true' && (
                            <span className="text-gray-400 mr-1">({val})</span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <button
                  onClick={() => selectPlan(plan.id)}
                  disabled={loading === plan.id}
                  className={clsx(
                    'w-full py-3 rounded-xl text-sm font-semibold transition-colors',
                    plan.highlight
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : plan.id === 'BUSINESS'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  )}
                >
                  {loading === plan.id ? 'מעבד...' : plan.id === 'FREE' ? 'התחל בחינם' : `בחר ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 text-lg">השוואת תכונות</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-4 px-8 font-medium text-gray-500 w-1/2">תכונה</th>
                  {plans.map(p => (
                    <th key={p.id} className="py-4 px-6 font-semibold text-gray-800 text-center">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {FEATURE_ROWS.map(row => (
                  <tr key={row.key} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-8 text-gray-600">{row.label}</td>
                    {plans.map(plan => {
                      const val = featureValue(plan, row.key)
                      return (
                        <td key={plan.id} className="py-3.5 px-6 text-center">
                          {val === true ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            </span>
                          ) : val === false ? (
                            <span className="text-gray-200">—</span>
                          ) : (
                            <span className="text-gray-700 font-medium">{String(val)}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trust Bar */}
        <div className="mt-16 text-center text-sm text-gray-400 space-y-2">
          <p>ניסיון חינם 14 יום בכל תוכנית בתשלום · ביטול בכל עת · חיוב בשקלים · תמיכה בעברית</p>
          <p>מאובטח עם Stripe · PCI DSS Compliant · נתונים מאוחסנים בישראל</p>
        </div>
      </div>
    </div>
  )
}

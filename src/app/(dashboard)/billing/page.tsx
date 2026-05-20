'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Zap, Building2, Gift, ExternalLink, AlertCircle, TrendingUp, FileText, Users, Loader2 } from 'lucide-react'
import { PLANS, getPlan, type PlanId, formatPrice } from '@/lib/plans'
import clsx from 'clsx'
import Link from 'next/link'

interface SubData {
  plan: PlanId
  subscription: {
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    trialEndsAt: string | null
  } | null
  planDetails: ReturnType<typeof getPlan>
  usage: {
    invoicesThisMonth: number
    invoicesLimit: number
    totalInvoices: number
    totalEmployees: number
    employeesLimit: number
  }
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit === -1 ? 0 : Math.min(100, (used / limit) * 100)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-800">{used} / {limit === -1 ? '∞' : limit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        {limit !== -1 && <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />}
        {limit === -1 && <div className="h-full rounded-full bg-indigo-200" style={{ width: '10%' }} />}
      </div>
    </div>
  )
}

function BillingPageInner() {
  const params = useSearchParams()
  const [data, setData] = useState<SubData | null>(null)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)

  const success = params.get('success')
  const cancelled = params.get('cancelled')

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
  }, [])

  async function openPortal() {
    setLoadingPortal(true)
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const { url } = await res.json() as { url: string }
    window.location.href = url
  }

  async function upgrade(planId: PlanId) {
    setLoadingPlan(planId)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const { url } = await res.json() as { url: string }
    window.location.href = url
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const { plan, subscription, usage } = data
  const currentPlan = getPlan(plan)
  const isActive = !subscription || subscription.status === 'active' || subscription.status === 'trialing'
  const isTrial = subscription?.status === 'trialing'
  const trialEnd = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir="rtl">
      {/* Banners */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-3.5 text-green-800">
          <Check className="w-5 h-5 text-green-500" />
          <span className="font-medium">שדרוג בוצע בהצלחה! מסלול {currentPlan.name} פעיל.</span>
        </div>
      )}
      {cancelled && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span>התשלום בוטל. ניתן לנסות שוב בכל עת.</span>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-indigo-50 to-blue-50 px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {plan === 'FREE' && <Gift className="w-6 h-6 text-gray-500" />}
              {plan === 'PRO' && <Zap className="w-6 h-6 text-indigo-600" />}
              {plan === 'BUSINESS' && <Building2 className="w-6 h-6 text-purple-600" />}
              <div>
                <h2 className="font-bold text-gray-900 text-lg">מסלול {currentPlan.name}</h2>
                {isTrial && trialEnd && (
                  <p className="text-sm text-indigo-600">ניסיון חינם — מסתיים {trialEnd.toLocaleDateString('he-IL')}</p>
                )}
                {!isTrial && periodEnd && plan !== 'FREE' && (
                  <p className="text-sm text-gray-500">
                    {subscription?.cancelAtPeriodEnd ? 'מבוטל — פעיל עד ' : 'חידוש אוטומטי '}
                    {periodEnd.toLocaleDateString('he-IL')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                {isActive ? 'פעיל' : 'לא פעיל'}
              </span>
              {plan !== 'FREE' && (
                <button
                  onClick={openPortal}
                  disabled={loadingPortal}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  נהל מנוי
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm">שימוש החודש</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">חשבוניות החודש</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{usage.invoicesThisMonth}</p>
              <p className="text-xs text-gray-400 mt-0.5">מתוך {usage.invoicesLimit === -1 ? '∞' : usage.invoicesLimit}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">עובדים</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{usage.totalEmployees}</p>
              <p className="text-xs text-gray-400 mt-0.5">מתוך {usage.employeesLimit === -1 ? '∞' : usage.employeesLimit}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">סה"כ חשבוניות</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{usage.totalInvoices}</p>
            </div>
          </div>

          <div className="space-y-3">
            <UsageBar used={usage.invoicesThisMonth} limit={usage.invoicesLimit} label="חשבוניות לחודש" />
            <UsageBar used={usage.totalEmployees} limit={usage.employeesLimit} label="עובדים" />
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      {plan !== 'BUSINESS' && (
        <div>
          <h2 className="font-bold text-gray-900 text-lg mb-4">שדרג את המסלול</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(PLANS)
              .filter(p => p.price > currentPlan.price)
              .map(p => (
                <div key={p.id} className={clsx('bg-white border rounded-2xl p-6 shadow-sm', p.highlight ? 'border-indigo-300' : 'border-gray-200')}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {p.id === 'PRO' && <Zap className="w-5 h-5 text-indigo-600" />}
                      {p.id === 'BUSINESS' && <Building2 className="w-5 h-5 text-purple-600" />}
                      <h3 className="font-bold text-gray-900">{p.name}</h3>
                      {p.badge && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{p.badge}</span>}
                    </div>
                    <span className="text-xl font-bold text-gray-900">{formatPrice(p.price)}<span className="text-sm text-gray-400 font-normal">/חודש</span></span>
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {p.features.aiAlerts && <li className="text-sm text-gray-600 flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-500" />התראות AI</li>}
                    {p.features.whatsappBot && <li className="text-sm text-gray-600 flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-500" />WhatsApp Bot</li>}
                    {p.features.openBanking && <li className="text-sm text-gray-600 flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-500" />בנקאות פתוחה</li>}
                    {p.features.multiUser && <li className="text-sm text-gray-600 flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-500" />עד {p.features.maxUsers} משתמשים</li>}
                    {p.features.prioritySupport && <li className="text-sm text-gray-600 flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-500" />תמיכה מועדפת</li>}
                  </ul>
                  <button
                    onClick={() => upgrade(p.id)}
                    disabled={loadingPlan === p.id}
                    className={clsx(
                      'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors',
                      p.highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-purple-600 text-white hover:bg-purple-700'
                    )}
                  >
                    {loadingPlan === p.id ? 'מעבד...' : `שדרג ל-${p.name} — ניסיון 14 יום`}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Link to pricing */}
      <div className="text-center">
        <Link href="/pricing" className="text-sm text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
          השוואת תוכניות מלאה →
        </Link>
      </div>
    </div>
  )
}

export default function BillingPage() {
  return <Suspense fallback={<div className="p-8 text-center text-slate-400">טוען...</div>}><BillingPageInner /></Suspense>
}

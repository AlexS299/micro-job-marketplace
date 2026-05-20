'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Users, Building2, DollarSign, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface AdminData {
  summary: {
    totalBusinesses: number
    totalUsers: number
    mrr: number
    arr: number
    activeSubscriptions: number
    churnedThisMonth: number
    invoicesThisMonth: number
    invoicesLastMonth: number
    planDistribution: Record<string, number>
  }
  businesses: {
    id: string
    name: string
    email: string | null
    plan: string
    status: string
    invoices: number
    employees: number
    clients: number
    createdAt: string
    currentPeriodEnd: string | null
  }[]
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  PRO: 'bg-indigo-100 text-indigo-700',
  BUSINESS: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  free: 'bg-gray-50 text-gray-400',
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [sort, setSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'createdAt', dir: 'desc' })

  useEffect(() => {
    fetch('/api/admin')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-400 text-sm">טוען...</div>
      </div>
    )
  }

  const { summary, businesses } = data
  const invoiceGrowth = summary.invoicesLastMonth
    ? Math.round(((summary.invoicesThisMonth - summary.invoicesLastMonth) / summary.invoicesLastMonth) * 100)
    : 0

  const sorted = [...businesses].sort((a, b) => {
    const va = a[sort.col as keyof typeof a]
    const vb = b[sort.col as keyof typeof b]
    const cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true })
    return sort.dir === 'asc' ? cmp : -cmp
  })

  function toggleSort(col: string) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' })
  }

  function SortIcon({ col }: { col: string }) {
    if (sort.col !== col) return <span className="text-gray-200">↕</span>
    return sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">ניהול SaaS — כל העסקים</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard icon={DollarSign} label="MRR" value={`₪${summary.mrr.toLocaleString()}`} sub={`ARR: ₪${summary.arr.toLocaleString()}`} color="bg-indigo-500" />
          <MetricCard icon={Building2} label="עסקים פעילים" value={summary.activeSubscriptions} sub={`מתוך ${summary.totalBusinesses} סה"כ`} color="bg-green-500" />
          <MetricCard icon={Users} label="משתמשים" value={summary.totalUsers} color="bg-blue-500" />
          <MetricCard icon={TrendingUp} label="חשבוניות החודש" value={summary.invoicesThisMonth}
            sub={invoiceGrowth !== 0 ? `${invoiceGrowth > 0 ? '+' : ''}${invoiceGrowth}% מהחודש שעבר` : undefined}
            color="bg-amber-500" />
        </div>

        {/* Plan Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">התפלגות מסלולים</h3>
            <div className="space-y-3">
              {Object.entries(summary.planDistribution).map(([plan, count]) => {
                const pct = summary.totalBusinesses ? Math.round((count / summary.totalBusinesses) * 100) : 0
                return (
                  <div key={plan}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={clsx('px-2 py-0.5 rounded-md text-xs font-medium', PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-600')}>{plan}</span>
                      <span className="text-gray-600">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4">מדדים עיקריים</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Conversion Rate (Free → Paid)', value: summary.totalBusinesses ? `${Math.round((summary.activeSubscriptions / summary.totalBusinesses) * 100)}%` : '0%' },
                { label: 'Churn החודש', value: summary.churnedThisMonth },
                { label: 'ARPU', value: summary.activeSubscriptions ? `₪${Math.round(summary.mrr / summary.activeSubscriptions)}` : '—' },
                { label: 'חשבוניות / עסק', value: summary.totalBusinesses ? Math.round(summary.invoicesThisMonth / summary.totalBusinesses) : 0 },
              ].map(m => (
                <div key={m.label} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-500">{m.label}</span>
                  <span className="font-semibold text-gray-800">{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Businesses Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">כל העסקים</h3>
            <span className="text-sm text-gray-400">{businesses.length} עסקים</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[
                    { col: 'name', label: 'שם עסק' },
                    { col: 'plan', label: 'מסלול' },
                    { col: 'status', label: 'סטטוס' },
                    { col: 'invoices', label: 'חשבוניות' },
                    { col: 'employees', label: 'עובדים' },
                    { col: 'clients', label: 'לקוחות' },
                    { col: 'createdAt', label: 'הצטרף' },
                  ].map(h => (
                    <th
                      key={h.col}
                      onClick={() => toggleSort(h.col)}
                      className="text-right px-5 py-3 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-800 select-none"
                    >
                      {h.label} <SortIcon col={h.col} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{b.name}</p>
                      {b.email && <p className="text-xs text-gray-400">{b.email}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', PLAN_COLORS[b.plan] ?? 'bg-gray-100 text-gray-600')}>
                        {b.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium', STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600')}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{b.invoices}</td>
                    <td className="px-5 py-3.5 text-gray-700">{b.employees}</td>
                    <td className="px-5 py-3.5 text-gray-700">{b.clients}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(b.createdAt).toLocaleDateString('he-IL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Churn alert */}
        {summary.churnedThisMonth > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {summary.churnedThisMonth} עסקים ביטלו המנוי החודש. שקול קמפיין השבה.
          </div>
        )}
      </div>
    </div>
  )
}

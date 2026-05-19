'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, FileText, Receipt,
  Building2, AlertCircle, ChevronLeft, Plus, Wallet,
  AlertTriangle, Clock,
} from 'lucide-react'
import { formatILS, formatDate } from '@/lib/vat'
import { STATUS_COLORS, INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from '@/types'
import type { InvoiceStatus, InvoiceType } from '@/types'

interface DashboardData {
  business: { name: string; vatNumber?: string; taxType: string; vatReportPeriod: string }
  revenueThisMonth: number
  revenueLastMonth: number
  expensesThisMonth: number
  netProfitThisMonth: number
  outstandingInvoices: number
  outstandingCount: number
  overdueCount: number
  overdueAmount: number
  overdueInvoices: Array<{
    id: string; invoiceNumber: string; total: number
    dueDate: string | null; client?: { name: string } | null
  }>
  vatDue: number
  vatPeriodLabel: string
  vatDeadline: string
  daysUntilVat: number
  bankBalance: number
  monthlyRevenue: Array<{ month: string; revenue: number; expenses: number; profit: number }>
  statusBreakdown: Array<{ status: string; count: number; total: number }>
  topClients: Array<{ clientId: string | null; name: string; total: number }>
  recentInvoices: Array<{
    id: string; invoiceNumber: string; type: string; status: string
    total: number; issueDate: string; client?: { name: string } | null
  }>
  recentTransactions: Array<{
    id: string; date: string; description: string; amount: number; category?: string | null
  }>
}

const STATUS_HEB: Record<string, string> = {
  DRAFT: 'טיוטה', SENT: 'נשלחה', PAID: 'שולמה',
  OVERDUE: 'באיחור', CANCELLED: 'בוטלה',
}
const STATUS_CLR: Record<string, string> = {
  DRAFT: '#94a3b8', SENT: '#3b82f6', PAID: '#22c55e',
  OVERDUE: '#ef4444', CANCELLED: '#9ca3af',
}

function KPICard({
  title, value, subtitle, icon: Icon, trend, trendLabel, color = 'blue',
}: {
  title: string; value: string; subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'; trendLabel?: string
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple'
}) {
  const colorMap = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    red:    'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && trendLabel && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : null}
            {trendLabel}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-0.5">{value}</p>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const labels: Record<string, string> = { revenue: 'הכנסות', expenses: 'הוצאות', profit: 'רווח' }
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm" dir="rtl">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{labels[p.name] ?? p.name}: {formatILS(p.value)}</p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartRange, setChartRange] = useState<6 | 12>(6)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-lg">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p>שגיאה בטעינת הנתונים. אנא רענן את הדף.</p>
      </div>
    )
  }

  const revenueChange = data.revenueLastMonth > 0
    ? Math.round(((data.revenueThisMonth - data.revenueLastMonth) / data.revenueLastMonth) * 100) : 0
  const revenueTrend = data.revenueLastMonth === 0 ? 'neutral' : revenueChange >= 0 ? 'up' : 'down'
  const chartData = data.monthlyRevenue.slice(chartRange === 6 ? -6 : -12)
  const maxClient = data.topClients[0]?.total ?? 1

  return (
    <div className="space-y-6" dir="rtl">

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/dashboard/invoices?new=1"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> חשבונית חדשה
        </Link>
        <Link href="/dashboard/expenses?new=1"
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-200 transition-colors">
          <Plus className="w-4 h-4" /> הוצאה חדשה
        </Link>
        <Link href="/dashboard/payments"
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-slate-200 transition-colors">
          <Wallet className="w-4 h-4" /> הגדרות סליקה
        </Link>
      </div>

      {/* Overdue alert banner */}
      {data.overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800">
                {data.overdueCount} חשבוניות באיחור — {formatILS(data.overdueAmount)}
              </p>
              <div className="mt-2 space-y-1">
                {data.overdueInvoices.map(inv => (
                  <p key={inv.id} className="text-sm text-red-700">
                    {inv.invoiceNumber} | {inv.client?.name ?? 'לא צוין'} | {formatILS(inv.total)}
                    {inv.dueDate && <span className="text-red-500"> · פג {formatDate(inv.dueDate)}</span>}
                  </p>
                ))}
              </div>
            </div>
            <Link href="/dashboard/invoices?status=OVERDUE" className="text-sm text-red-600 hover:text-red-800 font-medium whitespace-nowrap">
              צפה בכולן
            </Link>
          </div>
        </div>
      )}

      {/* VAT deadline alert */}
      {data.daysUntilVat <= 14 && data.vatDue > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 text-sm flex-1">
            <span className="font-semibold">מע"מ לתשלום {formatILS(data.vatDue)}</span>
            {' '} — נותרו {data.daysUntilVat} ימים ({data.vatPeriodLabel})
          </p>
          <Link href="/dashboard/tax" className="text-sm text-amber-700 hover:text-amber-900 font-medium">
            הגש עכשיו
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="הכנסות החודש"
          value={formatILS(data.revenueThisMonth)}
          icon={TrendingUp}
          trend={revenueTrend}
          trendLabel={revenueChange !== 0 ? `${Math.abs(revenueChange)}% מהחודש שעבר` : 'ללא שינוי'}
          color="blue"
        />
        <KPICard
          title="הוצאות החודש"
          value={formatILS(data.expensesThisMonth)}
          icon={TrendingDown}
          color="orange"
        />
        <KPICard
          title="רווח נקי החודש"
          value={formatILS(data.netProfitThisMonth)}
          icon={Wallet}
          color={data.netProfitThisMonth >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="חשבוניות פתוחות"
          value={formatILS(data.outstandingInvoices)}
          subtitle={`${data.outstandingCount} ממתינות · ${data.overdueCount} באיחור`}
          icon={FileText}
          color={data.overdueCount > 0 ? 'red' : data.outstandingCount > 0 ? 'orange' : 'green'}
        />
        <KPICard
          title="מע״מ לתשלום"
          subtitle={data.vatPeriodLabel}
          value={formatILS(data.vatDue)}
          icon={Receipt}
          color={data.vatDue > 0 ? 'red' : 'green'}
        />
        <KPICard
          title="יתרת בנק"
          value={formatILS(data.bankBalance)}
          icon={Building2}
          color="green"
        />
        <KPICard
          title='מע"מ — ימים לסגירה'
          value={`${data.daysUntilVat} ימים`}
          subtitle={data.vatPeriodLabel}
          icon={Clock}
          color={data.daysUntilVat <= 7 ? 'red' : data.daysUntilVat <= 14 ? 'orange' : 'blue'}
        />
        <KPICard
          title="לקוחות מובילים"
          value={String(data.topClients.length)}
          subtitle={data.topClients[0] ? data.topClients[0].name : '—'}
          icon={AlertCircle}
          color="purple"
        />
      </div>

      {/* Revenue / Expenses Area Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">הכנסות, הוצאות ורווח</h2>
          <div className="flex gap-1">
            {([6, 12] as const).map(n => (
              <button
                key={n}
                onClick={() => setChartRange(n)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  chartRange === n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {n} חודשים
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="proGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₪${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend formatter={(v: string) => ({ revenue: 'הכנסות', expenses: 'הוצאות', profit: 'רווח' }[v] ?? v)} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue"  stroke="#1d4ed8" strokeWidth={2} fill="url(#revGrad)" />
            <Area type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={2} fill="url(#expGrad)" />
            <Area type="monotone" dataKey="profit"   stroke="#16a34a" strokeWidth={2} fill="url(#proGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom row: status breakdown + top clients */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Invoice status breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">פירוט סטטוס חשבוניות</h2>
          {data.statusBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">אין חשבוניות עדיין</p>
          ) : (
            <div className="space-y-3">
              {data.statusBreakdown
                .sort((a, b) => b.total - a.total)
                .map(s => (
                  <div key={s.status}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CLR[s.status] ?? '#94a3b8' }} />
                        <span className="font-medium text-slate-700">{STATUS_HEB[s.status] ?? s.status}</span>
                        <span className="text-slate-400">({s.count})</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatILS(s.total)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (s.total / (data.statusBreakdown.reduce((x,y)=>x+y.total,0)||1)) * 100)}%`,
                          background: STATUS_CLR[s.status] ?? '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top clients */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">לקוחות מובילים</h2>
            <Link href="/dashboard/clients" className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1">
              הכל <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          {data.topClients.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">אין נתונים עדיין</p>
          ) : (
            <div className="space-y-3">
              {data.topClients.map((c, i) => (
                <div key={c.clientId ?? i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.total / maxClient) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{formatILS(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent invoices + transactions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">חשבוניות אחרונות</h2>
            <Link href="/dashboard/invoices" className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1">
              הכל <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentInvoices.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">אין חשבוניות עדיין</p>
            ) : data.recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {inv.client?.name || 'לא צוין'}
                    </span>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status as InvoiceStatus]}`}>
                      {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {inv.invoiceNumber} · {INVOICE_TYPE_LABELS[inv.type as InvoiceType]} · {formatDate(inv.issueDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatILS(inv.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">תנועות בנקאיות</h2>
            <Link href="/dashboard/bank" className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1">
              הכל <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">אין תנועות עדיין</p>
            ) : data.recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.amount > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                  <p className="text-xs text-slate-400">{formatDate(tx.date)}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{formatILS(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

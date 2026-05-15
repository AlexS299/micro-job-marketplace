'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
  Building2,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react'
import { formatILS, formatDate } from '@/lib/vat'
import { STATUS_COLORS, INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from '@/types'
import type { InvoiceStatus, InvoiceType } from '@/types'

interface DashboardData {
  business: { name: string; vatNumber?: string; taxType: string; vatReportPeriod: string }
  revenueThisMonth: number
  revenueLastMonth: number
  outstandingInvoices: number
  outstandingCount: number
  vatDue: number
  vatPeriodLabel: string
  bankBalance: number
  monthlyRevenue: Array<{ month: string; revenue: number; expenses: number }>
  recentInvoices: Array<{
    id: string
    invoiceNumber: string
    type: string
    status: string
    total: number
    issueDate: string
    client?: { name: string } | null
  }>
  recentTransactions: Array<{
    id: string
    date: string
    description: string
    amount: number
    category?: string | null
  }>
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  color?: 'blue' | 'green' | 'red' | 'orange'
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && trendLabel && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
            }`}
          >
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

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === 'revenue' ? 'הכנסות' : 'הוצאות'}: {formatILS(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-blue-600 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-blue-600 rounded-full typing-dot" />
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

  const revenueTrend =
    data.revenueLastMonth === 0
      ? 'neutral'
      : data.revenueThisMonth >= data.revenueLastMonth
      ? 'up'
      : 'down'

  const revenueChange =
    data.revenueLastMonth > 0
      ? Math.round(((data.revenueThisMonth - data.revenueLastMonth) / data.revenueLastMonth) * 100)
      : 0

  return (
    <div className="space-y-6">
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
          title="חשבוניות פתוחות"
          value={formatILS(data.outstandingInvoices)}
          subtitle={`${data.outstandingCount} חשבוניות`}
          icon={FileText}
          color={data.outstandingCount > 0 ? 'orange' : 'green'}
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
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">הכנסות והוצאות - 6 חודשים אחרונים</h2>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.monthlyRevenue} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (value === 'revenue' ? 'הכנסות' : 'הוצאות')}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#1d4ed8"
              strokeWidth={2}
              fill="url(#revenueGrad)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="#dc2626"
              strokeWidth={2}
              fill="url(#expenseGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">חשבוניות אחרונות</h2>
            <Link href="/dashboard/invoices" className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1">
              הכל
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentInvoices.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">אין חשבוניות עדיין</p>
            ) : (
              data.recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/dashboard/invoices`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {inv.client?.name || 'לא צוין'}
                      </span>
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status as InvoiceStatus]}`}
                      >
                        {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {inv.invoiceNumber} | {INVOICE_TYPE_LABELS[inv.type as InvoiceType]} | {formatDate(inv.issueDate)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                    {formatILS(inv.total)}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">תנועות בנקאיות</h2>
            <Link href="/dashboard/bank" className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1">
              הכל
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">אין תנועות עדיין</p>
            ) : (
              data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      tx.amount > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400">{formatDate(tx.date)}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold whitespace-nowrap ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {formatILS(tx.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

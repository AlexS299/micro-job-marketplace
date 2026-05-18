'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, BarChart2, Scale, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import type { PnLStatement, BalanceSheet, PnLLine, BalanceSheetLine } from '@/lib/financial-statements'

function fmt(n: number) {
  const abs = Math.abs(n)
  const s = abs.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n < 0 ? `-₪${s}` : `₪${s}`
}

const PERIOD_OPTIONS = [
  { value: 'month',   label: 'חודש נוכחי' },
  { value: 'quarter', label: 'רבעון נוכחי' },
  { value: 'year',    label: 'שנה נוכחית' },
]

// ─── P&L Line Row ─────────────────────────────────────────────────────────────
function PnLRow({ line, prevAmount }: { line: PnLLine; prevAmount?: number }) {
  const [showNote, setShowNote] = useState(false)
  const change = prevAmount !== undefined && prevAmount !== 0
    ? ((line.amount - prevAmount) / Math.abs(prevAmount)) * 100
    : null

  return (
    <>
      {line.separator && <tr><td colSpan={3} className="py-1"><div className="border-t border-slate-200" /></td></tr>}
      <tr className={clsx(
        'transition-colors',
        line.bold ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/50',
      )}>
        <td className={clsx('py-2 text-sm', line.indent === 1 && 'pr-6', line.indent === 2 && 'pr-10')}>
          <span className={line.bold ? 'text-slate-900' : 'text-slate-600'}>{line.label}</span>
          {line.note && (
            <button onClick={() => setShowNote(!showNote)} className="mr-1 text-slate-400 hover:text-slate-600">
              <span className="text-xs">ⓘ</span>
            </button>
          )}
        </td>
        <td className={clsx('py-2 text-sm text-left tabular-nums', line.amount < 0 ? 'text-red-600' : line.bold ? 'text-slate-900' : 'text-slate-700')}>
          {line.amount !== 0 ? fmt(line.amount) : ''}
        </td>
        <td className="py-2 text-left">
          {change !== null && line.amount !== 0 && (
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
              {change >= 0 ? '+' : ''}{change.toFixed(0)}%
            </span>
          )}
        </td>
      </tr>
      {showNote && line.note && (
        <tr><td colSpan={3} className="pb-2 pr-6">
          <p className="text-xs text-slate-500 bg-amber-50 rounded-lg px-3 py-1.5">{line.note}</p>
        </td></tr>
      )}
    </>
  )
}

// ─── Balance Sheet Section ────────────────────────────────────────────────────
function BSSection({ title, lines, total, color }: {
  title: string; lines: BalanceSheetLine[]; total: number; color: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
      >
        <span className="font-bold text-slate-900">{title}</span>
        <div className="flex items-center gap-3">
          <span className={clsx('font-bold text-lg', color)}>{fmt(total)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100">
          <table className="w-full">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className={clsx(line.bold ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/50')}>
                  <td className={clsx('px-4 py-2 text-sm', line.indent && 'pr-8', line.bold ? 'text-slate-900' : 'text-slate-600')}>
                    {line.label}
                  </td>
                  <td className="px-4 py-2 text-sm text-left tabular-nums font-medium text-slate-800">
                    {line.amount !== 0 ? fmt(line.amount) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, amount, sub, positive }: { label: string; amount: number; sub?: string; positive?: boolean }) {
  const isPos = positive ?? amount >= 0
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={clsx('text-xl font-bold', isPos ? 'text-slate-900' : 'text-red-600')}>{fmt(amount)}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinancialPage() {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year')
  const [tab, setTab] = useState<'pnl' | 'balance'>('pnl')
  const [pnl, setPnl] = useState<PnLStatement | null>(null)
  const [balance, setBalance] = useState<BalanceSheet | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [pnlRes, balRes] = await Promise.all([
      fetch(`/api/financial/pnl?period=${period}`),
      fetch('/api/financial/balance-sheet'),
    ])
    if (pnlRes.ok) setPnl(await pnlRes.json())
    if (balRes.ok) setBalance(await balRes.json())
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const pieData = pnl?.expenseByCategory
    .filter(e => e.amount > 0)
    .map(e => ({ name: e.label, value: e.amount })) || []

  const COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ef4444','#06b6d4','#ec4899','#84cc16']

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-blue-700" />
            דוחות כספיים
          </h1>
          <p className="text-slate-500 text-sm mt-1">רווח והפסד · מאזן · ניתוח פיננסי</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={clsx('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {PERIOD_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => setPeriod(o.value as typeof period)}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              period === o.value ? 'bg-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {o.label}
          </button>
        ))}
        {pnl && <span className="px-3 py-2 text-sm text-slate-400">{pnl.periodLabel}</span>}
      </div>

      {/* KPI row */}
      {pnl && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KPI label="הכנסות" amount={pnl.totalRevenue} />
          <KPI label="רווח גולמי" amount={pnl.grossProfit}
            sub={pnl.totalRevenue > 0 ? `${((pnl.grossProfit / pnl.totalRevenue) * 100).toFixed(1)}% מרג'`  : undefined} />
          <KPI label="רווח תפעולי" amount={pnl.operatingProfit}
            sub={pnl.totalRevenue > 0 ? `${((pnl.operatingProfit / pnl.totalRevenue) * 100).toFixed(1)}% EBIT` : undefined} />
          <KPI label="רווח נקי" amount={pnl.netProfit} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {[
          { id: 'pnl',     label: 'רווח והפסד', icon: TrendingUp },
          { id: 'balance', label: 'מאזן',        icon: Scale },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pnl' && pnl && (
        <>
          {/* Revenue by client */}
          {pnl.revenueByClient.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">הכנסות לפי לקוח</h3>
              <div className="space-y-2">
                {pnl.revenueByClient.slice(0, 6).map(c => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">{c.name}</span>
                        <span className="font-medium">{fmt(c.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(c.amount / pnl.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 w-10 text-left">
                      {((c.amount / pnl.totalRevenue) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense pie */}
          {pieData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">התפלגות הוצאות</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* P&L table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">דוח רווח והפסד</h3>
              <span className="text-xs text-slate-400">{pnl.periodLabel}</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">סעיף</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">סכום</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">שינוי</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pnl.lines.map((line, i) => <PnLRow key={i} line={line} />)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'balance' && balance && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">סה"כ נכסים</p>
              <p className="font-bold text-blue-700 text-lg">{fmt(balance.totalAssets)}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">סה"כ התחייבויות</p>
              <p className="font-bold text-red-600 text-lg">{fmt(balance.totalLiabilities)}</p>
            </div>
            <div className={clsx('border rounded-xl p-3 text-center', balance.totalEquity >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}>
              <p className="text-xs text-slate-500 mb-1">הון עצמי</p>
              <p className={clsx('font-bold text-lg', balance.totalEquity >= 0 ? 'text-green-700' : 'text-red-600')}>
                {fmt(balance.totalEquity)}
              </p>
            </div>
          </div>

          {/* Balance check */}
          {Math.abs(balance.totalAssets - (balance.totalLiabilities + balance.totalEquity)) < 1 ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-4 text-sm text-green-700">
              ✓ המאזן מאוזן — נכסים = התחייבויות + הון עצמי
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-4 text-sm text-amber-700">
              ⚠ ייתכנו נתונים חסרים — הכנס נתוני בנק ועסקאות מלאים
            </div>
          )}

          <BSSection title="נכסים" lines={balance.assets} total={balance.totalAssets} color="text-blue-700" />
          <BSSection title="התחייבויות" lines={balance.liabilities} total={balance.totalLiabilities} color="text-red-600" />
          <BSSection title="הון עצמי" lines={balance.equity} total={balance.totalEquity}
            color={balance.totalEquity >= 0 ? 'text-green-700' : 'text-red-600'} />
        </>
      )}

      {loading && !pnl && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          טוען דוחות כספיים...
        </div>
      )}
    </div>
  )
}

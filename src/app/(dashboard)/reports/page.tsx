'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  Download,
} from 'lucide-react'
import { formatILS, formatDate } from '@/lib/vat'

interface CurrentPeriod {
  start: string
  end: string
  label: string
  outputVAT: number
  inputVAT: number
  vatOwed: number
  totalRevenue: number
  totalExpenses: number
  invoiceCount: number
}

interface VATReport {
  id: string
  periodStart: string
  periodEnd: string
  outputVAT: number
  inputVAT: number
  vatOwed: number
  status: string
  submittedAt?: string | null
  createdAt: string
}

interface ReportData {
  currentPeriod: CurrentPeriod
  reports: VATReport[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: 'טיוטה', color: 'text-gray-600 bg-gray-100', icon: Clock },
  SUBMITTED: { label: 'הוגש', color: 'text-blue-600 bg-blue-100', icon: CheckCircle },
  PAID: { label: 'שולם', color: 'text-green-600 bg-green-100', icon: CheckCircle },
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-slate-700">{payload[0].name}</p>
        <p className="text-blue-700 font-semibold">{formatILS(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports/vat')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateReport = async () => {
    if (!data) return
    setGenerating(true)
    try {
      const res = await fetch('/api/reports/vat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: data.currentPeriod.start,
          periodEnd: data.currentPeriod.end,
        }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center gap-3 bg-red-50 text-red-700 p-4 rounded-lg">
        <AlertTriangle className="w-5 h-5" />
        שגיאה בטעינת הדוחות
      </div>
    )
  }

  const { currentPeriod, reports } = data
  const pieData = [
    { name: 'מע"מ עסקאות (חובה)', value: currentPeriod.outputVAT },
    { name: 'מע"מ תשומות (זכות)', value: currentPeriod.inputVAT },
  ]
  const COLORS = ['#1d4ed8', '#16a34a']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">דוחות מע&quot;מ</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            תקופה נוכחית: {currentPeriod.label}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center gap-2 bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            הפק דוח
          </button>
        </div>
      </div>

      {/* VAT Due Alert */}
      {currentPeriod.vatOwed > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">יש לשלם מע&quot;מ עד ה-15 לחודש הבא</p>
            <p className="text-sm text-amber-700 mt-0.5">
              סכום לתשלום: <strong>{formatILS(currentPeriod.vatOwed)}</strong> עבור תקופת {currentPeriod.label}
            </p>
          </div>
        </div>
      )}

      {currentPeriod.vatOwed < 0 && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">זכאי להחזר מע&quot;מ</p>
            <p className="text-sm text-green-700 mt-0.5">
              סכום להחזר: <strong>{formatILS(Math.abs(currentPeriod.vatOwed))}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Current period summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">מחזור עסקאות</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatILS(currentPeriod.totalRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">{currentPeriod.invoiceCount} חשבוניות</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-blue-700" />
            <span className="text-sm font-medium text-slate-700">מע&quot;מ עסקאות</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatILS(currentPeriod.outputVAT)}</p>
          <p className="text-xs text-slate-400 mt-1">חייב לרשות המיסים</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-slate-700">מע&quot;מ תשומות</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatILS(currentPeriod.inputVAT)}</p>
          <p className="text-xs text-slate-400 mt-1">ניכוי על הוצאות</p>
        </div>

        <div className={`rounded-xl border shadow-sm p-5 ${
          currentPeriod.vatOwed > 0
            ? 'bg-red-50 border-red-200'
            : currentPeriod.vatOwed < 0
            ? 'bg-green-50 border-green-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Receipt className={`w-4 h-4 ${currentPeriod.vatOwed > 0 ? 'text-red-600' : 'text-green-600'}`} />
            <span className="text-sm font-medium text-slate-700">
              {currentPeriod.vatOwed > 0 ? 'לתשלום' : 'להחזר'}
            </span>
          </div>
          <p className={`text-2xl font-bold ${
            currentPeriod.vatOwed > 0 ? 'text-red-700' : 'text-green-700'
          }`}>
            {formatILS(Math.abs(currentPeriod.vatOwed))}
          </p>
          <p className="text-xs text-slate-500 mt-1">מע&quot;מ נטו</p>
        </div>
      </div>

      {/* Chart + info grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4">פילוח מע&quot;מ</h2>
          {currentPeriod.outputVAT === 0 && currentPeriod.inputVAT === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              אין נתונים לתקופה זו
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Info card */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4">מועדי הגשה חשובים</h2>
          <div className="space-y-3">
            {[
              {
                label: 'דוח מע"מ דו-חודשי',
                date: 'עד ה-15 לחודש שלאחר התקופה',
                icon: Receipt,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'מקדמות מס הכנסה',
                date: 'עד ה-15 לכל חודש',
                icon: TrendingUp,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                label: 'דוח שנתי - עצמאי',
                date: '31 במאי בשנת המס הבאה',
                icon: Clock,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
              },
              {
                label: 'ניכוי במקור לספקים',
                date: 'עד ה-7 לחודש שלאחר הניכוי',
                icon: CheckCircle,
                color: 'text-green-600',
                bg: 'bg-green-50',
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`p-2 rounded-lg ${item.bg} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Previous reports */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-900 mb-4">דוחות קודמים</h2>
          <div className="space-y-3">
            {reports.map((report) => {
              const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.DRAFT
              const StatusIcon = statusCfg.icon
              return (
                <div
                  key={report.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      מע&quot;מ עסקאות: {formatILS(report.outputVAT)} |
                      מע&quot;מ תשומות: {formatILS(report.inputVAT)}
                    </p>
                    {report.submittedAt && (
                      <p className="text-xs text-slate-400">הוגש: {formatDate(report.submittedAt)}</p>
                    )}
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className={`text-sm font-bold ${report.vatOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {report.vatOwed > 0 ? 'לתשלום: ' : 'להחזר: '}
                      {formatILS(Math.abs(report.vatOwed))}
                    </p>
                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legal note */}
      <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-400 text-center">
        <p>מערכת זו מבוססת על חוק מע&quot;מ תשל&quot;ו-1975 ותקנות מס ערך מוסף, תשל&quot;ו-1976</p>
        <p className="mt-1">לייעוץ מיסוי מקצועי פנה לרואה חשבון מוסמך</p>
      </div>
    </div>
  )
}

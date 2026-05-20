'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Landmark, Calendar, FileCheck, Send, Copy, CheckCircle,
  AlertTriangle, Clock, ExternalLink, ChevronDown, ChevronUp,
  Calculator, Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import { URGENCY_CONFIG, TAX_TYPE_CONFIG, type TaxDeadline } from '@/lib/tax-authority'

function formatILS(n: number) {
  return `₪${Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function daysUntil(d: Date | string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

// ─── VAT Submission Panel ─────────────────────────────────────────────────────
function VATPanel() {
  const now = new Date()
  const month = now.getMonth()
  // Bi-monthly: current period
  const periodStart = new Date(now.getFullYear(), month % 2 === 0 ? month - 1 : month, 1)
  const periodEnd   = new Date(now.getFullYear(), month % 2 === 0 ? month : month + 1, 0)

  const [result, setResult] = useState<{
    submitted: boolean; readyToSubmit: boolean; pcn874: string;
    reportData: { outputVAT: number; inputVAT: number; netVAT: number; outputBase: number; inputBase: number; transactionCount: number };
    manualUrl: string;
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(true)

  async function calculate() {
    setLoading(true)
    const res = await fetch('/api/tax/submit-vat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      }),
    })
    if (res.ok) setResult(await res.json())
    setLoading(false)
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const dueDate = new Date(now.getFullYear(), (month % 2 === 0 ? month + 1 : month + 2), 15)
  const days = daysUntil(dueDate)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 hover:bg-slate-50 transition-colors text-right"
      >
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🧾</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900">דוח מע"מ תקופתי</p>
          <p className="text-sm text-slate-500">
            {periodStart.toLocaleDateString('he-IL', { month: 'long' })}–{periodEnd.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="text-left flex-shrink-0">
          <p className={clsx('text-sm font-medium', days <= 7 ? 'text-red-600' : days <= 14 ? 'text-amber-600' : 'text-slate-500')}>
            {days < 0 ? 'באיחור!' : `${days} ימים`}
          </p>
          <p className="text-xs text-slate-400">מועד: {formatDate(dueDate)}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5">
          {!result ? (
            <button
              onClick={calculate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              {loading ? 'מחשב...' : 'חשב דוח מע"מ'}
            </button>
          ) : (
            <>
              {/* VAT breakdown */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">מע"מ עסקאות</p>
                  <p className="font-bold text-blue-700">{formatILS(result.reportData.outputVAT)}</p>
                  <p className="text-xs text-slate-400">על {formatILS(result.reportData.outputBase)} הכנסות</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">מע"מ תשומות</p>
                  <p className="font-bold text-green-700">{formatILS(result.reportData.inputVAT)}</p>
                  <p className="text-xs text-slate-400">הוצאות מוכרות</p>
                </div>
                <div className={clsx('rounded-xl p-3 text-center', result.reportData.netVAT >= 0 ? 'bg-red-50' : 'bg-emerald-50')}>
                  <p className="text-xs text-slate-500 mb-1">{result.reportData.netVAT >= 0 ? 'לתשלום' : 'להחזר'}</p>
                  <p className={clsx('font-bold text-base', result.reportData.netVAT >= 0 ? 'text-red-700' : 'text-emerald-700')}>
                    {formatILS(result.reportData.netVAT)}
                  </p>
                  <p className="text-xs text-slate-400">{result.reportData.transactionCount} עסקאות</p>
                </div>
              </div>

              {result.submitted ? (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">הדוח הוגש בהצלחה לשע"מ!</span>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      הדוח מוכן. להגשה אוטומטית — הגדר <code className="bg-amber-100 px-1 rounded">SHAAM_API_KEY</code>.
                      {' '}לחלופין, השתמש בנתונים מטה להגשה ידנית.
                    </span>
                  </div>

                  {/* PCN874 */}
                  <div className="bg-slate-900 rounded-xl p-3 mb-4 relative">
                    <p className="text-xs text-slate-400 mb-2 font-mono">PCN874 — פורמט שע"מ</p>
                    <p className="text-green-400 font-mono text-xs break-all">{result.pcn874}</p>
                    <button
                      onClick={() => copy(result.pcn874)}
                      className="absolute top-3 left-3 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600"
                    >
                      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                    </button>
                  </div>

                  <a
                    href={result.manualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    הגש ידנית באתר רשות המיסים
                  </a>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Form 102 Panel ───────────────────────────────────────────────────────────
function Form102Panel() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year]  = useState(now.getFullYear())
  const [result, setResult] = useState<{
    form102Data: { totalIncomeTaxDeducted: number; totalNIEmployee: number; totalNIEmployer: number; totalHealthTax: number; totalGrossSalaries: number; employeeCount: number };
    xml: string; totalPayment: number; dueDate: string; manualUrl: string;
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    const res = await fetch('/api/tax/form102', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })
    if (res.ok) setResult(await res.json())
    else alert('לא נמצאה הרצת שכר לחודש זה. הפק שכר קודם.')
    setLoading(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 hover:bg-slate-50 transition-colors text-right"
      >
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xl">📋</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900">טופס 102 — ניכויי שכר</p>
          <p className="text-sm text-slate-500">דיווח מס הכנסה + ביטוח לאומי מעובדים</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-slate-500">15 לחודש</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5">
          <div className="flex gap-3 mb-4">
            <select
              value={month}
              onChange={e => { setMonth(Number(e.target.value)); setResult(null) }}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white flex-1"
            >
              {['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'].map((m, i) => (
                <option key={i + 1} value={i + 1}>{m} {year}</option>
              ))}
            </select>
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-800 disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              {loading ? '...' : 'הפק 102'}
            </button>
          </div>

          {result && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'שכר ברוטו כולל', val: result.form102Data.totalGrossSalaries },
                  { label: 'מס הכנסה לניכוי', val: result.form102Data.totalIncomeTaxDeducted },
                  { label: 'ביטוח לאומי עובד', val: result.form102Data.totalNIEmployee },
                  { label: 'ביטוח לאומי מעסיק', val: result.form102Data.totalNIEmployer },
                  { label: 'מס בריאות', val: result.form102Data.totalHealthTax },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-semibold text-slate-800">{formatILS(row.val)}</span>
                  </div>
                ))}
                <div className="col-span-2 flex justify-between text-sm bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                  <span className="font-bold text-red-700">סה"כ לתשלום</span>
                  <span className="font-bold text-red-700">{formatILS(result.totalPayment)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 mb-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                מועד תשלום: {formatDate(result.dueDate)}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => { await navigator.clipboard.writeText(result.xml); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'הועתק!' : 'העתק XML'}
                </button>
                <a
                  href={result.manualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm bg-purple-700 text-white px-3 py-2 rounded-xl hover:bg-purple-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  הגש באתר ביטוח לאומי
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Deadline Card ────────────────────────────────────────────────────────────
function DeadlineCard({ d }: { d: TaxDeadline }) {
  const cfg = URGENCY_CONFIG[d.urgency]
  const type = TAX_TYPE_CONFIG[d.type]
  const days = daysUntil(d.dueDate)

  return (
    <div className={clsx('border rounded-xl p-4 flex items-center gap-3', cfg.border, cfg.bg)}>
      <span className="text-2xl flex-shrink-0">{type.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{d.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{d.description}</p>
      </div>
      <div className="text-left flex-shrink-0">
        <span className={clsx('text-xs font-bold px-2 py-1 rounded-full', cfg.bg, cfg.text)}>
          {d.urgency === 'overdue' ? 'באיחור!' : days === 0 ? 'היום!' : `${days} יום`}
        </span>
        <p className="text-xs text-slate-400 mt-1 text-center">{formatDate(d.dueDate)}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TaxPage() {
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>([])
  const [tab, setTab] = useState<'calendar' | 'vat' | 'payroll'>('calendar')

  const loadCalendar = useCallback(async () => {
    const res = await fetch('/api/tax/calendar')
    if (res.ok) setDeadlines(await res.json())
  }, [])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  const overdue  = deadlines.filter(d => d.urgency === 'overdue')
  const urgent   = deadlines.filter(d => d.urgency === 'urgent')
  const upcoming = deadlines.filter(d => d.urgency === 'upcoming')
  const future   = deadlines.filter(d => d.urgency === 'future')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Landmark className="w-7 h-7 text-blue-700" />
          מרכז המס
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          דיווחים לרשות המיסים, ביטוח לאומי, ולוח מועדים
        </p>
      </div>

      {/* Urgent alerts */}
      {(overdue.length > 0 || urgent.length > 0) && (
        <div className={clsx(
          'flex items-start gap-3 rounded-2xl px-4 py-3 mb-6 border',
          overdue.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        )}>
          <AlertTriangle className={clsx('w-5 h-5 mt-0.5 flex-shrink-0', overdue.length > 0 ? 'text-red-600' : 'text-amber-600')} />
          <div>
            <p className={clsx('font-bold text-sm', overdue.length > 0 ? 'text-red-700' : 'text-amber-700')}>
              {overdue.length > 0 ? `${overdue.length} מועדים עברו!` : `${urgent.length} מועדים קרובים מאוד`}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {[...overdue, ...urgent].map(d => d.title).join(' • ')}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {([
          { id: 'calendar', label: 'לוח מועדים', icon: Calendar },
          { id: 'vat',      label: 'מע"מ',        icon: FileCheck },
          { id: 'payroll',  label: 'טופס 102',    icon: Send },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calendar' && (
        <div className="space-y-3">
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> באיחור
              </p>
              <div className="space-y-2">{overdue.map(d => <DeadlineCard key={d.id} d={d} />)}</div>
            </div>
          )}
          {urgent.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> דחוף — עד 7 ימים
              </p>
              <div className="space-y-2">{urgent.map(d => <DeadlineCard key={d.id} d={d} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> בקרוב
              </p>
              <div className="space-y-2">{upcoming.map(d => <DeadlineCard key={d.id} d={d} />)}</div>
            </div>
          )}
          {future.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> עתידי
              </p>
              <div className="space-y-2">{future.map(d => <DeadlineCard key={d.id} d={d} />)}</div>
            </div>
          )}
          {deadlines.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>טוען לוח מועדים...</p>
            </div>
          )}
        </div>
      )}

      {tab === 'vat'     && <VATPanel />}
      {tab === 'payroll' && <Form102Panel />}
    </div>
  )
}

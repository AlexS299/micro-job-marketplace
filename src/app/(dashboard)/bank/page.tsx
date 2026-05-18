'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import {
  Building2, TrendingUp, TrendingDown, RefreshCw, Loader2,
  CheckCircle, Circle, Download, Upload, X, AlertCircle,
  Plus, Wifi, WifiOff, ArrowLeftRight, Trash2, CheckCheck,
} from 'lucide-react'
import { formatILS, formatDate } from '@/lib/vat'

// ─── types ────────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string; bankName: string; accountNumber: string; branchNumber?: string | null
  balance: number; currency: string; lastSyncAt?: string | null
  _count?: { transactions: number }
}

interface BankConnection {
  id: string; bankCode: string; bankName: string; status: string
  lastSyncAt?: string | null; accounts: BankAccount[]
}

interface BankTransaction {
  id: string; date: string; description: string; amount: number
  balance?: number | null; category?: string | null; reference?: string | null
  isReconciled: boolean
}

interface BankData {
  accounts: BankAccount[]; transactions: BankTransaction[]
  totalBalance: number; total: number
}

interface ReconcileMatch {
  transaction: BankTransaction
  matches: Array<{ id: string; invoiceNumber: string; total: number; client?: { name: string } | null; dueDate?: string | null }>
}

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  { value: 'ALL',     label: 'הכל'    },
  { value: 'INCOME',  label: 'הכנסות' },
  { value: 'EXPENSE', label: 'הוצאות' },
  { value: 'VAT',     label: 'מע"מ'  },
  { value: 'SALARY',  label: 'שכר'   },
  { value: 'TAX',     label: 'מיסים' },
] as const

type CategoryFilter = (typeof CATEGORY_FILTERS)[number]['value']

const CATEGORY_COLORS: Record<string, string> = {
  INCOME: 'bg-green-50 text-green-700', EXPENSE: 'bg-red-50 text-red-700',
  VAT: 'bg-purple-50 text-purple-700',  SALARY: 'bg-blue-50 text-blue-700',
  TAX: 'bg-orange-50 text-orange-700',  TRANSFER: 'bg-slate-50 text-slate-700',
  OTHER: 'bg-slate-50 text-slate-600',
}
const CATEGORY_LABELS: Record<string, string> = {
  INCOME: 'הכנסה', EXPENSE: 'הוצאה', VAT: 'מע"מ',
  SALARY: 'שכר',   TAX: 'מס',        TRANSFER: 'העברה', OTHER: 'אחר',
}

const SAMPLE_TRANSACTIONS = [
  { date: new Date().toISOString(), description: 'לקוח חדש - תשלום עבור פרויקט', amount: 7500, category: 'INCOME', balance: 55000 },
  { date: new Date(Date.now() - 86400000).toISOString(), description: 'שכר דירה משרד', amount: -4500, category: 'EXPENSE', balance: 47500 },
  { date: new Date(Date.now() - 172800000).toISOString(), description: 'אינטרנט עסקי', amount: -200, category: 'EXPENSE', balance: 52000 },
  { date: new Date(Date.now() - 345600000).toISOString(), description: 'הכנסה - שירותי ייעוץ', amount: 5000, category: 'INCOME', balance: 53050 },
]

// ─── sub-components ───────────────────────────────────────────────────────────

function ConnectionCard({
  conn, onSync, onDisconnect, syncing,
}: {
  conn: BankConnection
  onSync: (id: string) => void
  onDisconnect: (id: string) => void
  syncing: boolean
}) {
  const isActive = conn.status === 'active'
  const txCount = conn.accounts.reduce((s, a) => s + (a._count?.transactions ?? 0), 0)
  return (
    <div className={clsx('rounded-xl border p-4 flex items-start gap-3',
      isActive ? 'bg-white border-slate-100' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'
    )}>
      <div className={clsx('p-2 rounded-lg flex-shrink-0', isActive ? 'bg-blue-50' : 'bg-slate-100')}>
        {isActive ? <Wifi className="w-4 h-4 text-blue-600" /> : <WifiOff className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{conn.bankName}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {conn.accounts.length} חשבון · {txCount} עסקאות
          {conn.lastSyncAt && ` · עדכון ${formatDate(conn.lastSyncAt)}`}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isActive && (
          <button
            onClick={() => onSync(conn.id)}
            disabled={syncing}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors disabled:opacity-40"
            title="סנכרן עכשיו"
          >
            <RefreshCw className={clsx('w-4 h-4', syncing && 'animate-spin')} />
          </button>
        )}
        <button
          onClick={() => onDisconnect(conn.id)}
          className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="נתק"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ReconcilePanel({ onDone }: { onDone: () => void }) {
  const [matches, setMatches] = useState<ReconcileMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/bank/reconcile').then(r => r.json()).then(setMatches).finally(() => setLoading(false))
  }, [])

  async function confirm(transactionId: string, invoiceId: string) {
    setConfirming(transactionId)
    await fetch('/api/bank/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, invoiceId }),
    })
    setMatches(prev => prev.filter(m => m.transaction.id !== transactionId))
    setConfirming(null)
    onDone()
  }

  if (loading) return null
  if (matches.length === 0) return null

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
        <p className="text-sm font-semibold text-emerald-800">
          {matches.length} הכנסות מתאימות לחשבוניות פתוחות
        </p>
      </div>
      <div className="space-y-2">
        {matches.map(({ transaction: tx, matches: invMatches }) => (
          <div key={tx.id} className="bg-white rounded-xl border border-emerald-100 p-3">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{tx.description}</p>
                <p className="text-xs text-slate-400">{formatDate(tx.date)}</p>
              </div>
              <p className="text-sm font-bold text-green-600 flex-shrink-0">+{formatILS(tx.amount)}</p>
            </div>
            <div className="space-y-1.5">
              {invMatches.map(inv => (
                <div key={inv.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700">
                      חשבונית {inv.invoiceNumber}
                      {inv.client && ` · ${inv.client.name}`}
                    </p>
                    <p className="text-xs text-slate-400">{formatILS(inv.total)}</p>
                  </div>
                  <button
                    onClick={() => confirm(tx.id, inv.id)}
                    disabled={confirming === tx.id}
                    className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {confirming === tx.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <CheckCheck className="w-3 h-3" />
                    }
                    התאם
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function BankPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<BankData | null>(null)
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [importing, setImporting] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState<{ message: string; success: boolean } | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [banner, setBanner] = useState<'connected' | 'error' | null>(
    searchParams.get('connected') ? 'connected' : searchParams.get('error') ? 'error' : null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter)
      const [bankRes, connRes] = await Promise.all([
        fetch(`/api/bank?${params}`),
        fetch('/api/bank/connections'),
      ])
      setData(await bankRes.json())
      setConnections(await connRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleSync(connectionId: string) {
    setSyncing(connectionId)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })
      const d = await res.json()
      setSyncMsg(`סונכרנו ${d.synced} עסקאות חדשות`)
      fetchAll()
    } finally {
      setSyncing(null)
    }
  }

  async function handleDisconnect(id: string) {
    await fetch(`/api/bank/connections?id=${id}`, { method: 'DELETE' })
    setConnections(prev => prev.filter(c => c.id !== id))
  }

  const handleImportDemo = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: SAMPLE_TRANSACTIONS }),
      })
      if (res.ok) fetchAll()
    } finally {
      setImporting(false)
    }
  }

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImporting(true)
    setCsvResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/bank/import-csv', { method: 'POST', body: formData })
      const json = await res.json()
      setCsvResult({ message: json.message || json.error || 'שגיאה', success: res.ok })
      if (res.ok) fetchAll()
    } catch {
      setCsvResult({ message: 'שגיאת רשת', success: false })
    }
    setCsvImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const activeConnections = connections.filter(c => c.status === 'active')
  const filtered = (data?.transactions ?? []).filter(tx =>
    categoryFilter === 'ALL' || tx.category === categoryFilter
  )
  const totalIncome   = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpenses = Math.abs(filtered.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))

  return (
    <div className="space-y-5">
      {/* Banner: connected / error */}
      {banner === 'connected' && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">הבנק חובר בהצלחה! מסנכרן עסקאות...</span>
          <button onClick={() => setBanner(null)} className="mr-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {banner === 'error' && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span>שגיאה בחיבור הבנק. אנא נסה שוב.</span>
          <button onClick={() => setBanner(null)} className="mr-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">חשבון בנק</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeConnections.length > 0
              ? `${activeConnections.length} בנקים מחוברים דרך Open Banking`
              : 'חבר בנק לסנכרון אוטומטי'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchAll} className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvImport} className="hidden" id="csv-upload" />
          <label htmlFor="csv-upload" className={clsx(
            'flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors cursor-pointer',
            csvImporting && 'opacity-50 pointer-events-none'
          )}>
            {csvImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            ייבוא CSV
          </label>
          <button onClick={handleImportDemo} disabled={importing} className="flex items-center gap-2 bg-slate-700 text-white text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            דמו
          </button>
          <Link href="/dashboard/bank/connect" className="flex items-center gap-2 bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-800 transition-colors">
            <Plus className="w-4 h-4" />
            חבר בנק
          </Link>
        </div>
      </div>

      {syncMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <CheckCircle className="w-4 h-4" />
          {syncMsg}
          <button onClick={() => setSyncMsg(null)} className="mr-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {csvResult && (
        <div className={clsx('flex items-center gap-2 px-4 py-3 rounded-xl text-sm',
          csvResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {csvResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{csvResult.message}</span>
          <button onClick={() => setCsvResult(null)} className="mr-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Connected banks */}
      {connections.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">בנקים מחוברים</p>
          <div className="space-y-2">
            {connections.map(conn => (
              <ConnectionCard
                key={conn.id}
                conn={conn}
                syncing={syncing === conn.id}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state — no connections and no transactions */}
      {connections.length === 0 && (data?.total ?? 0) === 0 && !loading && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 text-center">
          <Building2 className="w-12 h-12 text-blue-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700 mb-1">לא מחובר לבנק</p>
          <p className="text-sm text-slate-500 mb-4">חבר את חשבון הבנק שלך לסנכרון אוטומטי</p>
          <Link href="/dashboard/bank/connect" className="inline-flex items-center gap-2 bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-blue-800 transition-colors text-sm">
            <Plus className="w-4 h-4" />
            חיבור Open Banking
          </Link>
        </div>
      )}

      {/* Account cards */}
      {data?.accounts && data.accounts.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.accounts.map(account => (
            <div key={account.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{account.bankName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    חשבון {account.accountNumber}
                    {account.branchNumber && ` | סניף ${account.branchNumber}`}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-1">יתרה נוכחית</p>
                <p className={clsx('text-2xl font-bold', account.balance >= 0 ? 'text-slate-900' : 'text-red-600')}>
                  {formatILS(account.balance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reconciliation */}
      <ReconcilePanel onDone={fetchAll} />

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-green-600 font-medium">הכנסות בתקופה</p>
              <p className="text-lg font-bold text-green-700">{formatILS(totalIncome)}</p>
            </div>
          </div>
          <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-red-600 font-medium">הוצאות בתקופה</p>
              <p className="text-lg font-bold text-red-700">{formatILS(totalExpenses)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setCategoryFilter(f.value)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
              categoryFilter === f.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 && (data?.total ?? 0) > 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">אין עסקאות בקטגוריה זו</div>
      ) : filtered.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map(tx => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                )}>
                  {tx.amount > 0
                    ? <TrendingUp className="w-4 h-4 text-green-600" />
                    : <TrendingDown className="w-4 h-4 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{formatDate(tx.date)}</span>
                    {tx.category && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[tx.category] ?? 'bg-slate-100 text-slate-600'}`}>
                        {CATEGORY_LABELS[tx.category] ?? tx.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className={clsx('text-sm font-bold', tx.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                    {tx.amount > 0 ? '+' : ''}{formatILS(tx.amount)}
                  </p>
                  {tx.balance != null && (
                    <p className="text-xs text-slate-400">יתרה: {formatILS(tx.balance)}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {tx.isReconciled
                    ? <CheckCircle className="w-4 h-4 text-green-500" aria-label="מותאם" />
                    : <Circle className="w-4 h-4 text-slate-200" aria-label="לא מותאם" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

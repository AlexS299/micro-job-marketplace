'use client'

import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import {
  Building2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  CheckCircle,
  Circle,
  Download,
} from 'lucide-react'
import { formatILS, formatDate } from '@/lib/vat'

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  branchNumber?: string | null
  balance: number
  currency: string
  lastSyncAt?: string | null
}

interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  balance?: number | null
  category?: string | null
  reference?: string | null
  isReconciled: boolean
}

interface BankData {
  accounts: BankAccount[]
  transactions: BankTransaction[]
  totalBalance: number
  total: number
}

type CategoryFilter = 'ALL' | 'INCOME' | 'EXPENSE' | 'VAT' | 'SALARY' | 'TAX'

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'ALL', label: 'הכל' },
  { value: 'INCOME', label: 'הכנסות' },
  { value: 'EXPENSE', label: 'הוצאות' },
  { value: 'VAT', label: 'מע"מ' },
  { value: 'SALARY', label: 'שכר' },
  { value: 'TAX', label: 'מיסים' },
]

const CATEGORY_COLORS: Record<string, string> = {
  INCOME: 'bg-green-50 text-green-700',
  EXPENSE: 'bg-red-50 text-red-700',
  VAT: 'bg-purple-50 text-purple-700',
  SALARY: 'bg-blue-50 text-blue-700',
  TAX: 'bg-orange-50 text-orange-700',
  TRANSFER: 'bg-slate-50 text-slate-700',
  OTHER: 'bg-slate-50 text-slate-600',
}

const CATEGORY_LABELS: Record<string, string> = {
  INCOME: 'הכנסה',
  EXPENSE: 'הוצאה',
  VAT: 'מע"מ',
  SALARY: 'שכר',
  TAX: 'מס',
  TRANSFER: 'העברה',
  OTHER: 'אחר',
}

const SAMPLE_TRANSACTIONS = [
  { date: new Date().toISOString(), description: 'לקוח חדש - תשלום עבור פרויקט', amount: 7500, category: 'INCOME', balance: 55000 },
  { date: new Date(Date.now() - 86400000).toISOString(), description: 'שכר דירה משרד', amount: -4500, category: 'EXPENSE', balance: 47500 },
  { date: new Date(Date.now() - 172800000).toISOString(), description: 'אינטרנט עסקי', amount: -200, category: 'EXPENSE', balance: 52000 },
  { date: new Date(Date.now() - 259200000).toISOString(), description: 'תשלום לספק תוכנה', amount: -850, category: 'EXPENSE', balance: 52200 },
  { date: new Date(Date.now() - 345600000).toISOString(), description: 'הכנסה - שירותי ייעוץ', amount: 5000, category: 'INCOME', balance: 53050 },
]

export default function BankPage() {
  const [data, setData] = useState<BankData | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [importing, setImporting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter)
      const res = await fetch(`/api/bank?${params}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleImportDemo = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: SAMPLE_TRANSACTIONS }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  const filtered = data?.transactions.filter((tx) => {
    if (categoryFilter === 'ALL') return true
    return tx.category === categoryFilter
  }) || []

  const totalIncome = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpenses = Math.abs(filtered.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">חשבון בנק</h1>
          {data?.accounts?.[0]?.lastSyncAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              עדכון אחרון: {formatDate(data.accounts[0].lastSyncAt)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleImportDemo}
            disabled={importing}
            className="flex items-center gap-2 bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            ייבא עסקאות דמו
          </button>
        </div>
      </div>

      {/* Account cards */}
      {data?.accounts && data.accounts.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.accounts.map((account) => (
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
                <p className={clsx(
                  'text-2xl font-bold',
                  account.balance >= 0 ? 'text-slate-900' : 'text-red-600'
                )}>
                  {formatILS(account.balance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary row */}
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
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setCategoryFilter(f.value)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
              categoryFilter === f.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">אין תנועות בנקאיות</p>
          <p className="text-slate-400 text-sm mt-1">לחץ על &quot;ייבא עסקאות דמו&quot; כדי לראות דוגמה</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                {/* Amount indicator */}
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                  )}
                >
                  {tx.amount > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>

                {/* Description + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{formatDate(tx.date)}</span>
                    {tx.category && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[tx.category] || 'bg-slate-100 text-slate-600'}`}>
                        {CATEGORY_LABELS[tx.category] || tx.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance + amount */}
                <div className="text-left flex-shrink-0">
                  <p
                    className={clsx(
                      'text-sm font-bold',
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {formatILS(tx.amount)}
                  </p>
                  {tx.balance != null && (
                    <p className="text-xs text-slate-400">יתרה: {formatILS(tx.balance)}</p>
                  )}
                </div>

                {/* Reconciled indicator */}
                <div className="flex-shrink-0">
                  {tx.isReconciled ? (
                    <CheckCircle className="w-4 h-4 text-green-500" aria-label="reconciled" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-200" aria-label="not reconciled" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

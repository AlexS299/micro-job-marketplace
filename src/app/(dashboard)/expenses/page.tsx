'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, Camera, FileText, CheckCircle, AlertCircle, Trash2, Edit3, X, ScanLine } from 'lucide-react'
import { clsx } from 'clsx'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/document-scanner'

interface Expense {
  id: string
  vendor: string | null
  description: string | null
  date: string
  subtotal: number
  vatAmount: number
  total: number
  category: ExpenseCategory
  receiptNumber: string | null
  vatDeductible: boolean
  vatDeductiblePercent: number
  documentPath: string | null
  confidence: number | null
  status: string
  notes: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'ממתין לאישור', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'מאושר', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'נדחה', color: 'bg-red-100 text-red-700' },
}

const CATEGORY_COLORS: Record<string, string> = {
  OFFICE: 'bg-blue-50 text-blue-700',
  TRAVEL: 'bg-purple-50 text-purple-700',
  MEALS: 'bg-orange-50 text-orange-700',
  PROFESSIONAL: 'bg-indigo-50 text-indigo-700',
  MARKETING: 'bg-pink-50 text-pink-700',
  RENT: 'bg-teal-50 text-teal-700',
  UTILITIES: 'bg-cyan-50 text-cyan-700',
  INSURANCE: 'bg-slate-100 text-slate-700',
  SALARY: 'bg-emerald-50 text-emerald-700',
  SOFTWARE: 'bg-violet-50 text-violet-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

function formatILS(n: number) {
  return `₪${n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL')
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? 'bg-green-500' : pct >= 65 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-left">{pct}%</span>
    </div>
  )
}

function EditModal({ expense, onSave, onClose }: {
  expense: Expense
  onSave: (updated: Partial<Expense>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    vendor: expense.vendor || '',
    description: expense.description || '',
    date: expense.date.slice(0, 10),
    total: expense.total.toString(),
    subtotal: expense.subtotal.toString(),
    vatAmount: expense.vatAmount.toString(),
    category: expense.category,
    receiptNumber: expense.receiptNumber || '',
    vatDeductible: expense.vatDeductible,
    vatDeductiblePercent: expense.vatDeductiblePercent.toString(),
    notes: expense.notes || '',
    status: expense.status,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      ...form,
      total: Number(form.total),
      subtotal: Number(form.subtotal),
      vatAmount: Number(form.vatAmount),
      vatDeductiblePercent: Number(form.vatDeductiblePercent),
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">עריכת הוצאה</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">ספק</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">תיאור</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">תאריך</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">מספר קבלה</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.receiptNumber} onChange={e => setForm(f => ({ ...f, receiptNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">סכום לפני מע"מ (₪)</label>
              <input type="number" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">מע"מ (₪)</label>
              <input type="number" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.vatAmount} onChange={e => setForm(f => ({ ...f, vatAmount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">סה"כ (₪)</label>
              <input type="number" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">קטגוריה</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
                {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">ניכוי מע"מ %</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={form.vatDeductiblePercent} onChange={e => setForm(f => ({ ...f, vatDeductiblePercent: e.target.value, vatDeductible: e.target.value !== '0' }))}>
                <option value="100">100% (ניכוי מלא)</option>
                <option value="67">67% (כלי רכב)</option>
                <option value="0">0% (אין ניכוי)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">סטטוס</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="PENDING">ממתין לאישור</option>
                <option value="APPROVED">מאושר</option>
                <option value="REJECTED">נדחה</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">הערות</label>
              <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-700 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const [dragging, setDragging] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totals, setTotals] = useState({ total: 0, vatDeductible: 0 })
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const loadExpenses = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterCategory) params.set('category', filterCategory)
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/expenses?${params}`)
    if (res.ok) {
      const data = await res.json()
      setExpenses(data.expenses)
      setTotals(data.totals)
    }
  }, [filterCategory, filterStatus])

  useEffect(() => { loadExpenses() }, [loadExpenses])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('אנא העלה תמונה (JPG, PNG, WEBP)')
      return
    }
    setScanError(null)
    setPreview(URL.createObjectURL(file))
    setScanning(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/expenses/scan', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadExpenses()
      setPreview(null)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'שגיאה בסריקה')
      setPreview(null)
    } finally {
      setScanning(false)
    }
  }, [loadExpenses])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק הוצאה זו?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    await loadExpenses()
  }

  const handleSaveEdit = async (updated: Partial<Expense>) => {
    if (!editingExpense) return
    await fetch(`/api/expenses/${editingExpense.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setEditingExpense(null)
    await loadExpenses()
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ScanLine className="w-7 h-7 text-blue-700" />
          סריקת הוצאות
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          צלם קבלה או חשבונית — ה-AI יחלץ ויסווג את הנתונים אוטומטית
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className={clsx(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all mb-6',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50',
          scanning && 'opacity-60 pointer-events-none'
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {scanning ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center animate-pulse">
              <ScanLine className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">ה-AI סורק את המסמך...</p>
              <p className="text-sm text-slate-500 mt-1">מחלץ פרטים, מחשב מע"מ, מסווג קטגוריה</p>
            </div>
            {preview && (
              <img src={preview} alt="preview" className="max-h-32 rounded-xl shadow-md object-contain" />
            )}
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 mb-1">גרור קבלה לכאן</p>
            <p className="text-sm text-slate-400 mb-5">JPG, PNG, WEBP • עד 10MB</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                <FileText className="w-4 h-4" />
                בחר קובץ
              </button>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Camera className="w-4 h-4" />
                צלם קבלה
              </button>
            </div>
          </>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />

      {scanError && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {scanError}
        </div>
      )}

      {/* Summary Cards */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">סה"כ הוצאות</p>
            <p className="text-xl font-bold text-slate-900">{formatILS(totals.total)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{expenses.length} רשומות</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">מע"מ תשומות לניכוי</p>
            <p className="text-xl font-bold text-green-700">{formatILS(totals.vatDeductible)}</p>
            <p className="text-xs text-slate-400 mt-0.5">לקיזוז ממע"מ עסקאות</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {expenses.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="">כל הקטגוריות</option>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="">כל הסטטוסים</option>
            <option value="PENDING">ממתין לאישור</option>
            <option value="APPROVED">מאושר</option>
            <option value="REJECTED">נדחה</option>
          </select>
        </div>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">אין הוצאות עדיין</p>
          <p className="text-sm mt-1">העלה קבלה ראשונה כדי להתחיל</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(expense => (
            <div key={expense.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {expense.documentPath && (
                  <img
                    src={expense.documentPath}
                    alt="document"
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-slate-900 truncate">
                      {expense.vendor || 'ספק לא ידוע'}
                    </span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', CATEGORY_COLORS[expense.category])}>
                      {EXPENSE_CATEGORIES[expense.category]}
                    </span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_MAP[expense.status]?.color)}>
                      {STATUS_MAP[expense.status]?.label}
                    </span>
                  </div>
                  {expense.description && (
                    <p className="text-sm text-slate-600 mb-2 truncate">{expense.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    <span>{formatDate(expense.date)}</span>
                    {expense.receiptNumber && <span>#{expense.receiptNumber}</span>}
                    {expense.vatDeductible && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        ניכוי מע"מ {expense.vatDeductiblePercent}%
                      </span>
                    )}
                  </div>
                  {expense.confidence !== null && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-400 mb-1">דיוק סריקה</p>
                      <ConfidenceBar value={expense.confidence} />
                    </div>
                  )}
                  {expense.notes && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                      ⚠️ {expense.notes}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900">{formatILS(expense.total)}</p>
                  {expense.vatAmount > 0 && (
                    <p className="text-xs text-slate-400">מע"מ: {formatILS(expense.vatAmount)}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                <button
                  onClick={() => setEditingExpense(expense)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> עריכה
                </button>
                {expense.status === 'PENDING' && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/expenses/${expense.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'APPROVED' }),
                      })
                      await loadExpenses()
                    }}
                    className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> אשר
                  </button>
                )}
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors mr-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> מחק
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingExpense && (
        <EditModal
          expense={editingExpense}
          onSave={handleSaveEdit}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </div>
  )
}

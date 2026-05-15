'use client'

import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { Plus, Trash2, X, Loader2, Calculator } from 'lucide-react'
import { calculateVAT, formatILS } from '@/lib/vat'
import type { Client, InvoiceType } from '@/types'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  vatIncluded: boolean
}

interface InvoiceFormProps {
  onClose: () => void
  onSuccess: () => void
}

const INVOICE_TYPES: Array<{ value: InvoiceType; label: string }> = [
  { value: 'TAX_INVOICE', label: 'חשבונית מס' },
  { value: 'COMBINED', label: 'חשבונית מס/קבלה' },
  { value: 'RECEIPT', label: 'קבלה' },
  { value: 'CREDIT_NOTE', label: 'זיכוי' },
]

export default function InvoiceForm({ onClose, onSuccess }: InvoiceFormProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('TAX_INVOICE')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, vatIncluded: false },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setClients(data)
      })
      .catch(console.error)
  }, [])

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, vatIncluded: false }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number | boolean) => {
    setItems(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      const lineTotal = item.quantity * item.unitPrice
      const { net, vat } = calculateVAT(lineTotal, item.vatIncluded)
      return {
        subtotal: acc.subtotal + net,
        vat: acc.vat + vat,
        total: acc.total + net + vat,
      }
    },
    { subtotal: 0, vat: 0, total: 0 }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedClientId && !newClientName.trim()) {
      setError('יש לבחור לקוח קיים או להזין שם לקוח חדש')
      return
    }

    const hasInvalidItems = items.some((item) => !item.description.trim() || item.unitPrice <= 0)
    if (hasInvalidItems) {
      setError('יש למלא תיאור ומחיר לכל הפריטים')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId || undefined,
          clientName: !selectedClientId ? newClientName.trim() : undefined,
          type: invoiceType,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            vatIncluded: item.vatIncluded,
          })),
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'שגיאה ביצירת חשבונית')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת חשבונית')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">חשבונית חדשה</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Client selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">לקוח</label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value)
                  if (e.target.value) setNewClientName('')
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">-- בחר לקוח קיים --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {!selectedClientId && (
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="או הזן שם לקוח חדש"
                  className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>

            {/* Invoice type + Due date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">סוג מסמך</label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {INVOICE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">תאריך פירעון</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  style={{ direction: 'ltr' }}
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">פריטים</label>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  הוסף פריט
                </button>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 mb-1 px-1">
                <span className="col-span-5">תיאור</span>
                <span className="col-span-2 text-center">כמות</span>
                <span className="col-span-3 text-center">מחיר</span>
                <span className="col-span-1 text-center">מע"מ</span>
                <span className="col-span-1" />
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="תיאור שירות/מוצר"
                      className="col-span-5 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      required
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                      min={0.01}
                      step={0.01}
                      className="col-span-2 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-blue-400"
                    />
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min={0}
                      step={0.01}
                      placeholder="₪"
                      className="col-span-3 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-blue-400"
                    />
                    <div className="col-span-1 flex justify-center">
                      <input
                        type="checkbox"
                        checked={item.vatIncluded}
                        onChange={(e) => updateItem(index, 'vatIncluded', e.target.checked)}
                        title="מחיר כולל מע&quot;מ"
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="col-span-1 flex justify-center text-slate-300 hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">סמן את תיבת &quot;מע&quot;מ&quot; אם המחיר כבר כולל מע&quot;מ</p>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">חישוב אוטומטי</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>סכום לפני מע&quot;מ:</span>
                <span className="font-medium">{formatILS(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>מע&quot;מ (18%):</span>
                <span className="font-medium">{formatILS(totals.vat)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
                <span>סה&quot;כ לתשלום:</span>
                <span className="text-blue-700">{formatILS(totals.total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">הערות</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="הערות נוספות לחשבונית (אופציונלי)"
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-400 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors',
                loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-800'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  יוצר...
                </>
              ) : (
                'צור חשבונית'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

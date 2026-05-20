'use client'

import { useEffect, useState } from 'react'
import { formatILS, formatDate } from '@/lib/vat'

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'

interface QuoteItem {
  id: string; description: string; quantity: number; unitPrice: number; total: number; vatIncluded: boolean
}

interface Quote {
  id: string; quoteNumber: string; status: QuoteStatus
  total: number; subtotal: number; vatAmount: number; vatRate: number
  issueDate: string; validUntil: string; sentAt: string | null; acceptedAt: string | null
  notes: string | null; terms: string | null
  client: { name: string } | null
  items: QuoteItem[]
  convertedToInvoiceId: string | null
  token: string
}

const STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: 'טיוטה', SENT: 'נשלחה', ACCEPTED: 'אושרה', DECLINED: 'נדחתה', EXPIRED: 'פגה',
}
const STATUS_COLOR: Record<QuoteStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-600',
  EXPIRED: 'bg-orange-100 text-orange-600',
}

const emptyForm = {
  clientName: '', notes: '', terms: '', validDays: 30,
  items: [{ description: '', quantity: 1, unitPrice: 0, vatIncluded: false }],
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Quote | null>(null)
  const [converting, setConverting] = useState(false)
  const [sending, setSending] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    setBaseUrl(window.location.origin)
    loadQuotes()
  }, [])

  const loadQuotes = () =>
    fetch('/api/quotes').then(r => r.json()).then(setQuotes).finally(() => setLoading(false))

  const ils = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n)

  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unitPrice: 0, vatIncluded: false }] }))

  const removeItem = (i: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const updateItem = (i: number, field: string, value: string | number | boolean) =>
    setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }))

  const calcTotal = () => {
    const sub = form.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
    return { subtotal: sub, vat: sub * 0.18, total: sub * 1.18 }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: form.clientName, notes: form.notes, terms: form.terms, validDays: form.validDays, items: form.items }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm(emptyForm)
      loadQuotes()
    }
    setSaving(false)
  }

  const handleSend = async (quote: Quote) => {
    const email = prompt(`שלח הצעה ${quote.quoteNumber} לאיזה מייל?`, quote.client?.name ?? '')
    if (!email) return
    setSending(true)
    await fetch(`/api/quotes/${quote.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSending(false)
    loadQuotes()
  }

  const handleConvert = async (quote: Quote) => {
    if (!confirm(`להמיר את ${quote.quoteNumber} לחשבונית מס?`)) return
    setConverting(true)
    const res = await fetch(`/api/quotes/${quote.id}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const data = await res.json()
    setConverting(false)
    if (res.ok) {
      alert(`✅ חשבונית ${data.invoice.invoiceNumber} נוצרה!`)
      loadQuotes()
      setSelected(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק הצעה זו?')) return
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    loadQuotes()
    setSelected(null)
  }

  const totals = calcTotal()

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">הצעות מחיר</h1>
          <p className="text-slate-500 text-sm mt-0.5">צור הצעות מחיר, שלח ללקוחות, ובלחיצה אחת המר לחשבונית.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          + הצעה חדשה
        </button>
      </div>

      {/* Stats bar */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {(['DRAFT','SENT','ACCEPTED','DECLINED'] as QuoteStatus[]).map(s => {
            const count = quotes.filter(q => q.status === s).length
            const total = quotes.filter(q => q.status === s).reduce((acc, q) => acc + q.total, 0)
            return (
              <div key={s} className={`rounded-xl p-4 ${STATUS_COLOR[s].replace('text-', 'border-').replace('-100', '-200').replace('border-', 'bg-').split(' ')[0]}10 border`}>
                <p className={`text-xs font-medium mb-1 ${STATUS_COLOR[s].split(' ')[1]}`}>{STATUS_LABEL[s]}</p>
                <p className="text-xl font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-500">{ils(total)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Quotes list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">טוען...</div>
      ) : quotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">אין הצעות מחיר עדיין</h2>
          <p className="text-slate-400 mb-6">צור הצעת מחיר ושלח ללקוח לאישור</p>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700">
            + צור הצעה ראשונה
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-right p-4 font-semibold text-slate-600">מספר</th>
                <th className="text-right p-4 font-semibold text-slate-600">לקוח</th>
                <th className="text-right p-4 font-semibold text-slate-600">תאריך</th>
                <th className="text-right p-4 font-semibold text-slate-600">תקף עד</th>
                <th className="text-right p-4 font-semibold text-slate-600">סכום</th>
                <th className="text-right p-4 font-semibold text-slate-600">סטטוס</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(q)}>
                  <td className="p-4 font-medium text-blue-700">{q.quoteNumber}</td>
                  <td className="p-4 text-slate-700">{q.client?.name ?? '—'}</td>
                  <td className="p-4 text-slate-500">{formatDate(q.issueDate)}</td>
                  <td className="p-4 text-slate-500">{formatDate(q.validUntil)}</td>
                  <td className="p-4 font-semibold text-slate-900">{ils(q.total)}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[q.status] ?? ''}`}>
                      {STATUS_LABEL[q.status] ?? q.status}
                    </span>
                  </td>
                  <td className="p-4 text-left">
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      {q.status === 'DRAFT' && (
                        <button onClick={() => handleSend(q)} disabled={sending}
                          className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded font-medium">
                          שלח
                        </button>
                      )}
                      {(q.status === 'ACCEPTED' && !q.convertedToInvoiceId) && (
                        <button onClick={() => handleConvert(q)} disabled={converting}
                          className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded font-medium">
                          המר לחשבונית
                        </button>
                      )}
                      {q.convertedToInvoiceId && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">הומרה ✓</span>
                      )}
                      {q.status === 'DRAFT' && (
                        <button onClick={() => handleDelete(q.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-1 py-1">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quote detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">הצעת מחיר</p>
                <h2 className="text-xl font-bold">{selected.quoteNumber}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-blue-200 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500">לקוח</p><p className="font-semibold">{selected.client?.name ?? '—'}</p></div>
                <div><p className="text-slate-500">סטטוס</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[selected.status] ?? ''}`}>
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                </div>
                <div><p className="text-slate-500">תקף עד</p><p className="font-semibold">{formatDate(selected.validUntil)}</p></div>
                <div><p className="text-slate-500">סה"כ</p><p className="font-bold text-blue-600">{ils(selected.total)}</p></div>
              </div>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-right p-2 font-medium text-slate-500">תיאור</th>
                      <th className="text-center p-2 font-medium text-slate-500">כמות</th>
                      <th className="text-left p-2 font-medium text-slate-500">סכום</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-left">{ils(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-sm space-y-1 text-left">
                <div className="flex justify-between"><span className="text-slate-500">לפני מע"מ</span><span>{ils(selected.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">מע"מ</span><span>{ils(selected.vatAmount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>סה"כ</span><span className="text-blue-600">{ils(selected.total)}</span></div>
              </div>

              {/* Public link */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">לינק ציבורי לאישור לקוח</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-blue-700 flex-1 truncate">{baseUrl}/quote/{selected.token}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${baseUrl}/quote/${selected.token}`)}
                    className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded flex-shrink-0">
                    העתק
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {selected.status === 'DRAFT' && (
                  <button onClick={() => { handleSend(selected); setSelected(null) }} disabled={sending}
                    className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700">
                    שלח לאישור
                  </button>
                )}
                {selected.status === 'ACCEPTED' && !selected.convertedToInvoiceId && (
                  <button onClick={() => handleConvert(selected)} disabled={converting}
                    className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl hover:bg-green-700">
                    המר לחשבונית מס
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">הצעת מחיר חדשה</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">שם לקוח</label>
                  <input value={form.clientName} onChange={e => setForm(f => ({...f, clientName: e.target.value}))}
                    placeholder="שם הלקוח" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תוקף (ימים)</label>
                  <input type="number" value={form.validDays} min={1} max={365}
                    onChange={e => setForm(f => ({...f, validDays: Number(e.target.value)}))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">פריטים</label>
                  <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ הוסף פריט</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={item.description} onChange={e => updateItem(i,'description',e.target.value)}
                        placeholder="תיאור" className="col-span-5 border rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
                      <input type="number" value={item.quantity} min={0.01} step="0.01"
                        onChange={e => updateItem(i,'quantity',Number(e.target.value))}
                        className="col-span-2 border rounded-lg px-2 py-1.5 text-sm text-center focus:ring-1 focus:ring-blue-500" />
                      <input type="number" value={item.unitPrice} min={0} step="0.01"
                        onChange={e => updateItem(i,'unitPrice',Number(e.target.value))}
                        placeholder="מחיר" className="col-span-3 border rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500" />
                      <span className="col-span-1 text-xs text-slate-500 text-left">{formatILS(item.quantity * item.unitPrice)}</span>
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-red-400 hover:text-red-600 text-center">✕</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-left text-slate-500">
                  לפני מע"מ: {ils(totals.subtotal)} · מע"מ: {ils(totals.vat)} · <span className="font-bold text-slate-900">סה"כ: {ils(totals.total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">הערות (אופציונלי)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  rows={2} placeholder="הערות להצעה..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תנאים (אופציונלי)</label>
                <textarea value={form.terms} onChange={e => setForm(f => ({...f, terms: e.target.value}))}
                  rows={2} placeholder="תנאי תשלום, ביטול..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors">
                  {saving ? 'יוצר...' : 'צור הצעה'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border rounded-xl text-slate-600 hover:bg-slate-50">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

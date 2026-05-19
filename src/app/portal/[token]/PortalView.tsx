'use client'

import { useState } from 'react'

interface PaymentLink {
  id: string; providerUrl: string; amount: number; status: string
}

interface Invoice {
  id: string; invoiceNumber: string; type: string; status: string
  issueDate: string; dueDate: string | null; total: number; currency: string
  pdfUrl: string | null; paymentLinks: PaymentLink[]
}

interface Quote {
  id: string; quoteNumber: string; status: string; issueDate: string
  validUntil: string | null; total: number; currency: string; token: string
}

interface PortalData {
  client: { name: string; email: string | null; phone: string | null; city: string | null }
  business: { name: string; email: string | null; phone: string | null; vatNumber: string | null }
  invoices: Invoice[]
  quotes: Quote[]
}

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  SENT:      { label: 'ממתין לתשלום', cls: 'bg-amber-100 text-amber-700' },
  OVERDUE:   { label: 'באיחור',       cls: 'bg-red-100 text-red-700' },
  PAID:      { label: 'שולם',         cls: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'בוטל',         cls: 'bg-slate-100 text-slate-500' },
}

const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  SENT:      { label: 'ממתין לאישור', cls: 'bg-blue-100 text-blue-700' },
  ACCEPTED:  { label: 'אושרה',        cls: 'bg-green-100 text-green-700' },
  DECLINED:  { label: 'נדחתה',        cls: 'bg-red-100 text-red-700' },
  EXPIRED:   { label: 'פג תוקף',      cls: 'bg-slate-100 text-slate-500' },
  CONVERTED: { label: 'הפכה לחשבונית', cls: 'bg-purple-100 text-purple-700' },
}

function fmt(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0 }).format(amount)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL')
}

export default function PortalView({ data }: { data: PortalData }) {
  const [tab, setTab] = useState<'invoices' | 'quotes'>('invoices')
  const [quoteAction, setQuoteAction] = useState<Record<string, 'pending' | 'done'>>({})

  const respondQuote = async (token: string, action: 'accept' | 'decline') => {
    setQuoteAction(prev => ({ ...prev, [token]: 'pending' }))
    await fetch(`/api/quotes/respond/${token}?action=${action}`, { method: 'POST' })
    setQuoteAction(prev => ({ ...prev, [token]: 'done' }))
    window.location.reload()
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            {data.business.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-lg">{data.business.name}</h1>
            {data.business.vatNumber && (
              <p className="text-xs text-slate-400">עוסק מורשה {data.business.vatNumber}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Client greeting */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-slate-500 text-sm">שלום,</p>
          <h2 className="text-2xl font-bold text-slate-900">{data.client.name}</h2>
          {data.client.city && <p className="text-slate-400 text-sm mt-0.5">{data.client.city}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setTab('invoices')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'invoices' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            חשבוניות ({data.invoices.length})
          </button>
          <button
            onClick={() => setTab('quotes')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'quotes' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            הצעות מחיר ({data.quotes.length})
          </button>
        </div>

        {/* Invoices tab */}
        {tab === 'invoices' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {data.invoices.length === 0 ? (
              <p className="text-center py-12 text-slate-400">אין חשבוניות</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.invoices.map(inv => {
                  const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, cls: 'bg-slate-100 text-slate-500' }
                  const payLink = inv.paymentLinks[0]
                  return (
                    <div key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-800">{inv.invoiceNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {fmtDate(inv.issueDate)}
                          {inv.dueDate && ` · לתשלום: ${fmtDate(inv.dueDate)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-lg">{fmt(inv.total)}</span>
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-500 hover:text-blue-600 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            PDF
                          </a>
                        )}
                        {payLink && (inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                          <a
                            href={payLink.providerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                          >
                            שלם עכשיו
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Quotes tab */}
        {tab === 'quotes' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {data.quotes.length === 0 ? (
              <p className="text-center py-12 text-slate-400">אין הצעות מחיר</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.quotes.map(q => {
                  const st = QUOTE_STATUS[q.status] ?? { label: q.status, cls: 'bg-slate-100 text-slate-500' }
                  const isDone = quoteAction[q.token] === 'done'
                  const isPending = quoteAction[q.token] === 'pending'
                  return (
                    <div key={q.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-800">{q.quoteNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {fmtDate(q.issueDate)}
                          {q.validUntil && ` · תוקף עד: ${fmtDate(q.validUntil)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-lg">{fmt(q.total)}</span>
                        {q.status === 'SENT' && !isDone && (
                          <div className="flex gap-2">
                            <button
                              disabled={isPending}
                              onClick={() => respondQuote(q.token, 'accept')}
                              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                            >
                              {isPending ? '...' : 'אשר'}
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => respondQuote(q.token, 'decline')}
                              className="border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                            >
                              דחה
                            </button>
                          </div>
                        )}
                        {isDone && <span className="text-sm text-green-600 font-medium">נשמר!</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-4">
          {data.business.email && <span>{data.business.email}</span>}
          {data.business.phone && <span> · {data.business.phone}</span>}
        </div>
      </div>
    </div>
  )
}

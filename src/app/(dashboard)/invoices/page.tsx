'use client'

import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import {
  Plus,
  Download,
  Send,
  X,
  Search,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { formatILS, formatDate } from '@/lib/vat'
import { STATUS_COLORS, INVOICE_STATUS_LABELS, INVOICE_TYPE_LABELS } from '@/types'
import type { Invoice, InvoiceStatus, InvoiceType } from '@/types'
import dynamic from 'next/dynamic'

const InvoiceForm = dynamic(() => import('@/components/InvoiceForm'), { ssr: false })

type StatusFilter = 'ALL' | InvoiceStatus

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'הכל' },
  { value: 'DRAFT', label: 'טיוטה' },
  { value: 'SENT', label: 'נשלח' },
  { value: 'PAID', label: 'שולם' },
  { value: 'OVERDUE', label: 'באיחור' },
  { value: 'CANCELLED', label: 'בוטל' },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const res = await fetch(`/api/invoices?${params}`)
      const data = await res.json()
      setInvoices(data.invoices || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.client?.name?.toLowerCase().includes(q) ||
      String(inv.total).includes(q)
    )
  })

  const handleDownloadPDF = async (id: string, invoiceNumber: string) => {
    setActionLoading(`pdf-${id}`)
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendEmail = async (id: string, email?: string | null) => {
    const targetEmail = email || prompt('הזן כתובת אימייל לשליחה:')
    if (!targetEmail) return

    setActionLoading(`send-${id}`)
    try {
      const res = await fetch(`/api/invoices/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })
      if (res.ok) {
        alert('החשבונית נשלחה בהצלחה!')
        fetchInvoices()
      } else {
        const err = await res.json()
        alert(`שגיאה: ${err.error}`)
      }
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('האם לבטל את החשבונית?')) return
    setActionLoading(`cancel-${id}`)
    try {
      await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      fetchInvoices()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkPaid = async (id: string) => {
    setActionLoading(`paid-${id}`)
    try {
      await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      fetchInvoices()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const totalOutstanding = filteredInvoices
    .filter((i) => ['SENT', 'OVERDUE'].includes(i.status))
    .reduce((s, i) => s + i.total, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">חשבוניות</h1>
          {totalOutstanding > 0 && (
            <p className="text-sm text-orange-600 mt-0.5">
              {formatILS(totalOutstanding)} ממתין לגבייה
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchInvoices}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            חשבונית חדשה
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === f.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Invoice list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">אין חשבוניות</p>
          <p className="text-slate-400 text-sm mt-1">לחץ על &quot;חשבונית חדשה&quot; כדי להתחיל</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-slate-900 text-sm">
                      {inv.invoiceNumber}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status as InvoiceStatus]}`}
                    >
                      {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus]}
                    </span>
                    <span className="text-xs text-slate-400">
                      {INVOICE_TYPE_LABELS[inv.type as InvoiceType]}
                    </span>
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    {inv.client?.name || 'לקוח לא צוין'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>הונפקה: {formatDate(inv.issueDate)}</span>
                    {inv.dueDate && <span>פירעון: {formatDate(inv.dueDate)}</span>}
                    {inv.emailSentAt && <span className="text-green-600">נשלחה</span>}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-left flex-shrink-0">
                  <p className="text-lg font-bold text-slate-900">{formatILS(inv.total)}</p>
                  <p className="text-xs text-slate-400">
                    מע&quot;מ: {formatILS(inv.vatAmount)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-50">
                <button
                  onClick={() => handleDownloadPDF(inv.id, inv.invoiceNumber)}
                  disabled={actionLoading === `pdf-${inv.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading === `pdf-${inv.id}` ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  הורד PDF
                </button>

                {['DRAFT', 'SENT', 'OVERDUE'].includes(inv.status) && (
                  <button
                    onClick={() => handleSendEmail(inv.id, inv.client?.email)}
                    disabled={actionLoading === `send-${inv.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `send-${inv.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    שלח
                  </button>
                )}

                {['SENT', 'OVERDUE'].includes(inv.status) && (
                  <button
                    onClick={() => handleMarkPaid(inv.id)}
                    disabled={actionLoading === `paid-${inv.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `paid-${inv.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    סמן כשולם
                  </button>
                )}

                {!['CANCELLED', 'PAID'].includes(inv.status) && (
                  <button
                    onClick={() => handleCancel(inv.id)}
                    disabled={actionLoading === `cancel-${inv.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `cancel-${inv.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    בטל
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Form Modal */}
      {showForm && (
        <InvoiceForm
          onClose={() => setShowForm(false)}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  )
}

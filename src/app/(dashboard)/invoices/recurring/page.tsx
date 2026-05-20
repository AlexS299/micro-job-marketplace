'use client'

import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import {
  RefreshCw,
  Loader2,
  Plus,
  Play,
  Pause,
  X,
  Calendar,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { formatILS, formatDate } from '@/lib/vat'

interface Client {
  id: string
  name: string
  email?: string | null
}

interface RecurringItem {
  description: string
  quantity: number
  unitPrice: number
}

interface RecurringInvoice {
  id: string
  description: string
  items: string
  frequency: string
  dayOfMonth: number
  nextRunDate: string
  isActive: boolean
  lastRunAt?: string | null
  emailReminder: boolean
  reminderDays: number
  client?: Client | null
}

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: 'חודשי',
  QUARTERLY: 'רבעוני',
  YEARLY: 'שנתי',
}

const FREQUENCY_OPTIONS = [
  { value: 'MONTHLY', label: 'חודשי' },
  { value: 'QUARTERLY', label: 'רבעוני' },
  { value: 'YEARLY', label: 'שנתי' },
]

export default function RecurringInvoicesPage() {
  const [recurring, setRecurring] = useState<RecurringInvoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<{ generated: number; invoices: Array<{ invoiceNumber: string; clientName?: string; total: number }> } | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [formDescription, setFormDescription] = useState('')
  const [formClientId, setFormClientId] = useState('')
  const [formFrequency, setFormFrequency] = useState('MONTHLY')
  const [formDayOfMonth, setFormDayOfMonth] = useState(1)
  const [formEmailReminder, setFormEmailReminder] = useState(true)
  const [formReminderDays, setFormReminderDays] = useState(7)
  const [formItems, setFormItems] = useState<RecurringItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])
  const [formSaving, setFormSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recRes, clientRes] = await Promise.all([
        fetch('/api/invoices/recurring'),
        fetch('/api/clients'),
      ])
      const [recData, clientData] = await Promise.all([recRes.json(), clientRes.json()])
      setRecurring(Array.isArray(recData) ? recData : [])
      setClients(Array.isArray(clientData) ? clientData : (clientData.clients || []))
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleToggle(id: string, isActive: boolean) {
    try {
      const res = await fetch('/api/invoices/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      })
      if (res.ok) {
        setRecurring(prev => prev.map(r => r.id === id ? { ...r, isActive: !isActive } : r))
      }
    } catch (e) { console.error(e) }
  }

  async function handleDelete(id: string) {
    if (!confirm('האם למחוק חשבונית חוזרת זו?')) return
    try {
      await fetch(`/api/invoices/recurring?id=${id}`, { method: 'DELETE' })
      setRecurring(prev => prev.filter(r => r.id !== id))
    } catch (e) { console.error(e) }
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenResult(null)
    setStatusMsg(null)
    try {
      const res = await fetch('/api/invoices/recurring/generate', { method: 'POST' })
      const data = await res.json()
      setGenResult(data)
      if (data.generated > 0) {
        setStatusMsg({ type: 'success', text: `נוצרו ${data.generated} חשבוניות בהצלחה` })
        fetchData()
      } else {
        setStatusMsg({ type: 'success', text: 'אין חשבוניות לייצור כרגע' })
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'שגיאה בייצור חשבוניות' })
    }
    setGenerating(false)
  }

  function addItem() {
    setFormItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function updateItem(index: number, field: keyof RecurringItem, value: string | number) {
    setFormItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setFormItems(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formDescription || formItems.length === 0) return
    setFormSaving(true)
    try {
      const res = await fetch('/api/invoices/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formDescription,
          clientId: formClientId || null,
          frequency: formFrequency,
          dayOfMonth: formDayOfMonth,
          items: formItems,
          emailReminder: formEmailReminder,
          reminderDays: formReminderDays,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setFormDescription('')
        setFormClientId('')
        setFormFrequency('MONTHLY')
        setFormDayOfMonth(1)
        setFormItems([{ description: '', quantity: 1, unitPrice: 0 }])
        fetchData()
      }
    } catch (e) { console.error(e) }
    setFormSaving(false)
  }

  const totalMonthly = recurring
    .filter(r => r.isActive)
    .reduce((sum, r) => {
      const items = JSON.parse(r.items) as RecurringItem[]
      const subtotal = items.reduce((s, item) => s + item.unitPrice * item.quantity, 0)
      return sum + subtotal * 1.18 // with VAT
    }, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">חשבוניות חוזרות</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {recurring.filter(r => r.isActive).length} פעילות | הכנסה חזויה: {formatILS(totalMonthly)}/חודש
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
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            הרץ עכשיו
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            חדש
          </button>
        </div>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div className={clsx(
          'flex items-center gap-2 px-4 py-3 rounded-xl text-sm',
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {statusMsg.type === 'success'
            ? <CheckCircle className="w-4 h-4" />
            : <AlertCircle className="w-4 h-4" />
          }
          {statusMsg.text}
          {genResult && genResult.invoices.length > 0 && (
            <span className="mr-2 text-xs">
              {genResult.invoices.map(inv => inv.invoiceNumber).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 text-sm">חשבונית חוזרת חדשה</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">תיאור *</label>
              <input
                type="text"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                required
                placeholder="שירותי ייעוץ חודשיים"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">לקוח</label>
              <select
                value={formClientId}
                onChange={e => setFormClientId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">ללא לקוח ספציפי</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">תדירות</label>
              <select
                value={formFrequency}
                onChange={e => setFormFrequency(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">יום בחודש</label>
              <input
                type="number"
                min={1}
                max={28}
                value={formDayOfMonth}
                onChange={e => setFormDayOfMonth(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">תזכורת (ימים לפני)</label>
              <input
                type="number"
                min={0}
                max={30}
                value={formReminderDays}
                onChange={e => setFormReminderDays(Number(e.target.value))}
                disabled={!formEmailReminder}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="emailReminder"
                checked={formEmailReminder}
                onChange={e => setFormEmailReminder(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              <label htmlFor="emailReminder" className="text-sm text-slate-700">שלח תזכורת במייל</label>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">פריטים</label>
              <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus className="w-3 h-3" /> הוסף פריט
              </button>
            </div>
            <div className="space-y-2">
              {formItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(index, 'description', e.target.value)}
                    placeholder="תיאור"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                    min={1}
                    placeholder="כמות"
                    className="w-16 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))}
                    min={0}
                    placeholder="מחיר"
                    className="w-24 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formItems.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={formSaving}
              className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              צור חשבונית חוזרת
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ביטול
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">אין חשבוניות חוזרות</p>
          <p className="text-slate-400 text-sm mt-1">לחץ על &quot;חדש&quot; כדי ליצור חשבונית חוזרת ראשונה</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {recurring.map(r => {
              const items = JSON.parse(r.items) as RecurringItem[]
              const subtotal = items.reduce((s, item) => s + item.unitPrice * item.quantity, 0)
              const total = subtotal * 1.18

              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  {/* Active indicator */}
                  <div className={clsx(
                    'w-2 h-10 rounded-full flex-shrink-0',
                    r.isActive ? 'bg-green-500' : 'bg-slate-200'
                  )} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{r.description}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {r.client && (
                        <span className="text-xs text-slate-500">{r.client.name}</span>
                      )}
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {FREQUENCY_LABELS[r.frequency] || r.frequency}
                      </span>
                      <span className="text-xs text-slate-400">
                        יום {r.dayOfMonth} בחודש
                      </span>
                      <span className="text-xs text-slate-400">
                        הבא: {formatDate(r.nextRunDate)}
                      </span>
                    </div>
                    {r.lastRunAt && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        הופעל לאחרונה: {formatDate(r.lastRunAt)}
                      </p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="text-left flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900">{formatILS(total)}</p>
                    <p className="text-xs text-slate-400">כולל מע&quot;מ</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(r.id, r.isActive)}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        r.isActive
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-green-600 hover:bg-green-50'
                      )}
                      title={r.isActive ? 'השהה' : 'הפעל'}
                    >
                      {r.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="מחק"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

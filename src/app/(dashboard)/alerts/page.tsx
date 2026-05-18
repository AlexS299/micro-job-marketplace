'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bell, ChevronRight, RefreshCw, Sparkles, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { Alert, AlertSeverity } from '@/lib/alerts'

const SEVERITY_CFG: Record<AlertSeverity, { bg: string; border: string; dot: string; badge: string; label: string }> = {
  critical:    { bg: 'bg-red-50',     border: 'border-red-200',    dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    label: 'קריטי' },
  warning:     { bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700', label: 'אזהרה' },
  opportunity: { bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700', label: 'הזדמנות' },
  info:        { bg: 'bg-blue-50',    border: 'border-blue-100',   dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700',  label: 'מידע' },
}

const CATEGORY_ICON: Record<string, string> = {
  tax: '🏛️', cashflow: '💰', invoices: '🧾', payroll: '👥', expenses: '📄', insights: '💡',
}

function AlertCard({ alert, dismissed, onDismiss }: {
  alert: Alert
  dismissed: boolean
  onDismiss: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const cfg = SEVERITY_CFG[alert.severity]

  async function analyzeAlert() {
    if (analysis) { setExpanded(!expanded); return }
    setExpanded(true)
    setAnalyzing(true)
    const res = await fetch('/api/alerts/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    })
    if (!res.body) { setAnalyzing(false); return }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      setAnalysis(text)
    }
    setAnalyzing(false)
  }

  if (dismissed) return null

  return (
    <div className={clsx('border rounded-2xl overflow-hidden transition-all', cfg.border, cfg.bg)}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={clsx('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', cfg.dot)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg leading-none">{CATEGORY_ICON[alert.category]}</span>
              <p className="font-semibold text-slate-900 text-sm">{alert.title}</p>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0', cfg.badge)}>
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-slate-600">{alert.message}</p>
            {alert.detail && (
              <p className="text-xs text-slate-400 mt-1">{alert.detail}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className="p-1 rounded-lg hover:bg-white/70 text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-3 mr-5">
          <button
            onClick={analyzeAlert}
            className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            {analyzing ? 'מנתח...' : expanded ? 'הסתר ניתוח' : 'נתח עם AI'}
          </button>
          {alert.actionHref && (
            <Link
              href={alert.actionHref}
              className="flex items-center gap-1 text-xs bg-slate-800 text-white px-3 py-1.5 rounded-xl hover:bg-slate-700 transition-colors"
            >
              {alert.actionLabel}
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/60 bg-white/50 p-4">
          {analyzing && !analysis ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
              רואה מנתח...
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-700 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pr-4 [&_ol]:list-decimal [&_ol]:pr-4 [&_strong]:font-semibold [&_p]:mb-2">
              {analysis.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>
                if (line.startsWith('**') && line.endsWith('**')) return <p key={i}><strong>{line.slice(2, -2)}</strong></p>
                if (/^\d+\. /.test(line)) return <p key={i} className="mr-4">{line}</p>
                return line ? <p key={i}>{line}</p> : <br key={i} />
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/alerts')
    if (res.ok) setAlerts(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const saved = localStorage.getItem('dismissed-alerts')
    if (saved) setDismissed(new Set(JSON.parse(saved)))
  }, [load])

  function dismiss(id: string) {
    const next = new Set([...dismissed, id])
    setDismissed(next)
    localStorage.setItem('dismissed-alerts', JSON.stringify([...next]))
  }

  const visible = alerts.filter(a => !dismissed.has(a.id))
  const filtered = filter === 'all' ? visible : visible.filter(a =>
    filter === 'critical' ? a.severity === 'critical' :
    filter === 'warning'  ? a.severity === 'warning' :
    filter === 'opportunity' ? a.severity === 'opportunity' :
    a.category === filter
  )

  const criticalCount = visible.filter(a => a.severity === 'critical').length

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-700" />
            התראות חכמות
            {criticalCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {criticalCount}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {visible.length} התראות פעילות · AI מנתח את העסק שלך בזמן אמת
          </p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
          <RefreshCw className={clsx('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { id: 'all', label: 'הכל', count: visible.length },
          { id: 'critical', label: 'קריטי', count: visible.filter(a => a.severity === 'critical').length },
          { id: 'warning', label: 'אזהרה', count: visible.filter(a => a.severity === 'warning').length },
          { id: 'opportunity', label: 'הזדמנות', count: visible.filter(a => a.severity === 'opportunity').length },
          { id: 'tax', label: '🏛️ מס', count: visible.filter(a => a.category === 'tax').length },
          { id: 'cashflow', label: '💰 תזרים', count: visible.filter(a => a.category === 'cashflow').length },
        ].filter(f => f.count > 0 || f.id === 'all').map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
              filter === f.id ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            {f.label} {f.count > 0 && <span className="opacity-70">({f.count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          סורק את העסק שלך...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">אין התראות פעילות</p>
          <p className="text-sm mt-1">הכל נראה תקין!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              dismissed={dismissed.has(alert.id)}
              onDismiss={dismiss}
            />
          ))}
        </div>
      )}

      {dismissed.size > 0 && (
        <button
          onClick={() => { setDismissed(new Set()); localStorage.removeItem('dismissed-alerts') }}
          className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline w-full text-center"
        >
          הצג {dismissed.size} התראות שהוסתרו
        </button>
      )}
    </div>
  )
}

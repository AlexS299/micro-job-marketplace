'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Loader2, Shield, Zap, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { SUPPORTED_BANKS, type BankCode } from '@/lib/open-banking'

const BANKS = Object.values(SUPPORTED_BANKS)

const BANK_RING: Record<string, string> = {
  HAPOALIM:            'ring-red-400 bg-red-50',
  LEUMI:               'ring-blue-500 bg-blue-50',
  DISCOUNT:            'ring-orange-400 bg-orange-50',
  MIZRAHI:             'ring-green-500 bg-green-50',
  FIRST_INTERNATIONAL: 'ring-blue-400 bg-blue-50',
  MASSAD:              'ring-purple-500 bg-purple-50',
}

const BANK_BADGE: Record<string, string> = {
  HAPOALIM:            'bg-red-100 text-red-700',
  LEUMI:               'bg-blue-100 text-blue-700',
  DISCOUNT:            'bg-orange-100 text-orange-700',
  MIZRAHI:             'bg-green-100 text-green-700',
  FIRST_INTERNATIONAL: 'bg-sky-100 text-sky-700',
  MASSAD:              'bg-purple-100 text-purple-700',
}

export default function ConnectBankPage() {
  const [selected, setSelected] = useState<BankCode | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  async function handleConnect() {
    if (!selected) return
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'שגיאה בחיבור')
      window.location.href = data.redirectUrl
    } catch (e) {
      setError((e as Error).message)
      setConnecting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/dashboard/bank" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ChevronRight className="w-4 h-4" />
        חזרה לבנק
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">חיבור חשבון בנק</h1>
        <p className="text-slate-500 text-sm">
          חבר את חשבון הבנק העסקי שלך לסנכרון אוטומטי של עסקאות ב-Open Banking API של בנק ישראל.
        </p>
      </div>

      {/* Feature chips */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: Shield, label: 'מאובטח',    sub: 'OAuth 2.0 + TLS' },
          { icon: Zap,    label: 'אוטומטי',   sub: 'סנכרון יומי'     },
          { icon: RefreshCw, label: 'בזמן אמת', sub: 'עדכון מיידי'    },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
            <Icon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-700">{label}</p>
            <p className="text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <p className="text-sm font-semibold text-slate-700 mb-3">בחר בנק:</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {BANKS.map(bank => (
          <button
            key={bank.code}
            onClick={() => setSelected(bank.code as BankCode)}
            className={clsx(
              'relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center bg-white',
              selected === bank.code
                ? `ring-2 ring-offset-1 border-transparent ${BANK_RING[bank.code]}`
                : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <span className={clsx('text-[11px] font-bold px-2 py-0.5 rounded-full', BANK_BADGE[bank.code])}>
              {bank.nameEn}
            </span>
            <span className="text-sm font-semibold text-slate-800 leading-tight">{bank.name}</span>
            {selected === bank.code && (
              <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <button
        onClick={handleConnect}
        disabled={!selected || connecting}
        className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {connecting
          ? <><Loader2 className="w-5 h-5 animate-spin" /> מתחבר...</>
          : 'חיבור מאובטח עם OAuth 2.0 ←'
        }
      </button>

      <p className="text-xs text-slate-400 text-center mt-4">
        🔒 מוצפן ומוגן בהתאם לתקן Open Banking ישראל — בנק ישראל
      </p>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'

type Provider = 'CARDCOM' | 'TRANZILA' | 'PAYME' | ''

interface PaymentSettings {
  paymentProvider: Provider
  cardcomTerminal: string | null
  cardcomUsername: string | null
  tranzilaTerminal: string | null
  tranzilaApiKey: string | null
  paymeApiKey: string | null
}

const PROVIDERS = [
  {
    id: 'CARDCOM' as const,
    name: 'קארדקום',
    logo: '🏦',
    desc: 'ספק הסליקה הגדול בישראל. תומך בכרטיסי אשראי, תשלומים ועוד.',
    fields: [
      { key: 'cardcomTerminal', label: 'מספר מסוף', placeholder: 'XXXXXX' },
      { key: 'cardcomUsername', label: 'שם משתמש', placeholder: 'your_username' },
    ],
  },
  {
    id: 'TRANZILA' as const,
    name: 'טרנזילה',
    logo: '💳',
    desc: 'פתרון סליקה פופולרי לעסקים קטנים ובינוניים.',
    fields: [
      { key: 'tranzilaTerminal', label: 'שם מסוף', placeholder: 'your_terminal' },
      { key: 'tranzilaApiKey', label: 'מפתח API (אופציונלי)', placeholder: 'api_key' },
    ],
  },
  {
    id: 'PAYME' as const,
    name: 'פיימי',
    logo: '📱',
    desc: 'פתרון תשלומים מודרני, פופולרי בקרב פרילנסרים.',
    fields: [
      { key: 'paymeApiKey', label: 'מפתח API', placeholder: 'payme_api_key_...' },
    ],
  },
]

export default function PaymentsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [selected, setSelected] = useState<Provider>('')
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/payments/settings').then(r => r.json()).then((d: PaymentSettings) => {
      setSettings(d)
      setSelected(d.paymentProvider ?? '')
      const init: Record<string, string> = {}
      if (d.cardcomTerminal)  init.cardcomTerminal  = d.cardcomTerminal
      if (d.cardcomUsername)  init.cardcomUsername  = d.cardcomUsername
      if (d.tranzilaTerminal) init.tranzilaTerminal = d.tranzilaTerminal
      if (d.tranzilaApiKey)   init.tranzilaApiKey   = d.tranzilaApiKey
      if (d.paymeApiKey)      init.paymeApiKey      = d.paymeApiKey
      setCreds(init)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/payments/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentProvider: selected, ...creds }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const selectedProvider = PROVIDERS.find(p => p.id === selected)

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">הגדרות תשלומים</h1>
        <p className="text-gray-500 mt-1">
          חבר ספק סליקה ישראלי כדי לאפשר ללקוחות לשלם חשבוניות אונליין בלחיצה.
        </p>
      </div>

      {/* Provider selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`border-2 rounded-xl p-4 text-right transition-all ${
              selected === p.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="text-3xl mb-2">{p.logo}</div>
            <div className="font-bold text-gray-900">{p.name}</div>
            <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
          </button>
        ))}
        <button
          onClick={() => setSelected('')}
          className={`border-2 rounded-xl p-4 text-right transition-all ${
            selected === ''
              ? 'border-gray-400 bg-gray-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <div className="text-3xl mb-2">🚫</div>
          <div className="font-bold text-gray-900">ללא</div>
          <div className="text-xs text-gray-500 mt-1">השבת תשלומים אונליין</div>
        </button>
      </div>

      {/* Credentials form */}
      {selectedProvider && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">פרטי חיבור — {selectedProvider.name}</h2>
          {selectedProvider.fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <input
                type="password"
                value={creds[field.key] ?? ''}
                onChange={e => setCreds(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            🔒 הפרטים מוצפנים עם AES-256-GCM ומאוחסנים בצורה מאובטחת.
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h2 className="font-semibold text-gray-800 mb-4">איך זה עובד?</h2>
        <ol className="space-y-3 text-sm text-gray-600">
          {[
            'בחשבונית, לחץ על "צור לינק תשלום"',
            'הלקוח מקבל קישור ייחודי במייל / וואטסאפ',
            'הלקוח לוחץ ומשלם עם כרטיס אשראי',
            'החשבונית מסומנת אוטומטית כ"שולמה"',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {saving ? 'שומר...' : saved ? '✓ נשמר!' : 'שמור הגדרות'}
      </button>
    </div>
  )
}

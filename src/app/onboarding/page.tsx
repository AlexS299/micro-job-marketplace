'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Sparkles, Building2, Receipt, Globe, CheckCircle } from 'lucide-react'
import { LOCALES, type Locale } from '@/lib/i18n'

type TaxType = 'OSEK_MURSHEH' | 'OSEK_PATUR' | 'COMPANY'

const TAX_OPTIONS: { value: TaxType; label: string; desc: string }[] = [
  { value: 'OSEK_MURSHEH', label: 'עוסק מורשה',  desc: 'מחזור מעל 120,000 ₪ — גובה מע"מ' },
  { value: 'OSEK_PATUR',   label: 'עוסק פטור',   desc: 'מחזור עד 120,000 ₪ — פטור ממע"מ' },
  { value: 'COMPANY',      label: 'חברה בע"מ',   desc: 'תאגיד הרשום ברשם החברות' },
]

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const { update } = useSession()
  const [step, setStep]             = useState<Step>(1)
  const [businessName, setBusiness] = useState('')
  const [taxType, setTaxType]       = useState<TaxType>('OSEK_MURSHEH')
  const [vatNumber, setVat]         = useState('')
  const [locale, setLocale]         = useState<Locale>('he')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const dir = locale === 'he' ? 'rtl' : 'ltr'

  const goNext = () => {
    if (step === 1 && !businessName.trim()) { setError('שם העסק נדרש'); return }
    setError('')
    setStep(s => (s + 1) as Step)
  }

  const submit = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, taxType, vatNumber: vatNumber || null, locale }),
    })
    if (!res.ok) { setError('שגיאה בשמירת הפרטים'); setLoading(false); return }
    await update() // refresh JWT so locale + onboardingDone are current
    router.push('/dashboard')
  }

  const stepLabels = ['שם עסק', 'סוג עוסק', 'שפה']

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">בוא נגדיר את העסק שלך</h1>
          <p className="text-blue-300 text-sm mt-1">לוקח פחות מדקה</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {stepLabels.map((label, i) => {
              const n = i + 1
              const done  = step > n
              const active = step === n
              return (
                <div key={n} className="flex items-center flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : n}
                    </div>
                    <span className={`text-xs hidden sm:block ${active ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${step > n ? 'bg-green-400' : 'bg-slate-200'}`} />}
                </div>
              )
            })}
          </div>

          {/* Step 1: Business name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">מה שם העסק?</h2>
              </div>
              <input
                type="text"
                autoFocus
                value={businessName}
                onChange={e => setBusiness(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goNext()}
                placeholder="לדוגמה: ישראל ישראלי — יועץ מס"
                className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-base focus:outline-none"
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button onClick={goNext} className="w-full bg-blue-700 text-white py-3 rounded-xl font-medium hover:bg-blue-800 transition-colors">
                המשך →
              </button>
            </div>
          )}

          {/* Step 2: Tax type */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">סוג העוסק</h2>
              </div>
              <div className="space-y-2.5">
                {TAX_OPTIONS.map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${taxType === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="taxType" value={opt.value} checked={taxType === opt.value}
                      onChange={() => setTaxType(opt.value)} className="mt-0.5 accent-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{opt.label}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {taxType === 'COMPANY' ? 'מספר ח.פ' : 'מספר עוסק'}
                  {taxType === 'OSEK_PATUR' ? ' (לא חובה)' : ''}
                </label>
                <input type="text" value={vatNumber} onChange={e => setVat(e.target.value)}
                  placeholder={taxType === 'COMPANY' ? '514123456' : '123456789'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ direction: 'ltr', textAlign: 'right' }} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors">
                  ← חזרה
                </button>
                <button type="button" onClick={goNext}
                  className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 transition-colors">
                  המשך →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Language */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">שפת הממשק</h2>
              </div>
              <div className="space-y-2.5">
                {LOCALES.map(l => (
                  <label key={l.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${locale === l.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="locale" value={l.value} checked={locale === l.value}
                      onChange={() => setLocale(l.value)} className="accent-blue-600" />
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{l.value === 'he' ? '🇮🇱' : l.value === 'en' ? '🇺🇸' : '🇷🇺'}</span>
                      <div>
                        <p className="font-semibold text-slate-900">{l.nativeLabel}</p>
                        <p className="text-xs text-slate-500">{l.dir === 'rtl' ? 'ימין לשמאל' : 'Left to right'}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)}
                  className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors">
                  ← חזרה
                </button>
                <button type="button" onClick={submit} disabled={loading}
                  className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors">
                  {loading ? '...' : 'כניסה לדשבורד'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-blue-400 text-xs mt-4">ניתן לשנות את כל הפרטים בהמשך דרך הגדרות</p>
      </div>
    </div>
  )
}

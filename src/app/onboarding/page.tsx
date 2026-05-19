'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Building2, Receipt, CheckCircle } from 'lucide-react'

type TaxType = 'OSEK_MURSHEH' | 'OSEK_PATUR' | 'COMPANY'

const TAX_OPTIONS: { value: TaxType; label: string; desc: string }[] = [
  { value: 'OSEK_MURSHEH', label: 'עוסק מורשה',   desc: 'מחזור מעל 120,000 ₪ בשנה — גובה מע"מ מלקוחות' },
  { value: 'OSEK_PATUR',   label: 'עוסק פטור',    desc: 'מחזור עד 120,000 ₪ בשנה — פטור ממע"מ' },
  { value: 'COMPANY',      label: 'חברה בע"מ',    desc: 'תאגיד הרשום ברשם החברות' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [businessName, setBusinessName] = useState('')
  const [taxType, setTaxType] = useState<TaxType>('OSEK_MURSHEH')
  const [vatNumber, setVatNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim()) { setError('שם העסק נדרש'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: businessName.trim(),
        taxType,
        vatNumber: vatNumber.trim() || null,
      }),
    })

    if (!res.ok) {
      setError('שגיאה בשמירת הפרטים')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">בוא נגדיר את העסק שלך</h1>
          <p className="text-blue-300 text-sm mt-1">לוקח פחות מדקה</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <div className={`flex-1 h-0.5 ${step > 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              2
            </div>
          </div>

          <form onSubmit={submit}>
            {/* Step 1: Business name */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">מה שם העסק?</h2>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="לדוגמה: ישראל ישראלי — יועץ מס"
                    className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-base focus:outline-none transition-colors"
                  />
                  {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => { if (!businessName.trim()) { setError('שם העסק נדרש'); return } setError(''); setStep(2) }}
                  className="w-full bg-blue-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 transition-colors"
                >
                  המשך ←
                </button>
              </div>
            )}

            {/* Step 2: Tax type */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">סוג העוסק</h2>
                  </div>

                  <div className="space-y-3">
                    {TAX_OPTIONS.map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${taxType === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <input
                          type="radio"
                          name="taxType"
                          value={opt.value}
                          checked={taxType === opt.value}
                          onChange={() => setTaxType(opt.value)}
                          className="mt-0.5 accent-blue-600"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{opt.label}</p>
                          <p className="text-sm text-slate-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    {taxType === 'COMPANY' ? 'מספר ח.פ' : 'מספר עוסק'}
                    {taxType === 'OSEK_PATUR' ? ' (לא חובה)' : ''}
                  </label>
                  <input
                    type="text"
                    value={vatNumber}
                    onChange={e => setVatNumber(e.target.value)}
                    placeholder={taxType === 'COMPANY' ? '514123456' : '123456789'}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                  />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
                  >
                    ← חזרה
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
                  >
                    {loading ? '...' : 'כניסה לדשבורד'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-blue-400 text-xs mt-4">
          ניתן לשנות את כל הפרטים בהמשך דרך הגדרות
        </p>
      </div>
    </div>
  )
}

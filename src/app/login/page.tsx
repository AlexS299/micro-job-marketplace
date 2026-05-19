'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lock, Mail, User, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('אימייל או סיסמה שגויים')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) {
      setError(data.error ?? 'שגיאה ביצירת החשבון')
      setLoading(false)
      return
    }

    // Auto-sign-in and go to onboarding
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('החשבון נוצר — נסה להתחבר')
      setMode('login')
    } else {
      router.push('/onboarding')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">הנה&quot;ח חכמה</h1>
          <p className="text-blue-300 text-sm mt-1">מערכת חשבונאות AI לעסקים</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* Tab toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              כניסה
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'register' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              הרשמה
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2.5 rounded-xl mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">שם מלא</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">דואר אלקטרוני</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@business.co.il"
                  className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ direction: 'ltr', textAlign: 'right' }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">סיסמה{mode === 'register' && ' (מינימום 8 תווים)'}</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : mode === 'register' ? 'יצירת חשבון' : 'כניסה'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

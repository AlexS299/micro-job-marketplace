'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lock, Mail, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [setupMode, setSetupMode] = useState(false)
  const [name, setName] = useState('')

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

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setSetupMode(false)
      setError('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">הנה&quot;ח חכמה</h1>
          <p className="text-blue-300 text-sm mt-1">מערכת חשבונאות AI לעסקים</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5 text-center">
            {setupMode ? 'הגדרת חשבון ראשון' : 'כניסה למערכת'}
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2.5 rounded-xl mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={setupMode ? handleSetup : handleLogin} className="space-y-4">
            {setupMode && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">שם מלא</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">סיסמה</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
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
              {loading ? '...' : setupMode ? 'צור חשבון' : 'כניסה'}
            </button>
          </form>

          <button
            onClick={() => { setSetupMode(!setupMode); setError('') }}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4 transition-colors"
          >
            {setupMode ? 'חזרה להתחברות' : 'הגדרה ראשונה — צור חשבון'}
          </button>
        </div>
      </div>
    </div>
  )
}

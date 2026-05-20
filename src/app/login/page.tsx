'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lock, Mail, User, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) { setError('אימייל או סיסמה שגויים') }
    else { router.push('/dashboard') }
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const data = await res.json() as { error?: string }
    if (!res.ok) { setError(data.error ?? 'שגיאה ביצירת החשבון'); setLoading(false); return }
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) { setError('החשבון נוצר — נסה להתחבר'); setMode('login') }
    else { router.push('/onboarding') }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/onboarding' })
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

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                {m === 'login' ? 'כניסה' : 'הרשמה'}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2.5 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">שם מלא</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">דואר אלקטרוני</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@business.co.il"
                  className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ direction: 'ltr', textAlign: 'right' }} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                סיסמה{mode === 'register' && ' (מינימום 8 תווים)'}
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={mode === 'register' ? 8 : undefined} placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors">
              {loading ? '...' : mode === 'register' ? 'יצירת חשבון' : 'כניסה'}
            </button>
            {mode === 'login' && (
              <div className="text-center">
                <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-blue-600 transition-colors">
                  שכחת סיסמה?
                </Link>
              </div>
            )}
          </form>

          {/* Google sign-in */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">או</span>
            </div>
          </div>

          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? '...' : 'כניסה עם Google'}
          </button>
        </div>
      </div>
    </div>
  )
}

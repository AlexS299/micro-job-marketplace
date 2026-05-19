'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Lock, CheckCircle, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return }
    if (password.length < 8)  { setError('סיסמה חייבת להכיל לפחות 8 תווים'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    if (res.ok) {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } else {
      const d = await res.json() as { error?: string }
      setError(d.error ?? 'שגיאה, נסה שוב')
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="text-center space-y-4 py-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <p className="font-semibold text-slate-800">קישור לא תקין</p>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">בקש קישור חדש</Link>
      </div>
    )
  }

  return success ? (
    <div className="text-center space-y-4 py-4">
      <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
      <p className="font-semibold text-slate-800">הסיסמה עודכנה בהצלחה</p>
      <p className="text-sm text-slate-500">מעביר אותך לדף הכניסה...</p>
    </div>
  ) : (
    <>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">סיסמה חדשה (מינימום 8 תווים)</label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">אישור סיסמה</label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'עדכן סיסמה'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">איפוס סיסמה</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          <Suspense fallback={<div className="py-8 text-center text-slate-500">טוען...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

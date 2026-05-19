'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Mail, ArrowRight, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      setSent(true)
    } else {
      const d = await res.json() as { error?: string }
      setError(d.error ?? 'שגיאה, נסה שוב')
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
          <h1 className="text-2xl font-bold text-white">שכחת סיסמה?</h1>
          <p className="text-blue-300 text-sm mt-1">נשלח לך קישור לאיפוס</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-4">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-semibold text-slate-800">בדוק את תיבת המייל שלך</p>
              <p className="text-sm text-slate-500">שלחנו קישור לאיפוס סיסמה אם כתובת האימייל רשומה במערכת.</p>
              <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <ArrowRight className="w-4 h-4" />
                חזרה לכניסה
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">דואר אלקטרוני</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@business.co.il"
                      style={{ direction: 'ltr', textAlign: 'right' }}
                      className="w-full border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-700 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? '...' : 'שלח קישור לאיפוס'}
                </button>
              </form>
              <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-700">
                <ArrowRight className="w-4 h-4" />
                חזרה לכניסה
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

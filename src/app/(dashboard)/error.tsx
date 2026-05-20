'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-8" dir="rtl">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">שגיאה בטעינת הדף</h1>
        <p className="text-slate-500 text-sm">אירעה שגיאה בטעינת הדף הזה. נסה לרענן.</p>
        {error.digest && (
          <p className="text-xs text-slate-400 font-mono">קוד: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            נסה שוב
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            בית
          </Link>
        </div>
      </div>
    </div>
  )
}

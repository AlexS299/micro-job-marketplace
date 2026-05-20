'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
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
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">משהו השתבש</h1>
          <p className="text-slate-500 text-sm">אירעה שגיאה בלתי צפויה. אנא נסה שוב.</p>
          {error.digest && (
            <p className="text-xs text-slate-400 font-mono">שגיאה: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-blue-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  )
}

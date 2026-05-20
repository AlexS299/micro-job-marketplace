import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/20 rounded-3xl border border-blue-500/30">
          <Sparkles className="w-10 h-10 text-blue-400" />
        </div>
        <div>
          <h1 className="text-6xl font-bold text-white mb-2">404</h1>
          <p className="text-xl font-semibold text-blue-200 mb-1">הדף לא נמצא</p>
          <p className="text-slate-400 text-sm">הדף שחיפשת אינו קיים או הועבר למקום אחר.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה לדשבורד
        </Link>
      </div>
    </div>
  )
}

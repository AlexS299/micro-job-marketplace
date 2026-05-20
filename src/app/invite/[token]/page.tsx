'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface InviteInfo {
  email: string; role: string; businessName: string
  expiresAt: string; accepted: boolean; expired: boolean
}

const ROLE_HEB: Record<string, string> = {
  ADMIN: 'מנהל', EDITOR: 'עורך', VIEWER: 'צופה (רואה חשבון)',
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [info, setInfo]     = useState<InviteInfo | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'done' | 'error'>('loading')
  const [errorMsg, setError] = useState('')

  useEffect(() => {
    fetch(`/api/team/accept/${params.token}`)
      .then(r => r.json())
      .then((d: InviteInfo & { error?: string }) => {
        if (d.error) { setError(d.error); setStatus('error'); return }
        setInfo(d)
        setStatus('ready')
      })
      .catch(() => { setError('שגיאה בטעינת ההזמנה'); setStatus('error') })
  }, [params.token])

  const accept = async () => {
    setStatus('accepting')
    const res = await fetch(`/api/team/accept/${params.token}`, { method: 'POST' })
    const data = await res.json() as { ok?: boolean; error?: string; businessId?: string }
    if (res.ok && data.ok) {
      setStatus('done')
      setTimeout(() => router.push('/dashboard'), 2000)
    } else {
      setError(data.error ?? 'שגיאה בקבלת ההזמנה')
      setStatus('error')
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && <p className="text-slate-400">טוען...</p>}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">לא ניתן לקבל הזמנה</h1>
            <p className="text-slate-500">{errorMsg}</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">ברוך הבא!</h1>
            <p className="text-slate-500">מעבר לדשבורד...</p>
          </>
        )}

        {(status === 'ready' || status === 'accepting') && info && (
          <>
            {info.accepted ? (
              <>
                <div className="text-5xl mb-4">✅</div>
                <p className="text-slate-600">ההזמנה כבר נוצלה בעבר.</p>
              </>
            ) : info.expired ? (
              <>
                <div className="text-5xl mb-4">⏰</div>
                <p className="text-slate-600">ההזמנה פגה תוקף. בקש הזמנה חדשה.</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">🤝</div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">{info.businessName}</h1>
                <p className="text-slate-500 mb-1">הוזמנת לצטרף כ:</p>
                <span className="inline-block bg-blue-100 text-blue-700 font-semibold px-4 py-1.5 rounded-full mb-6">
                  {ROLE_HEB[info.role] ?? info.role}
                </span>
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 mb-6">
                  <p>כתובת מייל: <strong>{info.email}</strong></p>
                  <p className="mt-1 text-xs text-slate-400">
                    תקף עד: {new Date(info.expiresAt).toLocaleDateString('he-IL')}
                  </p>
                </div>
                <button
                  onClick={accept}
                  disabled={status === 'accepting'}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl text-lg transition-colors"
                >
                  {status === 'accepting' ? 'מצטרף...' : 'קבל הזמנה ✓'}
                </button>
                <p className="text-xs text-slate-400 mt-3">
                  יש להיות מחובר עם {info.email} כדי לקבל את ההזמנה.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

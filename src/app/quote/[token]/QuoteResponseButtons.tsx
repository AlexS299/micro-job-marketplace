'use client'

import { useState } from 'react'

interface Props {
  token: string
  quoteNumber: string
}

export default function QuoteResponseButtons({ token, quoteNumber }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'accepted' | 'declined'>('idle')

  const respond = async (action: 'accept' | 'decline') => {
    setStatus('loading')
    const res = await fetch(`/api/quotes/respond/${token}?action=${action}`, { method: 'POST' })
    if (res.ok) {
      setStatus(action === 'accept' ? 'accepted' : 'declined')
    } else {
      setStatus('idle')
      alert('שגיאה — נסה שוב')
    }
  }

  if (status === 'accepted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <p className="text-green-800 font-bold text-lg">אישרת את הצעת מחיר {quoteNumber}</p>
        <p className="text-green-600 text-sm mt-1">ניצור איתך קשר בקרוב להמשך.</p>
      </div>
    )
  }

  if (status === 'declined') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">❌</div>
        <p className="text-red-800 font-bold text-lg">דחית את ההצעה</p>
        <p className="text-red-600 text-sm mt-1">תודה על המשוב.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => respond('accept')}
        disabled={status === 'loading'}
        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 rounded-xl text-lg transition-colors"
      >
        {status === 'loading' ? '...' : '✓ אני מאשר את ההצעה'}
      </button>
      <button
        onClick={() => respond('decline')}
        disabled={status === 'loading'}
        className="flex-1 bg-white hover:bg-red-50 text-red-600 border-2 border-red-200 font-bold py-4 rounded-xl text-lg transition-colors"
      >
        ✗ דחה
      </button>
    </div>
  )
}

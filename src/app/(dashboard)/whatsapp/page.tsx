'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Phone, CheckCircle, AlertCircle, Copy, Send, Loader2, Bot, Zap, Shield, Image } from 'lucide-react'

interface Business {
  id: string
  name: string
  whatsappPhone: string | null
}

const BOT_COMMANDS = [
  { cmd: 'יתרה', desc: 'יתרת חשבון בנק', icon: '💰' },
  { cmd: 'הכנסות', desc: 'הכנסות החודש', icon: '📈' },
  { cmd: 'הוצאות', desc: 'הוצאות החודש', icon: '📉' },
  { cmd: 'חשבוניות פתוחות', desc: 'חשבוניות לא שולמו', icon: '📋' },
  { cmd: 'התראות', desc: 'התראות פעילות', icon: '⚠️' },
  { cmd: 'מע"מ', desc: 'סיכום מע"מ', icon: '🏛' },
  { cmd: 'דוח', desc: 'דוח חודשי מלא', icon: '📊' },
  { cmd: 'שכר', desc: 'סיכום שכר החודש', icon: '💼' },
  { cmd: 'שלח חשבונית [מספר]', desc: 'שלח PDF לוואטסאפ', icon: '📤' },
]

const FEATURES = [
  { icon: Bot, title: 'AI חשבונאי', desc: 'שאל כל שאלה — Claude יענה בעברית' },
  { icon: Image, title: 'סריקת קבלות', desc: 'שלח תמונת קבלה — תירשם אוטומטית' },
  { icon: Zap, title: 'עדכונים מיידיים', desc: 'התראות ישלחו ישירות לוואטסאפ' },
  { icon: Shield, title: 'מאובטח', desc: 'מספר מאומת, נתונים מוצפנים' },
]

export default function WhatsAppPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook'

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        setBusiness(d.business)
        setPhone(d.business?.whatsappPhone || '')
      })
      .catch(console.error)
  }, [])

  async function savePhone() {
    if (!business) return
    setSaving(true)
    const formatted = phone.startsWith('+') ? phone : `+972${phone.replace(/^0/, '')}`
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappPhone: formatted }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setBusiness(b => b ? { ...b, whatsappPhone: formatted } : b)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function sendTest() {
    if (!business || !testMsg.trim()) return
    setSending(true)
    setSendResult(null)
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, type: 'custom', payload: { message: testMsg } }),
    })
    setSending(false)
    setSendResult(res.ok ? '✅ הודעה נשלחה בהצלחה' : '❌ שגיאה בשליחה')
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isConnected = !!business?.whatsappPhone

  return (
    <div className="max-w-4xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-green-100 rounded-2xl">
          <MessageCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Bot</h1>
          <p className="text-gray-500 text-sm">נהל את העסק שלך ישירות מוואטסאפ</p>
        </div>
        {isConnected && (
          <span className="mr-auto flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
            <CheckCircle className="w-4 h-4" /> מחובר
          </span>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FEATURES.map(f => (
          <div key={f.title} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <f.icon className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Setup Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-l from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600" />
            הגדרת חיבור
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שלב 1 — מספר וואטסאפ שלך
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+972501234567"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                dir="ltr"
              />
              <button
                onClick={savePhone}
                disabled={saving || !phone}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
                {saved ? 'נשמר!' : 'שמור'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">המספר שיקבל הודעות ויוכל לשלוח פקודות לבוט</p>
          </div>

          {/* Step 2: Twilio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שלב 2 — הגדרת Twilio
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
              <p className="text-gray-600">הוסף את משתני הסביבה הבאים ל-<code className="bg-gray-200 px-1 rounded">.env.local</code>:</p>
              <pre className="bg-gray-900 text-green-400 rounded p-3 text-xs overflow-x-auto" dir="ltr">{`TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`}</pre>
              <p className="text-gray-500 text-xs">* ללא Twilio, הבוט פועל במצב sandbox עם logs בקונסול</p>
            </div>
          </div>

          {/* Step 3: Webhook */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שלב 3 — Webhook URL לטווילו
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 font-mono overflow-x-auto" dir="ltr">
                {webhookUrl}
              </code>
              <button
                onClick={copyWebhook}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'הועתק!' : 'העתק'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              הכנס URL זה בהגדרות Twilio Sandbox תחת "When a message comes in"
            </p>
          </div>
        </div>
      </div>

      {/* Test Message */}
      {isConnected && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-l from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              שלח הודעת בדיקה
            </h2>
          </div>
          <div className="p-6 flex gap-2">
            <input
              type="text"
              value={testMsg}
              onChange={e => setTestMsg(e.target.value)}
              placeholder="הכנסות החודש"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && sendTest()}
            />
            <button
              onClick={sendTest}
              disabled={sending || !testMsg}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              שלח
            </button>
          </div>
          {sendResult && (
            <div className="px-6 pb-4 text-sm text-gray-600">{sendResult}</div>
          )}
        </div>
      )}

      {/* Commands Reference */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">פקודות הבוט</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {BOT_COMMANDS.map(c => (
            <div key={c.cmd} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
              <span className="text-xl w-8 text-center">{c.icon}</span>
              <code className="font-mono text-sm font-semibold text-green-700 min-w-48">{c.cmd}</code>
              <span className="text-sm text-gray-500">{c.desc}</span>
            </div>
          ))}
          <div className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
            <span className="text-xl w-8 text-center">🤖</span>
            <code className="font-mono text-sm font-semibold text-purple-700 min-w-48">כל שאלה חופשית</code>
            <span className="text-sm text-gray-500">AI חשבונאי ישראלי — מענה מיידי</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
            <span className="text-xl w-8 text-center">📸</span>
            <code className="font-mono text-sm font-semibold text-orange-700 min-w-48">תמונת קבלה</code>
            <span className="text-sm text-gray-500">OCR אוטומטי + רישום הוצאה</span>
          </div>
        </div>
      </div>

      {/* Status */}
      {!isConnected && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">הבוט לא מחובר עדיין</p>
            <p className="text-amber-700 mt-0.5">הוסף מספר וואטסאפ והגדר Twilio כדי להתחיל.</p>
          </div>
        </div>
      )}
    </div>
  )
}

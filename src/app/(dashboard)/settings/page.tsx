'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Settings, Shield, Save, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface BusinessData {
  id: string
  name: string
  vatNumber?: string | null
  businessNumber?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  bankAccount?: string | null
  bankName?: string | null
  taxType: string
  vatReportPeriod: string
}

type Tab = 'business' | 'security'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('business')
  const [business, setBusiness] = useState<BusinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  // Security form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwStatus, setPwStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [pwMessage, setPwMessage] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setBusiness(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSaveBusiness(e: React.FormEvent) {
    e.preventDefault()
    if (!business) return
    setSaving(true)
    setSaveStatus('idle')
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(business),
      })
      if (res.ok) {
        const updated = await res.json()
        setBusiness(updated)
        setSaveStatus('success')
        setSaveMessage('הפרטים נשמרו בהצלחה')
      } else {
        setSaveStatus('error')
        setSaveMessage('שגיאה בשמירה')
      }
    } catch {
      setSaveStatus('error')
      setSaveMessage('שגיאת רשת')
    }
    setSaving(false)
    setTimeout(() => setSaveStatus('idle'), 3000)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwStatus('error')
      setPwMessage('הסיסמאות אינן תואמות')
      return
    }
    if (newPassword.length < 6) {
      setPwStatus('error')
      setPwMessage('סיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    setPwSaving(true)
    setPwStatus('idle')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwStatus('success')
        setPwMessage('הסיסמה שונתה בהצלחה')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPwStatus('error')
        setPwMessage(data.error || 'שגיאה בשינוי סיסמה')
      }
    } catch {
      setPwStatus('error')
      setPwMessage('שגיאת רשת')
    }
    setPwSaving(false)
    setTimeout(() => setPwStatus('idle'), 4000)
  }

  function updateField(field: keyof BusinessData, value: string) {
    if (!business) return
    setBusiness({ ...business, [field]: value })
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'business', label: 'פרטי עסק', icon: Settings },
    { id: 'security', label: 'אבטחה', icon: Shield },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">הגדרות</h1>
        <p className="text-sm text-slate-500 mt-0.5">ניהול פרטי העסק והגדרות המערכת</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Business Tab */}
      {activeTab === 'business' && business && (
        <form onSubmit={handleSaveBusiness} className="space-y-5">
          {/* VAT Info card */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">שיעור מע&quot;מ נוכחי: 18%</p>
              <p className="text-xs text-blue-600">בהתאם לחוק מע&quot;מ תשל&quot;ו-1975</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm">פרטים כלליים</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">שם העסק *</label>
                <input
                  type="text"
                  value={business.name}
                  onChange={e => updateField('name', e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">מספר עוסק / ח.פ.</label>
                <input
                  type="text"
                  value={business.vatNumber || ''}
                  onChange={e => updateField('vatNumber', e.target.value)}
                  placeholder="123456789"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">מספר עסק</label>
                <input
                  type="text"
                  value={business.businessNumber || ''}
                  onChange={e => updateField('businessNumber', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">טלפון</label>
                <input
                  type="tel"
                  value={business.phone || ''}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="050-0000000"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">אימייל עסקי</label>
                <input
                  type="email"
                  value={business.email || ''}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="business@company.co.il"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">כתובת</label>
                <input
                  type="text"
                  value={business.address || ''}
                  onChange={e => updateField('address', e.target.value)}
                  placeholder="רחוב הרצל 1"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">עיר</label>
                <input
                  type="text"
                  value={business.city || ''}
                  onChange={e => updateField('city', e.target.value)}
                  placeholder="תל אביב"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tax Settings */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm">הגדרות מס</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">סוג עסק</label>
                <select
                  value={business.taxType}
                  onChange={e => updateField('taxType', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="OSEK_MURSHEH">עוסק מורשה</option>
                  <option value="OSEK_PATUR">עוסק פטור</option>
                  <option value="CHEVRA_BAAM">חברה בע&quot;מ</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">תדירות דיווח מע&quot;מ</label>
                <select
                  value={business.vatReportPeriod}
                  onChange={e => updateField('vatReportPeriod', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="MONTHLY">חודשי</option>
                  <option value="BIMONTHLY">דו-חודשי</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm">פרטי בנק</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">שם הבנק</label>
                <input
                  type="text"
                  value={business.bankName || ''}
                  onChange={e => updateField('bankName', e.target.value)}
                  placeholder="בנק הפועלים"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">מספר חשבון</label>
                <input
                  type="text"
                  value={business.bankAccount || ''}
                  onChange={e => updateField('bankAccount', e.target.value)}
                  placeholder="12-345678"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Status + Save */}
          {saveStatus !== 'idle' && (
            <div className={clsx(
              'flex items-center gap-2 px-4 py-3 rounded-xl text-sm',
              saveStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            )}>
              {saveStatus === 'success'
                ? <CheckCircle className="w-4 h-4" />
                : <AlertCircle className="w-4 h-4" />
              }
              {saveMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            שמור הגדרות
          </button>
        </form>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          {/* Current user info */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">פרטי חשבון</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">אימייל</span>
                <span className="text-sm font-medium text-slate-900">{session?.user?.email}</span>
              </div>
              {session?.user?.name && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">שם</span>
                  <span className="text-sm font-medium text-slate-900">{session.user.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Change password */}
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm">שינוי סיסמה</h3>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">סיסמה נוכחית</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">סיסמה חדשה</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">אימות סיסמה חדשה</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {pwStatus !== 'idle' && (
              <div className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-xl text-sm',
                pwStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              )}>
                {pwStatus === 'success'
                  ? <CheckCircle className="w-4 h-4" />
                  : <AlertCircle className="w-4 h-4" />
                }
                {pwMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={pwSaving}
              className="flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              שנה סיסמה
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

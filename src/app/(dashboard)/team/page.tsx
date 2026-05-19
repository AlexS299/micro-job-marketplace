'use client'

import { useEffect, useState } from 'react'

type Role = 'ADMIN' | 'EDITOR' | 'VIEWER'

interface Member {
  id: string
  role: string
  acceptedAt: string | null
  user: { id: string; email: string; name: string | null }
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

interface Owner {
  id: string
  email: string
  name: string | null
}

interface TeamData {
  owner: Owner | null
  members: Member[]
  pending: PendingInvite[]
}

const ROLE_HEB: Record<string, string> = {
  ADMIN: 'מנהל',
  EDITOR: 'עורך',
  VIEWER: 'צופה (רואה חשבון)',
  OWNER: 'בעלים',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  EDITOR: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-slate-100 text-slate-600',
  OWNER: 'bg-amber-100 text-amber-700',
}

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('VIEWER')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url?: string; error?: string } | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/team')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteResult(null)
    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const d = await res.json() as { ok?: boolean; inviteUrl?: string; error?: string }
    if (d.ok) {
      setInviteResult({ url: d.inviteUrl })
      setInviteEmail('')
      await load()
    } else {
      setInviteResult({ error: d.error })
    }
    setInviting(false)
  }

  const changeRole = async (userId: string, role: string) => {
    setPendingAction(`role-${userId}`)
    await fetch(`/api/team/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setPendingAction(null)
    await load()
  }

  const removeMember = async (userId: string) => {
    if (!confirm('להסיר את המשתמש מהעסק?')) return
    setPendingAction(`remove-${userId}`)
    await fetch(`/api/team/${userId}`, { method: 'DELETE' })
    setPendingAction(null)
    await load()
  }

  if (loading) {
    return (
      <div dir="rtl" className="p-8 text-center text-slate-400">טוען...</div>
    )
  }

  return (
    <div dir="rtl" className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ניהול צוות</h1>
        <p className="text-slate-500 mt-1">הזמנת עובדים, רואי חשבון וצוות לגישה לעסק</p>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">הזמנת חבר צוות חדש</h2>
        <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            placeholder="כתובת מייל"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as Role)}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="VIEWER">צופה (רואה חשבון)</option>
            <option value="EDITOR">עורך</option>
            <option value="ADMIN">מנהל</option>
          </select>
          <button
            type="submit"
            disabled={inviting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            {inviting ? 'שולח...' : 'שלח הזמנה'}
          </button>
        </form>

        {inviteResult?.error && (
          <p className="mt-3 text-sm text-red-600">{inviteResult.error}</p>
        )}
        {inviteResult?.url && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-sm text-green-700 font-medium mb-1">ההזמנה נשלחה! ניתן גם לשתף את הקישור ישירות:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteResult.url}
                className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-3 py-1.5 text-slate-600"
              />
              <button
                onClick={() => navigator.clipboard.writeText(inviteResult.url!)}
                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
              >
                העתק
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 bg-slate-50 rounded-xl p-4 text-sm text-slate-600 space-y-1">
          <p><strong>צופה (רואה חשבון)</strong> — קריאה בלבד: חשבוניות, הוצאות, דוחות</p>
          <p><strong>עורך</strong> — יצירה ועריכה של כל הרשומות</p>
          <p><strong>מנהל</strong> — כל הסמכויות + ניהול צוות</p>
        </div>
      </div>

      {/* Current members */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">חברי הצוות</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-6 py-3 text-right font-medium">שם / מייל</th>
              <th className="px-6 py-3 text-right font-medium">תפקיד</th>
              <th className="px-6 py-3 text-right font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Owner row */}
            {data?.owner && (
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{data.owner.name ?? data.owner.email}</p>
                  {data.owner.name && <p className="text-slate-400 text-xs">{data.owner.email}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS.OWNER}`}>
                    {ROLE_HEB.OWNER}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs">—</td>
              </tr>
            )}

            {data?.members.map(m => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{m.user.name ?? m.user.email}</p>
                  {m.user.name && <p className="text-slate-400 text-xs">{m.user.email}</p>}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={m.role}
                    disabled={pendingAction === `role-${m.user.id}`}
                    onChange={e => changeRole(m.user.id, e.target.value)}
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border-0 focus:ring-2 focus:ring-blue-400 cursor-pointer ${ROLE_COLORS[m.role] ?? ROLE_COLORS.VIEWER}`}
                  >
                    <option value="VIEWER">צופה (רואה חשבון)</option>
                    <option value="EDITOR">עורך</option>
                    <option value="ADMIN">מנהל</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  <button
                    disabled={pendingAction === `remove-${m.user.id}`}
                    onClick={() => removeMember(m.user.id)}
                    className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                  >
                    הסר
                  </button>
                </td>
              </tr>
            ))}

            {!data?.members.length && !data?.owner && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-400">אין חברי צוות עדיין</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pending invitations */}
      {!!data?.pending.length && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">הזמנות ממתינות</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="px-6 py-3 text-right font-medium">מייל</th>
                <th className="px-6 py-3 text-right font-medium">תפקיד</th>
                <th className="px-6 py-3 text-right font-medium">תוקף עד</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.pending.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-700">{inv.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[inv.role] ?? ROLE_COLORS.VIEWER}`}>
                      {ROLE_HEB[inv.role] ?? inv.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {new Date(inv.expiresAt).toLocaleDateString('he-IL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sidebar, BottomNav } from '@/components/Navigation'
import { MessageSquare, Bell } from 'lucide-react'
import { clsx } from 'clsx'
import type { Alert } from '@/lib/alerts'

function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const critical = alerts.filter(a => a.severity === 'critical')
  const warning  = alerts.filter(a => a.severity === 'warning')
  if (critical.length === 0 && warning.length === 0) return null

  const top = critical[0] || warning[0]
  const isCritical = top.severity === 'critical'
  const total = critical.length + warning.length

  return (
    <Link
      href="/dashboard/alerts"
      className={clsx(
        'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
        isCritical ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
      )}
    >
      <span className="font-bold shrink-0">{total} התראות</span>
      <span className="truncate opacity-90">· {top.title}</span>
      <span className="mr-auto shrink-0 text-xs opacity-80">לחץ לפרטים ←</span>
    </Link>
  )
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [businessName, setBusinessName] = useState('הנהלת חשבונות')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      if (d?.business?.name) setBusinessName(d.business.name)
    }).catch(() => {})

    fetch('/api/alerts').then(r => r.json()).then((data: Alert[]) => {
      setAlerts(data)
      const dismissed = JSON.parse(localStorage.getItem('dismissed-alerts') || '[]') as string[]
      setAlertCount(data.filter(a => !dismissed.includes(a.id) && (a.severity === 'critical' || a.severity === 'warning')).length)
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="md:mr-64 flex flex-col min-h-screen">
        <AlertBanner alerts={alerts.filter(a => {
          const dismissed = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('dismissed-alerts') || '[]') as string[]
            : []
          return !dismissed.includes(a.id)
        })} />

        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-slate-900 leading-tight">{businessName}</h1>
              <p className="text-xs text-slate-500">מערכת ניהול פיננסי חכמה</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/alerts" className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/chat"
                className="flex items-center gap-2 bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-blue-800 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">שאל את ה-AI</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

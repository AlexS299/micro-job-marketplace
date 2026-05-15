'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sidebar, BottomNav } from '@/components/Navigation'
import { MessageSquare, Bell } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [businessName, setBusinessName] = useState('הנהלת חשבונות')

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => {
        if (data?.business?.name) setBusinessName(data.business.name)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main content */}
      <div className="md:mr-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-slate-900 leading-tight">{businessName}</h1>
              <p className="text-xs text-slate-500">מערכת ניהול פיננסי חכמה</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
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

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <BottomNav />
    </div>
  )
}

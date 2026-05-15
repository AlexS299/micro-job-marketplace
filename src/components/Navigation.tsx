'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Users,
  Building2,
  BarChart3,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'בית', icon: LayoutDashboard },
  { href: '/dashboard/chat', label: "צ'אט AI", icon: MessageSquare },
  { href: '/dashboard/invoices', label: 'חשבוניות', icon: FileText },
  { href: '/dashboard/clients', label: 'לקוחות', icon: Users },
  { href: '/dashboard/bank', label: 'בנק', icon: Building2 },
  { href: '/dashboard/reports', label: 'דוחות', icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-l border-slate-200 shadow-sm fixed right-0 top-0 h-full z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="flex items-center justify-center w-9 h-9 bg-blue-700 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm leading-tight">הנהלת חשבונות</p>
          <p className="text-xs text-blue-600 font-medium">AI חכמה</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={clsx('w-5 h-5', isActive ? 'text-blue-700' : 'text-slate-400')} />
              <span>{item.label}</span>
              {isActive && (
                <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-700" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom info */}
      <div className="px-6 py-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          מע&quot;מ 18% | חוק מע&quot;מ תשל&quot;ו
        </p>
      </div>
    </aside>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 right-0 left-0 bg-white border-t border-slate-200 z-30">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors',
                isActive ? 'text-blue-700' : 'text-slate-500'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

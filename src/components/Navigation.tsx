'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Users,
  Users2,
  Building2,
  BarChart3,
  Sparkles,
  ScanLine,
  Settings,
  LogOut,
  Briefcase,
  Landmark,
  TrendingUp,
  Bell,
  MessageCircle,
  CreditCard,
  ClipboardList,
  Wallet,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',                label: 'בית',            icon: LayoutDashboard },
  { href: '/dashboard/invoices',       label: 'חשבוניות',       icon: FileText },
  { href: '/dashboard/quotes',         label: 'הצעות מחיר',     icon: ClipboardList },
  { href: '/dashboard/expenses',       label: 'הוצאות',         icon: ScanLine },
  { href: '/dashboard/clients',        label: 'לקוחות',         icon: Users },
  { href: '/dashboard/payments',       label: 'סליקה',          icon: Wallet },
  { href: '/dashboard/bank',           label: 'בנק',            icon: Building2 },
  { href: '/dashboard/payroll',        label: 'שכר',            icon: Briefcase },
  { href: '/dashboard/tax',            label: 'מרכז מס',        icon: Landmark },
  { href: '/dashboard/reports',        label: 'מע"מ',           icon: BarChart3 },
  { href: '/dashboard/financial',      label: 'דוחות',          icon: TrendingUp },
  { href: '/dashboard/team',           label: 'צוות',           icon: Users2 },
  { href: '/dashboard/chat',           label: "צ'אט AI",        icon: MessageSquare },
  { href: '/dashboard/alerts',         label: 'התראות',         icon: Bell },
  { href: '/dashboard/whatsapp',       label: 'WhatsApp',       icon: MessageCircle },
  { href: '/dashboard/billing',        label: 'חיוב',           icon: CreditCard },
  { href: '/dashboard/settings',       label: 'הגדרות',         icon: Settings },
]

// Items shown in mobile bottom nav — only the most-used ones
const mobileNavItems = [
  '/dashboard',
  '/dashboard/invoices',
  '/dashboard/quotes',
  '/dashboard/expenses',
  '/dashboard/clients',
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

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
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={clsx('w-4 h-4 flex-shrink-0', isActive ? 'text-blue-700' : 'text-slate-400')} />
              <span>{item.label}</span>
              {isActive && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-700" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-2">
        {session?.user && (
          <div className="px-4 py-2 rounded-lg bg-slate-50">
            <p className="text-xs font-medium text-slate-700 truncate">
              {session.user.name || session.user.email}
            </p>
            {session.user.name && (
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            )}
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg transition-colors text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 group"
        >
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-600" />
          <span>יציאה</span>
        </button>
        <p className="text-xs text-slate-400 text-center px-2">
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
        {navItems
          .filter(item => mobileNavItems.includes(item.href))
          .map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors',
                  isActive ? 'text-blue-700' : 'text-slate-500'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs text-slate-500"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] font-medium">יציאה</span>
        </button>
      </div>
    </nav>
  )
}

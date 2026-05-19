import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role

  if (!session || role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return (
    <div>
      <div className="bg-gray-900 text-white px-6 py-3 text-sm flex items-center gap-3">
        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-bold">ADMIN</span>
        <span className="text-gray-300">Admin Dashboard — גישה מוגבלת</span>
      </div>
      {children}
    </div>
  )
}

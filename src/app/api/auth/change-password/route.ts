import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await request.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'נדרשת סיסמה נוכחית וחדשה' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'סיסמה נוכחית שגויה' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id: user.id }, data: { password: hashed } })

  return NextResponse.json({ success: true })
}

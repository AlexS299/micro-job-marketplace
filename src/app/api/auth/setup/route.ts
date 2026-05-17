import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  const existing = await db.user.count()
  if (existing > 0) {
    return NextResponse.json({ error: 'משתמש כבר קיים' }, { status: 400 })
  }
  const { email, password, name } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'נדרש אימייל וסיסמה' }, { status: 400 })
  }
  const hashed = await bcrypt.hash(password, 12)
  const user = await db.user.create({ data: { email, password: hashed, name } })
  return NextResponse.json({ success: true, email: user.email })
}

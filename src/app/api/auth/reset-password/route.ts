import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json() as { token?: string; password?: string }
  if (!token || !password) {
    return NextResponse.json({ error: 'נדרשים token וסיסמה' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'סיסמה חייבת להכיל לפחות 8 תווים' }, { status: 400 })
  }

  const reset = await db.passwordReset.findUnique({ where: { token } })
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: 'הקישור לא תקין או פג תוקפו' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)
  await db.$transaction([
    db.user.update({ where: { email: reset.email }, data: { password: hashed } }),
    db.passwordReset.update({ where: { token }, data: { used: true } }),
  ])

  return NextResponse.json({ ok: true })
}

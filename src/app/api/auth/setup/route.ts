import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json() as {
    email?: string; password?: string; name?: string
  }

  if (!email?.includes('@') || !password || password.length < 8) {
    return NextResponse.json({ error: 'אימייל ולפחות 8 תווים בסיסמה נדרשים' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'כתובת המייל כבר רשומה במערכת' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)

  // Create a business for this user, then link the user to it
  const business = await db.business.create({
    data: { name: name ? `העסק של ${name}` : 'העסק שלי' },
  })

  await db.user.create({
    data: { email, password: hashed, name: name || null, businessId: business.id },
  })

  return NextResponse.json({ success: true, email })
}

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import db from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email?: string }
  if (!email) return NextResponse.json({ error: 'דואר אלקטרוני נדרש' }, { status: 400 })

  // Always return success to prevent email enumeration
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (user && user.password) {
    // Invalidate previous tokens for this email
    await db.passwordReset.updateMany({
      where: { email: user.email, used: false },
      data: { used: true },
    })

    const token = crypto.randomBytes(32).toString('hex')
    await db.passwordReset.create({
      data: {
        email: user.email,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    try {
      await sendPasswordResetEmail({ toEmail: user.email, resetUrl })
    } catch {
      // Don't expose email delivery failures
    }
  }

  return NextResponse.json({ ok: true })
}

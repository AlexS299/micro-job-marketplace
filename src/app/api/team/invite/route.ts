import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { checkBusinessRole } from '@/lib/rbac'
import { sendInvitationEmail } from '@/lib/email'
import { audit, auditMeta } from '@/lib/audit'

const VALID_ROLES = ['ADMIN', 'EDITOR', 'VIEWER']
const EXPIRES_DAYS = 7

export async function POST(req: NextRequest) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const ownerUser = await db.user.findUnique({ where: { id: userId }, select: { businessId: true, name: true, email: true } })
  const roleErr = await checkBusinessRole(business.id, userId, ownerUser?.businessId ?? null, 'ADMIN')
  if (roleErr) return roleErr

  const body = await req.json() as { email?: string; role?: string }
  const { email, role = 'VIEWER' } = body

  if (!email?.includes('@')) return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 })
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'תפקיד לא חוקי' }, { status: 400 })

  // Check if already a member
  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    const alreadyMember = await db.businessUser.findUnique({
      where: { businessId_userId: { businessId: business.id, userId: existingUser.id } },
    })
    if (alreadyMember?.acceptedAt) {
      return NextResponse.json({ error: 'משתמש זה כבר חבר בעסק' }, { status: 400 })
    }
  }

  // Delete any existing pending invitation for this email
  await db.invitation.deleteMany({ where: { businessId: business.id, email } })

  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 86_400_000)

  await db.invitation.create({
    data: { businessId: business.id, email, role, token, expiresAt },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get('host')}`
  const inviteUrl = `${baseUrl}/invite/${token}`

  let emailWarning: string | undefined
  try {
    await sendInvitationEmail({
      toEmail: email,
      businessName: business.name,
      inviterName: ownerUser?.name ?? ownerUser?.email ?? 'הבעלים',
      role,
      inviteUrl,
      expiresInDays: EXPIRES_DAYS,
    })
  } catch (e) {
    console.error('[team/invite] email failed:', e)
    emailWarning = 'שליחת המייל נכשלה. שתף את קישור ההזמנה ידנית.'
  }

  await audit(business.id, userId, 'team.invite', {
    changes: { email, role }, ...auditMeta(req),
  })

  return NextResponse.json({ ok: true, inviteUrl, email, role, warning: emailWarning })
}

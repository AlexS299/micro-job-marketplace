// Called when a logged-in user accepts an invitation
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const session_result = await getAuthBusiness()
  // We only need userId here — allow if authenticated
  if (session_result.error) return session_result.error
  const { userId } = session_result

  const invitation = await db.invitation.findUnique({ where: { token: params.token } })
  if (!invitation) return NextResponse.json({ error: 'הזמנה לא נמצאה' }, { status: 404 })
  if (invitation.acceptedAt) return NextResponse.json({ error: 'הזמנה כבר נוצלה' }, { status: 400 })
  if (invitation.expiresAt < new Date()) return NextResponse.json({ error: 'הזמנה פגה תוקף' }, { status: 410 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
  if (user?.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return NextResponse.json({ error: 'ההזמנה מיועדת לכתובת מייל שונה' }, { status: 403 })
  }

  // Upsert BusinessUser
  await db.businessUser.upsert({
    where: { businessId_userId: { businessId: invitation.businessId, userId } },
    update: { role: invitation.role, acceptedAt: new Date() },
    create: { businessId: invitation.businessId, userId, role: invitation.role, acceptedAt: new Date() },
  })

  await db.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  })

  return NextResponse.json({ ok: true, businessId: invitation.businessId, role: invitation.role })
}

// GET — fetch invitation details (for the accept page)
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const invitation = await db.invitation.findUnique({
    where: { token: params.token },
    include: { business: { select: { name: true } } },
  })
  if (!invitation) return NextResponse.json({ error: 'הזמנה לא נמצאה' }, { status: 404 })

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    businessName: invitation.business.name,
    expiresAt: invitation.expiresAt,
    accepted: !!invitation.acceptedAt,
    expired: invitation.expiresAt < new Date(),
  })
}

import { NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { checkBusinessRole } from '@/lib/rbac'

export async function GET() {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  // Fetch the owner's User record to get their primary businessId
  const ownerUser = await db.user.findUnique({ where: { id: userId }, select: { businessId: true } })

  const roleErr = await checkBusinessRole(business.id, userId, ownerUser?.businessId ?? null, 'VIEWER')
  if (roleErr) return roleErr

  const [members, pending] = await Promise.all([
    db.businessUser.findMany({
      where: { businessId: business.id, acceptedAt: { not: null } },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { invitedAt: 'asc' },
    }),
    db.invitation.findMany({
      where: { businessId: business.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Also include the owner
  const owner = await db.user.findFirst({
    where: { businessId: business.id },
    select: { id: true, email: true, name: true },
  })

  return NextResponse.json({ owner, members, pending })
}

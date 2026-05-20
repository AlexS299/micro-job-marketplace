import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { checkBusinessRole } from '@/lib/rbac'
import { audit, auditMeta } from '@/lib/audit'

const VALID_ROLES = ['ADMIN', 'EDITOR', 'VIEWER']

// PATCH — change role
export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const ownerUser = await db.user.findUnique({ where: { id: userId }, select: { businessId: true } })
  const roleErr = await checkBusinessRole(business.id, userId, ownerUser?.businessId ?? null, 'ADMIN')
  if (roleErr) return roleErr

  if (params.userId === userId) {
    return NextResponse.json({ error: 'לא ניתן לשנות את הרשאת עצמך' }, { status: 400 })
  }

  const body = await req.json() as { role?: string }
  if (!body.role || !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'תפקיד לא חוקי' }, { status: 400 })
  }

  const bu = await db.businessUser.findUnique({
    where: { businessId_userId: { businessId: business.id, userId: params.userId } },
  })
  if (!bu) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })

  const updated = await db.businessUser.update({
    where: { id: bu.id },
    data: { role: body.role },
    include: { user: { select: { email: true, name: true } } },
  })

  await audit(business.id, userId, 'team.role_change', {
    resourceId: params.userId, changes: { role: body.role }, ...auditMeta(req),
  })

  return NextResponse.json(updated)
}

// DELETE — remove member
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const ownerUser = await db.user.findUnique({ where: { id: userId }, select: { businessId: true } })
  const roleErr = await checkBusinessRole(business.id, userId, ownerUser?.businessId ?? null, 'ADMIN')
  if (roleErr) return roleErr

  if (params.userId === userId) {
    return NextResponse.json({ error: 'לא ניתן להסיר את עצמך' }, { status: 400 })
  }

  await db.businessUser.deleteMany({
    where: { businessId: business.id, userId: params.userId },
  })

  await audit(business.id, userId, 'team.remove', {
    resourceId: params.userId, ...auditMeta(req),
  })

  return NextResponse.json({ ok: true })
}

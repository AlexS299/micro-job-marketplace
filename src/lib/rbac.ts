/**
 * Role-based access control for multi-user businesses.
 *
 * Roles (ascending permission):
 *   VIEWER  — read-only (accountant)
 *   EDITOR  — create/edit invoices, expenses, clients, employees
 *   ADMIN   — full access including settings, billing, payroll, bank
 *   OWNER   — the original business creator (user.businessId === business.id)
 *
 * Usage in routes:
 *   const roleErr = await checkBusinessRole(business.id, userId, ['ADMIN', 'OWNER'])
 *   if (roleErr) return roleErr
 */
import db from '@/lib/db'
import { NextResponse } from 'next/server'

export type BusinessRole = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER'

const ROLE_RANK: Record<BusinessRole, number> = {
  VIEWER: 1, EDITOR: 2, ADMIN: 3, OWNER: 4,
}

export async function getBusinessRole(
  userId: string,
  businessId: string,
  ownerBusinessId: string | null  // User.businessId (their primary business = OWNER)
): Promise<BusinessRole | null> {
  if (ownerBusinessId === businessId) return 'OWNER'

  const bu = await db.businessUser.findUnique({
    where: { businessId_userId: { businessId, userId } },
  })
  if (!bu || !bu.acceptedAt) return null
  return (bu.role as BusinessRole) ?? 'VIEWER'
}

export async function checkBusinessRole(
  businessId: string,
  userId: string,
  ownerBusinessId: string | null,
  minRole: BusinessRole
): Promise<NextResponse | null> {
  const role = await getBusinessRole(userId, businessId, ownerBusinessId)
  if (!role) {
    return NextResponse.json({ error: 'אין לך גישה לעסק זה' }, { status: 403 })
  }
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    return NextResponse.json({
      error: 'insufficient_role',
      message: `נדרשת הרשאת ${minRole} לפעולה זו. הרשאתך הנוכחית: ${role}`,
    }, { status: 403 })
  }
  return null
}

export const ROLE_LABELS: Record<BusinessRole, string> = {
  OWNER:  'בעלים',
  ADMIN:  'מנהל',
  EDITOR: 'עורך',
  VIEWER: 'צופה (רו"ח)',
}

export const ROLE_DESCRIPTIONS: Record<BusinessRole, string> = {
  OWNER:  'גישה מלאה לכל הנתונים והגדרות',
  ADMIN:  'גישה מלאה, יכול להזמין ולהסיר משתמשים',
  EDITOR: 'יצירה ועריכה של חשבוניות, הוצאות, לקוחות ועובדים',
  VIEWER: 'צפייה בלבד בכל הנתונים (מתאים לרואה חשבון)',
}

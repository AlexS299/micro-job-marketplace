import db from '@/lib/db'

export type AuditAction =
  | 'invoice.create' | 'invoice.update' | 'invoice.delete' | 'invoice.send' | 'invoice.paid'
  | 'quote.create'  | 'quote.update'   | 'quote.delete'   | 'quote.send'   | 'quote.convert'
  | 'expense.create' | 'expense.update' | 'expense.delete'
  | 'client.create'  | 'client.update'  | 'client.delete'
  | 'employee.create'| 'employee.update'| 'employee.delete'
  | 'payroll.run'
  | 'bank.connect'   | 'bank.sync'      | 'bank.disconnect'
  | 'vat.submit'
  | 'settings.update'
  | 'billing.upgrade'| 'billing.cancel'
  | 'user.login'     | 'user.logout'    | 'user.password_change'
  | 'admin.view'

export interface AuditMeta {
  resourceId?: string
  resourceType?: string
  changes?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

export async function audit(
  businessId: string,
  userId: string | null,
  action: AuditAction,
  meta?: AuditMeta
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        businessId,
        userId: userId ?? 'system',
        action,
        resourceId:   meta?.resourceId,
        resourceType: meta?.resourceType,
        changes:      meta?.changes ? JSON.stringify(meta.changes) : null,
        ip:           meta?.ip,
        userAgent:    meta?.userAgent,
      },
    })
  } catch {
    // Audit log failure must never crash the main request
    console.error('[audit] failed to write log for action:', action)
  }
}

export function auditMeta(req: Request): Pick<AuditMeta, 'ip' | 'userAgent'> {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown',
    userAgent: req.headers.get('user-agent') ?? undefined,
  }
}

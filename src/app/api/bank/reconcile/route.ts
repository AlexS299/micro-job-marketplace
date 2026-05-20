import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

// Returns unreconciled income transactions that match open invoice amounts
export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const [transactions, invoices] = await Promise.all([
    db.bankTransaction.findMany({
      where: {
        isReconciled: false,
        amount: { gt: 0 },
        bankAccount: { businessId: business.id },
      },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    db.invoice.findMany({
      where: { businessId: business.id, status: { in: ['SENT', 'OVERDUE'] } },
      include: { client: true },
    }),
  ])

  const matches = transactions
    .map(tx => ({
      transaction: tx,
      matches: invoices.filter(inv => Math.abs(inv.total - tx.amount) < 2),
    }))
    .filter(m => m.matches.length > 0)

  return NextResponse.json(matches)
}

// Confirm reconciliation: mark transaction reconciled + invoice paid
export async function POST(req: NextRequest) {
  const { transactionId, invoiceId } = await req.json() as { transactionId: string; invoiceId: string }

  await Promise.all([
    db.bankTransaction.update({
      where: { id: transactionId },
      data: { isReconciled: true, invoiceId },
    }),
    db.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date() },
    }),
  ])

  return NextResponse.json({ ok: true })
}

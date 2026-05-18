import { NextRequest, NextResponse } from 'next/server'
import { fetchAccounts, fetchTransactions, type BankCode } from '@/lib/open-banking'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { connectionId?: string }

  const connections = await db.bankConnection.findMany({
    where: { status: 'active', ...(body.connectionId ? { id: body.connectionId } : {}) },
    include: { accounts: true },
  })

  let totalSynced = 0
  const errors: string[] = []

  for (const conn of connections) {
    try {
      const bankCode = conn.bankCode as BankCode
      const fromDate = conn.lastSyncAt
        ? conn.lastSyncAt.toISOString().split('T')[0]
        : new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]
      const toDate = new Date().toISOString().split('T')[0]

      // Refresh balances
      const remoteAccounts = await fetchAccounts(bankCode, conn.accessToken)
      for (const acc of remoteAccounts) {
        let dbAcc = conn.accounts.find(a => a.externalId === acc.externalId)
        if (!dbAcc) {
          dbAcc = await db.bankAccount.create({
            data: {
              businessId: conn.businessId,
              connectionId: conn.id,
              externalId: acc.externalId,
              bankName: acc.bankName,
              accountNumber: acc.accountNumber,
              branchNumber: acc.branchNumber,
              currency: acc.currency,
              balance: acc.balance,
            },
          })
        } else {
          await db.bankAccount.update({
            where: { id: dbAcc.id },
            data: { balance: acc.balance, lastSyncAt: new Date() },
          })
        }

        // Fetch and store new transactions
        const txs = await fetchTransactions(bankCode, conn.accessToken, acc.externalId, fromDate, toDate)
        for (const tx of txs) {
          const exists = await db.bankTransaction.findFirst({
            where: { bankAccountId: dbAcc.id, reference: tx.externalId },
          })
          if (exists) continue

          await db.bankTransaction.create({
            data: {
              bankAccountId: dbAcc.id,
              date: new Date(tx.date),
              description: tx.description,
              amount: tx.amount,
              balance: tx.balance,
              category: tx.category ?? (tx.amount > 0 ? 'INCOME' : 'EXPENSE'),
              reference: tx.externalId,
            },
          })
          totalSynced++
        }
      }

      await db.bankConnection.update({ where: { id: conn.id }, data: { lastSyncAt: new Date() } })
    } catch (err) {
      errors.push(`${conn.bankName}: ${(err as Error).message}`)
    }
  }

  return NextResponse.json({ synced: totalSynced, errors })
}

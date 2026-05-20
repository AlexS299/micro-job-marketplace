import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const category = searchParams.get('category')
    const reconciled = searchParams.get('reconciled')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    const { business, error } = await getAuthBusiness()
    if (error) return error

    // Get bank accounts for this business
    const accounts = await db.bankAccount.findMany({
      where: { businessId: business.id },
    })
    const accountIds = accounts.map((a) => a.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { bankAccountId: { in: accountIds } }
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) where.date.gte = new Date(dateFrom)
      if (dateTo) where.date.lte = new Date(dateTo)
    }
    if (category) where.category = category
    if (reconciled !== null) where.isReconciled = reconciled === 'true'

    const [transactions, total] = await Promise.all([
      db.bankTransaction.findMany({
        where,
        include: { bankAccount: true },
        orderBy: { date: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.bankTransaction.count({ where }),
    ])

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)

    return NextResponse.json({
      transactions,
      accounts,
      totalBalance,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('GET bank error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת נתוני בנק' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { transactions, accountId } = body

    const { business, error } = await getAuthBusiness()
    if (error) return error

    // Get or create bank account
    let bankAccountId = accountId
    if (!bankAccountId) {
      let account = await db.bankAccount.findFirst({
        where: { businessId: business.id },
      })
      if (!account) {
        account = await db.bankAccount.create({
          data: {
            businessId: business.id,
            bankName: 'בנק לאומי',
            accountNumber: '000000',
            currency: 'ILS',
            balance: 0,
          },
        })
      }
      bankAccountId = account.id
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'נדרשות עסקאות לייבוא' }, { status: 400 })
    }

    const created = await Promise.all(
      transactions.map((tx: {
        date: string
        description: string
        amount: number
        balance?: number
        category?: string
        reference?: string
      }) =>
        db.bankTransaction.create({
          data: {
            bankAccountId,
            date: new Date(tx.date),
            description: tx.description,
            amount: tx.amount,
            balance: tx.balance || null,
            category: tx.category || (tx.amount > 0 ? 'INCOME' : 'EXPENSE'),
            reference: tx.reference || null,
            isReconciled: false,
          },
        })
      )
    )

    // Update account balance if last transaction has balance
    const lastTx = transactions[transactions.length - 1]
    if (lastTx.balance !== undefined) {
      await db.bankAccount.update({
        where: { id: bankAccountId },
        data: { balance: lastTx.balance, lastSyncAt: new Date() },
      })
    }

    return NextResponse.json({ created: created.length, transactions: created }, { status: 201 })
  } catch (error) {
    console.error('POST bank error:', error)
    return NextResponse.json({ error: 'שגיאה בייבוא עסקאות' }, { status: 500 })
  }
}

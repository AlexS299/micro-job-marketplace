import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const connections = await db.bankConnection.findMany({
    where: { businessId: business.id },
    include: {
      accounts: {
        include: { _count: { select: { transactions: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(connections)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await db.bankConnection.update({ where: { id }, data: { status: 'revoked' } })
  return NextResponse.json({ ok: true })
}

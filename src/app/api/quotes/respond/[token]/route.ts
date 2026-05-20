// Public endpoint — no auth needed. Identified by token, action via query param.
import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') // 'accept' | 'decline'

  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 })
  }

  const quote = await db.quote.findUnique({ where: { token: params.token } })
  if (!quote) return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 })

  if (quote.status === 'ACCEPTED' || quote.status === 'DECLINED') {
    return NextResponse.json({ error: 'ההצעה כבר טופלה', status: quote.status }, { status: 400 })
  }
  if (quote.validUntil < new Date()) {
    return NextResponse.json({ error: 'הצעה פגת תוקף' }, { status: 410 })
  }

  const now = new Date()
  await db.quote.update({
    where: { id: quote.id },
    data: {
      status:      action === 'accept' ? 'ACCEPTED' : 'DECLINED',
      acceptedAt:  action === 'accept' ? now : null,
      declinedAt:  action === 'decline' ? now : null,
    },
  })

  return NextResponse.json({ success: true, action, quoteNumber: quote.quoteNumber })
}

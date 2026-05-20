import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const client = await db.client.findFirst({
    where: { id: params.id, businessId: business.id },
    select: { id: true, portalToken: true },
  })
  if (!client) return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 })

  const token = client.portalToken ?? crypto.randomBytes(32).toString('base64url')

  if (!client.portalToken) {
    await db.client.update({ where: { id: client.id }, data: { portalToken: token } })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get('host')}`
  return NextResponse.json({ token, portalUrl: `${baseUrl}/portal/${token}` })
}

import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const client = await db.client.findFirst({
    where: { id: params.id, businessId: business.id },
    include: {
      invoices: { include: { items: true }, orderBy: { issueDate: 'desc' } },
      _count: { select: { invoices: true } },
    },
  })
  if (!client) return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.client.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 })

  const { name, email, phone, vatNumber, idNumber, address, city, notes } = await req.json() as Record<string, string>
  const client = await db.client.update({
    where: { id: params.id },
    data: { name: name?.trim(), email: email ?? undefined, phone: phone ?? undefined, vatNumber: vatNumber ?? undefined, idNumber: idNumber ?? undefined, address: address ?? undefined, city: city ?? undefined, notes: notes ?? undefined },
  })

  await audit(business.id, userId, 'client.update', {
    resourceId: params.id, resourceType: 'client', ...auditMeta(req),
  })

  return NextResponse.json(client)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const existing = await db.client.findFirst({ where: { id: params.id, businessId: business.id } })
  if (!existing) return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 })

  await db.client.delete({ where: { id: params.id } })

  await audit(business.id, userId, 'client.delete', {
    resourceId: params.id, resourceType: 'client', ...auditMeta(req),
  })

  return NextResponse.json({ success: true })
}

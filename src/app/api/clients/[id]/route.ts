import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await db.client.findUnique({
      where: { id: params.id },
      include: {
        invoices: {
          include: { items: true },
          orderBy: { issueDate: 'desc' },
        },
        _count: { select: { invoices: true } },
      },
    })
    if (!client) {
      return NextResponse.json({ error: 'לקוח לא נמצא' }, { status: 404 })
    }
    return NextResponse.json(client)
  } catch (error) {
    console.error('GET client error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת לקוח' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { name, email, phone, vatNumber, idNumber, address, city, notes } = body

    const client = await db.client.update({
      where: { id: params.id },
      data: {
        name: name?.trim(),
        email: email ?? undefined,
        phone: phone ?? undefined,
        vatNumber: vatNumber ?? undefined,
        idNumber: idNumber ?? undefined,
        address: address ?? undefined,
        city: city ?? undefined,
        notes: notes ?? undefined,
      },
    })
    return NextResponse.json(client)
  } catch (error) {
    console.error('PUT client error:', error)
    return NextResponse.json({ error: 'שגיאה בעדכון לקוח' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.client.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE client error:', error)
    return NextResponse.json({ error: 'שגיאה במחיקת לקוח' }, { status: 500 })
  }
}

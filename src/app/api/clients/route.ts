import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'

async function getOrCreateBusiness() {
  let business = await db.business.findFirst()
  if (!business) {
    business = await db.business.create({
      data: { name: 'העסק שלי', taxType: 'OSEK_MURSHEH', vatReportPeriod: 'BIMONTHLY' },
    })
  }
  return business
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const business = await getOrCreateBusiness()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { businessId: business.id }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { vatNumber: { contains: search } },
      ]
    }

    const clients = await db.client.findMany({
      where,
      include: {
        _count: { select: { invoices: true } },
        invoices: {
          select: { total: true, status: true },
          where: { status: { not: 'CANCELLED' } },
        },
      },
      orderBy: { name: 'asc' },
    })

    const clientsWithRevenue = clients.map((c) => ({
      ...c,
      totalRevenue: c.invoices
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + i.total, 0),
      outstandingAmount: c.invoices
        .filter((i) => ['SENT', 'OVERDUE'].includes(i.status))
        .reduce((sum, i) => sum + i.total, 0),
      invoices: undefined, // don't return all invoice data
    }))

    return NextResponse.json(clientsWithRevenue)
  } catch (error) {
    console.error('GET clients error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת לקוחות' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, vatNumber, idNumber, address, city, notes } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'שם לקוח נדרש' }, { status: 400 })
    }

    const business = await getOrCreateBusiness()

    const client = await db.client.create({
      data: {
        businessId: business.id,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        vatNumber: vatNumber || null,
        idNumber: idNumber || null,
        address: address || null,
        city: city || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('POST client error:', error)
    return NextResponse.json({ error: 'שגיאה ביצירת לקוח' }, { status: 500 })
  }
}

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

export async function GET() {
  const business = await getOrCreateBusiness()
  return NextResponse.json(business)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const business = await getOrCreateBusiness()
  const updated = await db.business.update({
    where: { id: business.id },
    data: {
      name: body.name,
      vatNumber: body.vatNumber,
      businessNumber: body.businessNumber,
      address: body.address,
      city: body.city,
      phone: body.phone,
      email: body.email,
      bankAccount: body.bankAccount,
      bankName: body.bankName,
      taxType: body.taxType,
      vatReportPeriod: body.vatReportPeriod,
    },
  })
  return NextResponse.json(updated)
}

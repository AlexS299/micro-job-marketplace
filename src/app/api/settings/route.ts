import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error
  return NextResponse.json(business)
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { business, error } = await getAuthBusiness()
  if (error) return error
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

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { business, error } = await getAuthBusiness()
  if (error) return error
  const updated = await db.business.update({
    where: { id: business.id },
    data: body,
  })
  return NextResponse.json(updated)
}

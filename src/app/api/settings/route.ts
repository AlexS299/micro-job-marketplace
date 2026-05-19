import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import { audit, auditMeta } from '@/lib/audit'
import { parseBody, BusinessSettingsSchema } from '@/lib/validate'

export async function GET() {
  const { business, error } = await getAuthBusiness()
  if (error) return error
  return NextResponse.json(business)
}

export async function PUT(request: NextRequest) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const { data, error: valError } = await parseBody(request, BusinessSettingsSchema)
  if (valError) return valError

  const updated = await db.business.update({
    where: { id: business.id },
    data: {
      name:           data.name,
      vatNumber:      data.vatNumber,
      businessNumber: data.businessNumber,
      address:        data.address,
      city:           data.city,
      phone:          data.phone,
      email:          data.email || null,
      bankAccount:    data.bankAccount,
      bankName:       data.bankName,
      taxType:        data.taxType,
      vatReportPeriod:data.vatReportPeriod,
    },
  })

  await audit(business.id, userId, 'settings.update', { ...auditMeta(request) })
  return NextResponse.json(updated)
}

export async function PATCH(request: NextRequest) {
  const { business, userId, error } = await getAuthBusiness()
  if (error) return error

  const { data, error: valError } = await parseBody(request, BusinessSettingsSchema.partial())
  if (valError) return valError

  // Explicit whitelist — never allow stripeCustomerId, id, or relations through PATCH
  const safeFields = {
    name:           data.name,
    vatNumber:      data.vatNumber,
    businessNumber: data.businessNumber,
    address:        data.address,
    city:           data.city,
    phone:          data.phone,
    email:          data.email || undefined,
    bankAccount:    data.bankAccount,
    bankName:       data.bankName,
    taxType:        data.taxType,
    vatReportPeriod:data.vatReportPeriod,
    whatsappPhone:  data.whatsappPhone,
  }
  // Remove undefined keys
  const cleanData = Object.fromEntries(Object.entries(safeFields).filter(([, v]) => v !== undefined))

  const updated = await db.business.update({ where: { id: business.id }, data: cleanData })

  await audit(business.id, userId, 'settings.update', { ...auditMeta(request) })
  return NextResponse.json(updated)
}

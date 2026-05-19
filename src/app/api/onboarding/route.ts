import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId     = (session.user as { id?: string }).id
  const businessId = (session.user as { businessId?: string }).businessId
  if (!userId || !businessId) return NextResponse.json({ error: 'No user/business' }, { status: 400 })

  const { businessName, taxType, vatNumber, locale } = await req.json() as {
    businessName?: string; taxType?: string; vatNumber?: string; locale?: string
  }

  const VALID_LOCALES = ['he', 'en', 'ru']
  const safeLocale = VALID_LOCALES.includes(locale ?? '') ? (locale as string) : 'he'

  await Promise.all([
    db.business.update({
      where: { id: businessId },
      data: {
        name:      businessName?.trim() || undefined,
        taxType:   taxType || undefined,
        vatNumber: vatNumber?.trim() || null,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { locale: safeLocale, onboardingDone: true },
    }),
  ])

  return NextResponse.json({ ok: true })
}

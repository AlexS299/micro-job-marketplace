import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, fetchAccounts, SUPPORTED_BANKS, type BankCode } from '@/lib/open-banking'
import { encrypt } from '@/lib/encrypt'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard/bank?error=missing_params`)
  }

  let businessId: string
  let bankCode: BankCode
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    businessId = decoded.businessId
    bankCode   = decoded.bankCode
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/bank?error=invalid_state`)
  }

  if (!(bankCode in SUPPORTED_BANKS)) {
    return NextResponse.redirect(`${origin}/dashboard/bank?error=unsupported_bank`)
  }

  try {
    const tokens = await exchangeCodeForToken(bankCode, code)

    // Ensure business exists
    let business = await db.business.findUnique({ where: { id: businessId } })
    if (!business) business = await db.business.findFirst() ?? await db.business.create({ data: { name: 'העסק שלי' } })

    // Upsert connection
    const encAccessToken  = encrypt(tokens.accessToken)
    const encRefreshToken = tokens.refreshToken ? encrypt(tokens.refreshToken) : null

    const connection = await db.bankConnection.upsert({
      where: { businessId_bankCode: { businessId: business.id, bankCode } },
      create: {
        businessId: business.id,
        bankCode,
        bankName: SUPPORTED_BANKS[bankCode].name,
        accessToken: encAccessToken,
        refreshToken: encRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        consentId: tokens.consentId,
        status: 'active',
      },
      update: {
        accessToken: encAccessToken,
        refreshToken: encRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        consentId: tokens.consentId,
        status: 'active',
      },
    })

    // Sync accounts
    const accounts = await fetchAccounts(bankCode, tokens.accessToken)
    for (const acc of accounts) {
      await db.bankAccount.upsert({
        where: { externalId: acc.externalId },
        create: {
          businessId: business.id,
          connectionId: connection.id,
          externalId: acc.externalId,
          bankName: acc.bankName,
          accountNumber: acc.accountNumber,
          branchNumber: acc.branchNumber,
          currency: acc.currency,
          balance: acc.balance,
        },
        update: {
          balance: acc.balance,
          connectionId: connection.id,
        },
      })
    }

    return NextResponse.redirect(`${origin}/dashboard/bank?connected=1`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${origin}/dashboard/bank?error=auth_failed`)
  }
}

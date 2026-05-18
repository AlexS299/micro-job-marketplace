export const SUPPORTED_BANKS = {
  HAPOALIM:          { name: 'בנק הפועלים',       nameEn: 'Bank Hapoalim',        code: 'HAPOALIM' },
  LEUMI:             { name: 'בנק לאומי',          nameEn: 'Bank Leumi',           code: 'LEUMI' },
  DISCOUNT:          { name: 'בנק דיסקונט',        nameEn: 'Bank Discount',        code: 'DISCOUNT' },
  MIZRAHI:           { name: 'מזרחי טפחות',        nameEn: 'Mizrahi Tefahot',      code: 'MIZRAHI' },
  FIRST_INTERNATIONAL: { name: 'הבינלאומי הראשון', nameEn: "First Int'l Bank",     code: 'FIRST_INTERNATIONAL' },
  MASSAD:            { name: 'בנק מסד',            nameEn: 'Bank Massad',          code: 'MASSAD' },
} as const

export type BankCode = keyof typeof SUPPORTED_BANKS

// Flip to false + set OPEN_BANKING_<BANK>_CLIENT_ID/SECRET env vars to use real bank APIs
const SANDBOX = process.env.OPEN_BANKING_SANDBOX !== 'false'

export function getAuthorizationUrl(bankCode: BankCode, state: string): string {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  if (SANDBOX) {
    return `${base}/api/bank/callback?code=sandbox_${bankCode.toLowerCase()}&state=${encodeURIComponent(state)}`
  }
  const params = new URLSearchParams({
    client_id: process.env[`OPEN_BANKING_${bankCode}_CLIENT_ID`] ?? '',
    redirect_uri: `${base}/api/bank/callback`,
    scope: 'accounts transactions balances',
    response_type: 'code',
    state,
  })
  return `https://api.${bankCode.toLowerCase()}.co.il/oauth/authorize?${params}`
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  consentId: string
}

export async function exchangeCodeForToken(bankCode: BankCode, code: string): Promise<OAuthTokens> {
  if (SANDBOX || code.startsWith('sandbox_')) {
    return {
      accessToken: `sandbox_access_${bankCode}_${Date.now()}`,
      refreshToken: `sandbox_refresh_${bankCode}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      consentId: `consent_${Date.now()}`,
    }
  }
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`https://api.${bankCode.toLowerCase()}.co.il/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env[`OPEN_BANKING_${bankCode}_CLIENT_ID`] ?? '',
      client_secret: process.env[`OPEN_BANKING_${bankCode}_CLIENT_SECRET`] ?? '',
      redirect_uri: `${base}/api/bank/callback`,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const d = await res.json()
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresAt: new Date(Date.now() + (d.expires_in as number) * 1000),
    consentId: (d.consent_id as string | undefined) ?? `consent_${Date.now()}`,
  }
}

export interface OpenBankingAccount {
  externalId: string
  accountNumber: string
  branchNumber: string
  bankName: string
  currency: string
  balance: number
  accountType: 'CURRENT' | 'SAVINGS' | 'BUSINESS'
}

export interface OpenBankingTransaction {
  externalId: string
  date: string
  description: string
  amount: number
  balance: number
  reference?: string
  category?: string
}

export async function fetchAccounts(bankCode: BankCode, accessToken: string): Promise<OpenBankingAccount[]> {
  if (SANDBOX || accessToken.includes('sandbox_')) return getSandboxAccounts(bankCode)
  const res = await fetch(`https://api.${bankCode.toLowerCase()}.co.il/open-banking/v2/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'x-api-version': '2.0', 'x-fapi-financial-id': 'IL' },
  })
  if (!res.ok) throw new Error(`Fetch accounts failed: ${res.status}`)
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.Data?.Account ?? []).map((a: any) => ({
    externalId: a.AccountId,
    accountNumber: a.AccountNumber ?? '',
    branchNumber: a.BranchCode ?? '',
    bankName: SUPPORTED_BANKS[bankCode].name,
    currency: a.Currency ?? 'ILS',
    balance: 0,
    accountType: 'BUSINESS' as const,
  }))
}

export async function fetchTransactions(
  bankCode: BankCode,
  accessToken: string,
  externalAccountId: string,
  fromDate: string,
  toDate: string,
): Promise<OpenBankingTransaction[]> {
  if (SANDBOX || accessToken.includes('sandbox_')) {
    return getSandboxTransactions(externalAccountId, fromDate, toDate)
  }
  const res = await fetch(
    `https://api.${bankCode.toLowerCase()}.co.il/open-banking/v2/accounts/${externalAccountId}/transactions?fromDate=${fromDate}&toDate=${toDate}`,
    { headers: { Authorization: `Bearer ${accessToken}`, 'x-api-version': '2.0', 'x-fapi-financial-id': 'IL' } },
  )
  if (!res.ok) throw new Error(`Fetch transactions failed: ${res.status}`)
  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.Data?.Transaction ?? []).map((t: any) => ({
    externalId: t.TransactionId,
    date: t.BookingDateTime,
    description: t.TransactionInformation ?? '',
    amount: (t.CreditDebitIndicator === 'Credit' ? 1 : -1) * (t.Amount?.Amount ?? 0),
    balance: t.Balance?.Amount ?? 0,
    reference: t.TransactionReference,
  }))
}

// ─── Sandbox data generators ──────────────────────────────────────────────────

function getSandboxAccounts(bankCode: BankCode): OpenBankingAccount[] {
  const seed = bankCode.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return [{
    externalId: `${bankCode}_acc_main`,
    accountNumber: String(100000 + seed * 137 % 900000),
    branchNumber: String(600 + seed % 400),
    bankName: SUPPORTED_BANKS[bankCode].name,
    currency: 'ILS',
    balance: 52340 + (seed % 10) * 1000,
    accountType: 'BUSINESS',
  }]
}

const TX_TEMPLATES = [
  { desc: 'תשלום לקוח - שירותי ייעוץ',      amtMin: 3000,  amtMax: 15000, cat: 'INCOME',  sign:  1 },
  { desc: 'הפקדה - פרויקט פיתוח תוכנה',      amtMin: 5000,  amtMax: 25000, cat: 'INCOME',  sign:  1 },
  { desc: 'העברה נכנסת מלקוח',                amtMin: 2000,  amtMax: 8000,  cat: 'INCOME',  sign:  1 },
  { desc: 'תשלום חשבונית מס',                 amtMin: 1500,  amtMax: 12000, cat: 'INCOME',  sign:  1 },
  { desc: 'שכר דירה משרד',                    amtMin: 3500,  amtMax: 5000,  cat: 'EXPENSE', sign: -1 },
  { desc: 'חשמל ומים - ועד בית',              amtMin: 200,   amtMax: 600,   cat: 'EXPENSE', sign: -1 },
  { desc: 'טלפון ואינטרנט עסקי',              amtMin: 180,   amtMax: 350,   cat: 'EXPENSE', sign: -1 },
  { desc: 'ביטוח עסק שנתי',                   amtMin: 400,   amtMax: 900,   cat: 'EXPENSE', sign: -1 },
  { desc: 'דלק ותחבורה',                      amtMin: 300,   amtMax: 700,   cat: 'EXPENSE', sign: -1 },
  { desc: 'ציוד משרדי',                       amtMin: 200,   amtMax: 1500,  cat: 'EXPENSE', sign: -1 },
  { desc: 'ארנונה עסקית',                     amtMin: 800,   amtMax: 1500,  cat: 'EXPENSE', sign: -1 },
  { desc: 'שירותי רואה חשבון',                amtMin: 500,   amtMax: 1200,  cat: 'EXPENSE', sign: -1 },
  { desc: 'מע"מ לרשות המסים - תקופתי',       amtMin: 1500,  amtMax: 8000,  cat: 'VAT',     sign: -1 },
  { desc: 'מקדמות מס הכנסה',                  amtMin: 800,   amtMax: 3000,  cat: 'TAX',     sign: -1 },
  { desc: 'ביטוח לאומי מעביד',                amtMin: 1200,  amtMax: 3500,  cat: 'TAX',     sign: -1 },
  { desc: 'שכר עובדים',                       amtMin: 8000,  amtMax: 20000, cat: 'SALARY',  sign: -1 },
  { desc: 'הוצאות שיווק ופרסום',              amtMin: 500,   amtMax: 2500,  cat: 'EXPENSE', sign: -1 },
  { desc: 'תשלום למקבלי שירות',               amtMin: 1000,  amtMax: 4000,  cat: 'EXPENSE', sign: -1 },
  { desc: 'הכנסה - לקוח חדש',                 amtMin: 4000,  amtMax: 20000, cat: 'INCOME',  sign:  1 },
  { desc: 'השבת מע"מ מרשות המסים',            amtMin: 500,   amtMax: 3000,  cat: 'VAT',     sign:  1 },
]

function seeded(n: number) {
  const x = Math.sin(n + 1) * 10000
  return x - Math.floor(x)
}

function getSandboxTransactions(externalAccountId: string, fromDate: string, toDate: string): OpenBankingTransaction[] {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  const days = Math.ceil((to.getTime() - from.getTime()) / 86400000)
  const results: OpenBankingTransaction[] = []
  let balance = 52340
  let seed = externalAccountId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)

  for (let d = 0; d < days; d++) {
    const txCount = seeded(seed + d) > 0.65 ? 2 : seeded(seed + d + 77) > 0.4 ? 1 : 0
    for (let i = 0; i < txCount; i++) {
      seed++
      const tpl = TX_TEMPLATES[Math.floor(seeded(seed) * TX_TEMPLATES.length)]
      const rawAmt = Math.round((tpl.amtMin + seeded(seed + 1) * (tpl.amtMax - tpl.amtMin)) / 10) * 10
      const amount = tpl.sign * rawAmt
      balance = Math.round(balance + amount)
      const date = new Date(from.getTime() + d * 86400000)
      results.push({
        externalId: `tx_${externalAccountId}_${d}_${i}_${seed}`,
        date: date.toISOString(),
        description: tpl.desc,
        amount,
        balance,
        reference: `REF${(100000 + seed) % 999999}`,
        category: tpl.cat,
      })
    }
  }
  return results
}

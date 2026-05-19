/**
 * Cardcom (קארדקום) payment provider.
 * Docs: https://kb.cardcom.solutions/article/AA-11218
 * Uses the "LowProfile" hosted payment page flow.
 */
import type { CreateLinkParams, CreateLinkResult, WebhookPayment } from './types'

const CARDCOM_API = 'https://secure.cardcom.solutions/interface/ChargeToken.aspx'

export async function cardcomCreateLink(
  params: CreateLinkParams,
  terminal: string,
  username: string
): Promise<CreateLinkResult> {
  const body = new URLSearchParams({
    TerminalNumber:               terminal,
    UserName:                     username,
    APILevel:                     '10',
    codepage:                     '65001',
    Operation:                    '1',           // charge
    Amount:                       params.amount.toFixed(2),
    CoinID:                       '1',           // ILS
    'InvoiceHead.Description':    params.description,
    'InvoiceHead.SendByEmail':    '1',
    'InvoiceHead.Language':       'he',
    'Customer.Name':              params.customerName,
    'Customer.Email':             params.customerEmail,
    ReturnValue:                  params.reference,
    SuccessRedirectUrl:           params.successUrl,
    ErrorRedirectUrl:             params.errorUrl,
    'Notifications.URL':          params.notifyUrl,
    'Notifications.Format':       'Post',
  })

  const res = await fetch(CARDCOM_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const text = await res.text()
  // Cardcom returns: ResponseCode=0&Description=OK&url=https://...&LowProfileCode=xxx
  const parsed = Object.fromEntries(new URLSearchParams(text))

  if (parsed.ResponseCode !== '0') {
    throw new Error(`Cardcom error ${parsed.ResponseCode}: ${parsed.Description}`)
  }

  return {
    providerUrl: parsed.url,
    providerReference: parsed.LowProfileCode,
  }
}

// Cardcom posts form-encoded data to notify URL
export function cardcomParseWebhook(
  params: Record<string, string>
): WebhookPayment {
  // ResponseCode=0 means success; ReturnValue is our reference
  const success = params.ResponseCode === '0' || params.Operation === 'Charge'
  return {
    success,
    amount:        parseFloat(params.Amount || '0'),
    currency:      'ILS',
    reference:     params.ReturnValue || '',
    transactionId: params.InternalDealNumber || params.TranzilaTK || '',
    rawData:       params as unknown as Record<string, unknown>,
  }
}

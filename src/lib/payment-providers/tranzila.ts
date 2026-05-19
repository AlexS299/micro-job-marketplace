/**
 * Tranzila (טרנזילה) payment provider.
 * Uses the hosted iframe/redirect page flow.
 * Docs: https://www.tranzila.com/integration
 */
import type { CreateLinkParams, CreateLinkResult, WebhookPayment } from './types'

const TRANZILA_BASE = 'https://direct.tranzila.com'

export async function tranzilaCreateLink(
  params: CreateLinkParams,
  terminal: string,
  apiKey?: string
): Promise<CreateLinkResult> {
  // Tranzila hosted page — build the URL (no server-side call needed for basic flow)
  const query = new URLSearchParams({
    sum:          params.amount.toFixed(2),
    currency:     '1',            // 1 = ILS
    pdesc:        params.description.substring(0, 50),
    email:        params.customerEmail,
    contact:      params.customerName,
    tranmode:     'VK',           // standard transaction
    lang:         'il',
    notify_url:   params.notifyUrl,
    success_url:  params.successUrl,
    fail_url:     params.errorUrl,
    cField1:      params.reference,  // custom field — returned in webhook
    ...(apiKey ? { apikey: apiKey } : {}),
  })

  const providerUrl = `${TRANZILA_BASE}/${terminal}/iframenew.php?${query.toString()}`

  return { providerUrl }
}

// Tranzila posts form-encoded data to notify_url
export function tranzilaParseWebhook(
  params: Record<string, string>
): WebhookPayment {
  // Response: Response=000 means success
  const success = params.Response === '000' || params.response === '000'
  return {
    success,
    amount:        parseFloat(params.sum || params.Amount || '0'),
    currency:      'ILS',
    reference:     params.cField1 || '',
    transactionId: params.index || params.TranzilaTK || '',
    rawData:       params as unknown as Record<string, unknown>,
  }
}

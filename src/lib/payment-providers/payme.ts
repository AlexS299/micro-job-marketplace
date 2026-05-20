/**
 * PayMe (פיימי) payment provider.
 * Modern REST API with payment link generation.
 * Docs: https://payme.io/docs
 */
import type { CreateLinkParams, CreateLinkResult, WebhookPayment } from './types'

const PAYME_API = 'https://api.payme.io/api/generate-sale'

export async function paymeCreateLink(
  params: CreateLinkParams,
  apiKey: string
): Promise<CreateLinkResult> {
  const res = await fetch(PAYME_API, {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sale_price:            Math.round(params.amount * 100), // agora (agurot)
      currency:              'ILS',
      product_name:          params.description.substring(0, 127),
      sale_callback_url:     params.notifyUrl,
      sale_return_url:       params.successUrl,
      sale_failed_return_url: params.errorUrl,
      sale_email:            params.customerEmail,
      sale_name:             params.customerName,
      sale_payment_method:   'credit-card',
      capture_buyer_name:    true,
      sale_send_email:       false,
      // Store our reference in the sale's custom field
      sale_more_info:        params.reference,
      sale_more_info_1:      params.reference,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayMe error ${res.status}: ${err}`)
  }

  const data = await res.json() as { sale_url?: string; status_code?: number; status_error_details?: string }

  if (!data.sale_url) {
    throw new Error(`PayMe: no sale_url returned — ${data.status_error_details ?? 'unknown error'}`)
  }

  return { providerUrl: data.sale_url }
}

// PayMe posts JSON to callback URL
export function paymeParseWebhook(
  body: Record<string, unknown>
): WebhookPayment {
  const sale = (body.sale ?? body) as Record<string, unknown>
  const success = sale.sale_status === 'completed' || sale.buyer_email !== undefined
  return {
    success,
    amount:        typeof sale.sale_price === 'number' ? sale.sale_price / 100 : 0,
    currency:      'ILS',
    reference:     String(sale.sale_more_info ?? sale.sale_more_info_1 ?? ''),
    transactionId: String(sale.sale_payme_id ?? ''),
    rawData:       sale,
  }
}

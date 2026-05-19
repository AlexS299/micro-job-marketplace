import { safeDecrypt } from '@/lib/encrypt'
import { cardcomCreateLink, cardcomParseWebhook } from './cardcom'
import { tranzilaCreateLink, tranzilaParseWebhook } from './tranzila'
import { paymeCreateLink, paymeParseWebhook } from './payme'
import type { CreateLinkParams, CreateLinkResult, WebhookPayment, ProviderConfig } from './types'

export type { PaymentProvider, CreateLinkParams, CreateLinkResult, WebhookPayment, ProviderConfig } from './types'

export async function createPaymentLink(
  provider: string,
  params: CreateLinkParams,
  config: ProviderConfig
): Promise<CreateLinkResult> {
  switch (provider) {
    case 'CARDCOM': {
      const terminal = safeDecrypt(config.cardcomTerminal ?? '')
      const username = safeDecrypt(config.cardcomUsername ?? '')
      if (!terminal || !username) throw new Error('Cardcom credentials not configured')
      return cardcomCreateLink(params, terminal, username)
    }
    case 'TRANZILA': {
      const terminal = safeDecrypt(config.tranzilaTerminal ?? '')
      const apiKey   = config.tranzilaApiKey ? safeDecrypt(config.tranzilaApiKey) : undefined
      if (!terminal) throw new Error('Tranzila credentials not configured')
      return tranzilaCreateLink(params, terminal, apiKey)
    }
    case 'PAYME': {
      const apiKey = safeDecrypt(config.paymeApiKey ?? '')
      if (!apiKey) throw new Error('PayMe credentials not configured')
      return paymeCreateLink(params, apiKey)
    }
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }
}

export function parseWebhook(
  provider: string,
  body: Record<string, string> | Record<string, unknown>
): WebhookPayment {
  switch (provider) {
    case 'CARDCOM':  return cardcomParseWebhook(body as Record<string, string>)
    case 'TRANZILA': return tranzilaParseWebhook(body as Record<string, string>)
    case 'PAYME':    return paymeParseWebhook(body as Record<string, unknown>)
    default:         throw new Error(`Unknown provider: ${provider}`)
  }
}

export const PROVIDER_LABELS: Record<string, string> = {
  CARDCOM:  'קארדקום',
  TRANZILA: 'טרנזילה',
  PAYME:    'פיימי',
}

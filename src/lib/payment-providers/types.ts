export type PaymentProvider = 'CARDCOM' | 'TRANZILA' | 'PAYME'

export interface CreateLinkParams {
  amount: number          // ILS, e.g. 1180.00
  currency: string        // 'ILS'
  invoiceNumber: string
  description: string
  customerName: string
  customerEmail: string
  successUrl: string      // absolute URL
  errorUrl: string        // absolute URL
  notifyUrl: string       // absolute webhook URL
  reference: string       // payment link token — returned in webhook
}

export interface CreateLinkResult {
  providerUrl: string     // URL to redirect customer to
  providerReference?: string  // provider's own transaction reference (if returned immediately)
}

export interface WebhookPayment {
  success: boolean
  amount: number
  currency: string
  reference: string       // our payment link token
  transactionId: string
  rawData: Record<string, unknown>
}

export interface ProviderConfig {
  cardcomTerminal?: string
  cardcomUsername?: string
  tranzilaTerminal?: string
  tranzilaApiKey?: string
  paymeApiKey?: string
}

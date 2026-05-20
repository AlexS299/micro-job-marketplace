import db from '@/lib/db'
import { parseWebhook } from '@/lib/payment-providers'
import { audit } from '@/lib/audit'

export async function handlePaymentWebhook(
  provider: string,
  rawBody: Record<string, string> | Record<string, unknown>
): Promise<{ ok: boolean; message: string }> {
  let payment

  try {
    payment = parseWebhook(provider, rawBody)
  } catch (err) {
    return { ok: false, message: `Parse error: ${String(err)}` }
  }

  if (!payment.reference) {
    return { ok: false, message: 'No reference in webhook' }
  }

  const link = await db.paymentLink.findUnique({
    where: { token: payment.reference },
    include: { invoice: true },
  })

  if (!link) {
    return { ok: false, message: `PaymentLink not found: ${payment.reference}` }
  }

  // Idempotency: already processed
  if (link.status === 'PAID') {
    return { ok: true, message: 'Already processed' }
  }

  // Check expiry before accepting payment
  if (link.expiresAt < new Date()) {
    return { ok: false, message: 'Payment link expired' }
  }

  // Use a transaction to prevent concurrent webhook duplicates
  await db.$transaction(async (tx) => {
    // Re-read inside transaction to catch concurrent updates
    const fresh = await tx.paymentLink.findUnique({ where: { id: link.id }, select: { status: true } })
    if (fresh?.status === 'PAID') return // already handled by concurrent request

    await tx.payment.create({
      data: {
        invoiceId:     link.invoiceId,
        businessId:    link.businessId,
        provider,
        amount:        payment.amount,
        currency:      payment.currency,
        transactionId: payment.transactionId || null,
        status:        payment.success ? 'SUCCESS' : 'FAILED',
        rawData:       JSON.stringify(payment.rawData),
      },
    })

    if (payment.success) {
      const now = new Date()
      await tx.paymentLink.update({
        where: { id: link.id },
        data: { status: 'PAID', paidAt: now, transactionId: payment.transactionId || null },
      })
      await tx.invoice.update({
        where: { id: link.invoiceId },
        data: { status: 'PAID', paidAt: now },
      })
    }
  })

  if (payment.success) {
    await audit(link.businessId, 'system', 'invoice.paid', {
      resourceId:   link.invoiceId,
      resourceType: 'invoice',
      changes: { provider, amount: payment.amount, transactionId: payment.transactionId, invoiceNumber: link.invoice.invoiceNumber },
    })
  }

  return { ok: true, message: payment.success ? 'Payment recorded' : 'Failed payment recorded' }
}

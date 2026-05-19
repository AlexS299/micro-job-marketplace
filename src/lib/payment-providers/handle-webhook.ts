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

  if (link.status === 'PAID') {
    return { ok: true, message: 'Already processed' }
  }

  // Record payment
  await db.payment.create({
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

    // Mark payment link as paid
    await db.paymentLink.update({
      where: { id: link.id },
      data: {
        status:        'PAID',
        paidAt:        now,
        transactionId: payment.transactionId || null,
      },
    })

    // Mark invoice as paid
    await db.invoice.update({
      where: { id: link.invoiceId },
      data: { status: 'PAID', paidAt: now },
    })

    await audit(link.businessId, 'system', 'invoice.paid', {
      resourceId:   link.invoiceId,
      resourceType: 'invoice',
      changes: {
        provider,
        amount:        payment.amount,
        transactionId: payment.transactionId,
        invoiceNumber: link.invoice.invoiceNumber,
      },
    })
  }

  return { ok: true, message: payment.success ? 'Payment recorded' : 'Failed payment recorded' }
}

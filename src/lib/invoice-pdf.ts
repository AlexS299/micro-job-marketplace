import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { formatILS, formatDate } from './vat'
import { INVOICE_TYPE_LABELS } from '@/types'
import type { Invoice, Business, Client, InvoiceItem } from '@/types'

// Colors
const BLUE = rgb(0.114, 0.306, 0.847) // #1d4ed8
const DARK = rgb(0.059, 0.090, 0.161) // #0f172a
const GRAY = rgb(0.392, 0.451, 0.553) // #64748b
const LIGHT_GRAY = rgb(0.949, 0.961, 0.976) // #f1f5f9
const WHITE = rgb(1, 1, 1)
const GREEN = rgb(0.086, 0.647, 0.29) // #16a34a
const RED = rgb(0.863, 0.149, 0.149) // #dc2626

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export async function generateInvoicePDF(
  invoice: Invoice & { items: InvoiceItem[] },
  business: Business,
  client?: Client | null
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Because pdf-lib doesn't natively support RTL Hebrew text rendering
  // (Hebrew chars appear as boxes without a Hebrew font), we use Latin
  // transliteration labels and display the data as-is (numbers/dates work fine).
  // In a production app, embed a Hebrew TTF (e.g. Assistant) via embedFont with
  // a custom font file.

  let y = height - 40

  // ─── Header background ────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: BLUE,
  })

  // Business name (top right in RTL)
  page.drawText(truncate(business.name, 40), {
    x: width - 40 - boldFont.widthOfTextAtSize(truncate(business.name, 40), 18),
    y: height - 50,
    size: 18,
    font: boldFont,
    color: WHITE,
  })

  // Business details row
  const bizDetails = [
    business.email,
    business.phone,
    business.city,
  ].filter(Boolean).join('  |  ')
  if (bizDetails) {
    page.drawText(truncate(bizDetails, 70), {
      x: width - 40 - font.widthOfTextAtSize(truncate(bizDetails, 70), 10),
      y: height - 70,
      size: 10,
      font,
      color: rgb(0.8, 0.87, 1),
    })
  }

  if (business.vatNumber) {
    const vatText = `Osek Mursheh: ${business.vatNumber}`
    page.drawText(vatText, {
      x: width - 40 - font.widthOfTextAtSize(vatText, 9),
      y: height - 85,
      size: 9,
      font,
      color: rgb(0.8, 0.87, 1),
    })
  }

  // Invoice type label (left side of header)
  const typeLabel = INVOICE_TYPE_LABELS[invoice.type as keyof typeof INVOICE_TYPE_LABELS] || invoice.type
  page.drawText('TAX INVOICE', {
    x: 40,
    y: height - 50,
    size: 16,
    font: boldFont,
    color: WHITE,
  })
  page.drawText(`(${typeLabel})`, {
    x: 40,
    y: height - 68,
    size: 10,
    font,
    color: rgb(0.8, 0.87, 1),
  })

  y = height - 140

  // ─── Invoice info boxes ────────────────────────────────────────────────────
  // Left box: invoice number / dates
  page.drawRectangle({ x: 30, y: y - 80, width: 240, height: 85, color: LIGHT_GRAY })
  page.drawText('Invoice Details', { x: 40, y: y - 20, size: 11, font: boldFont, color: DARK })
  page.drawText(`No: ${invoice.invoiceNumber}`, { x: 40, y: y - 38, size: 10, font, color: DARK })
  page.drawText(`Date: ${formatDate(invoice.issueDate)}`, { x: 40, y: y - 52, size: 10, font, color: DARK })
  if (invoice.dueDate) {
    page.drawText(`Due: ${formatDate(invoice.dueDate)}`, { x: 40, y: y - 66, size: 10, font, color: DARK })
  }

  // Status badge
  const statusColors: Record<string, typeof RED> = {
    PAID: GREEN,
    OVERDUE: RED,
    SENT: BLUE,
  }
  const statusColor = statusColors[invoice.status] || GRAY
  const statusLabels: Record<string, string> = {
    DRAFT: 'DRAFT', SENT: 'SENT', PAID: 'PAID', OVERDUE: 'OVERDUE', CANCELLED: 'CANCELLED'
  }
  const statusLabel = statusLabels[invoice.status] || invoice.status
  page.drawRectangle({ x: 40, y: y - 80, width: 70, height: 14, color: statusColor })
  page.drawText(statusLabel, { x: 45, y: y - 76, size: 9, font: boldFont, color: WHITE })

  // Right box: client info
  if (client) {
    page.drawRectangle({ x: 325, y: y - 80, width: 240, height: 85, color: LIGHT_GRAY })
    page.drawText('Bill To', { x: width - 40 - boldFont.widthOfTextAtSize('Bill To', 11), y: y - 20, size: 11, font: boldFont, color: DARK })
    page.drawText(truncate(client.name, 30), { x: width - 40 - font.widthOfTextAtSize(truncate(client.name, 30), 11), y: y - 38, size: 11, font: boldFont, color: DARK })
    if (client.email) {
      page.drawText(truncate(client.email, 35), { x: width - 40 - font.widthOfTextAtSize(truncate(client.email, 35), 9), y: y - 52, size: 9, font, color: GRAY })
    }
    if (client.phone) {
      page.drawText(client.phone, { x: width - 40 - font.widthOfTextAtSize(client.phone, 9), y: y - 64, size: 9, font, color: GRAY })
    }
    if (client.vatNumber) {
      page.drawText(`ID: ${client.vatNumber}`, { x: width - 40 - font.widthOfTextAtSize(`ID: ${client.vatNumber}`, 9), y: y - 76, size: 9, font, color: GRAY })
    }
  }

  y -= 105

  // ─── Items table ───────────────────────────────────────────────────────────
  // Table header
  page.drawRectangle({ x: 30, y: y - 22, width: width - 60, height: 22, color: BLUE })
  const tableHeaders = [
    { label: 'Description', x: 40 },
    { label: 'Qty', x: 330 },
    { label: 'Unit Price', x: 380 },
    { label: 'Total', x: 470 },
  ]
  tableHeaders.forEach(({ label, x }) => {
    page.drawText(label, { x, y: y - 16, size: 9, font: boldFont, color: WHITE })
  })
  y -= 28

  // Items rows
  invoice.items.forEach((item, idx) => {
    if (idx % 2 === 1) {
      page.drawRectangle({ x: 30, y: y - 18, width: width - 60, height: 18, color: rgb(0.976, 0.984, 0.996) })
    }
    page.drawText(truncate(item.description, 42), { x: 40, y: y - 14, size: 9, font, color: DARK })
    page.drawText(String(item.quantity), { x: 340, y: y - 14, size: 9, font, color: DARK })
    page.drawText(formatILS(item.unitPrice), { x: 375, y: y - 14, size: 9, font, color: DARK })
    page.drawText(formatILS(item.total), { x: 468, y: y - 14, size: 9, font, color: DARK })

    // Separator line
    page.drawLine({ start: { x: 30, y: y - 20 }, end: { x: width - 30, y: y - 20 }, thickness: 0.5, color: rgb(0.9, 0.92, 0.95) })
    y -= 22
  })

  y -= 10

  // ─── Totals section ────────────────────────────────────────────────────────
  const totalsX = 360
  const totalsW = width - totalsX - 30

  const drawTotalRow = (label: string, value: string, bold = false, highlight = false) => {
    if (highlight) {
      page.drawRectangle({ x: totalsX - 10, y: y - 18, width: totalsW + 10, height: 20, color: BLUE })
    }
    const f = bold ? boldFont : font
    const c = highlight ? WHITE : DARK
    page.drawText(label, { x: totalsX, y: y - 13, size: highlight ? 11 : 9, font: f, color: c })
    page.drawText(value, { x: width - 30 - boldFont.widthOfTextAtSize(value, highlight ? 11 : 9), y: y - 13, size: highlight ? 11 : 9, font: bold ? boldFont : font, color: c })
    y -= 22
  }

  drawTotalRow('Subtotal (excl. VAT):', formatILS(invoice.subtotal))
  drawTotalRow(`VAT (${Math.round(invoice.vatRate * 100)}%):`, formatILS(invoice.vatAmount))
  y -= 4
  drawTotalRow('TOTAL DUE:', formatILS(invoice.total), true, true)

  // ─── Notes ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    y -= 20
    page.drawText('Notes:', { x: 40, y, size: 10, font: boldFont, color: DARK })
    y -= 16
    page.drawText(truncate(invoice.notes, 80), { x: 40, y, size: 9, font, color: GRAY })
    y -= 10
  }

  // ─── Footer ────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 50, color: LIGHT_GRAY })
  page.drawLine({ start: { x: 0, y: 50 }, end: { x: width, y: 50 }, thickness: 1, color: rgb(0.88, 0.9, 0.94) })
  page.drawText('Generated by AI Business Accounting | Compliant with Israeli VAT Law 1975', {
    x: width / 2 - font.widthOfTextAtSize('Generated by AI Business Accounting | Compliant with Israeli VAT Law 1975', 8) / 2,
    y: 30,
    size: 8,
    font,
    color: GRAY,
  })
  if (business.bankAccount) {
    page.drawText(`Bank: ${business.bankName || ''} | Account: ${business.bankAccount}`, {
      x: width / 2 - font.widthOfTextAtSize(`Bank: ${business.bankName || ''} | Account: ${business.bankAccount}`, 8) / 2,
      y: 14,
      size: 8,
      font,
      color: GRAY,
    })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

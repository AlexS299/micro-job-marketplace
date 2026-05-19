import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { formatILS, formatDate } from './vat'
import { INVOICE_TYPE_LABELS } from '@/types'
import type { Invoice, Business, Client, InvoiceItem } from '@/types'

// Colors
const BLUE       = rgb(0.114, 0.306, 0.847)
const DARK       = rgb(0.059, 0.090, 0.161)
const GRAY       = rgb(0.392, 0.451, 0.553)
const LIGHT_GRAY = rgb(0.949, 0.961, 0.976)
const WHITE      = rgb(1, 1, 1)
const GREEN      = rgb(0.086, 0.647, 0.29)
const RED        = rgb(0.863, 0.149, 0.149)

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

/**
 * Prepares text for LTR rendering in pdf-lib so that Hebrew appears correctly.
 * Splits the string into RTL (Hebrew) and LTR (Latin/digits) segments,
 * reverses the segment order (RTL overall direction), and reverses
 * characters within each Hebrew segment.
 */
function prepareBidiText(text: string): string {
  if (!text) return text
  const hebrewRe = /[֐-׿יִ-ﭏ]/
  if (!hebrewRe.test(text)) return text

  type Seg = { chars: string; rtl: boolean }
  const segments: Seg[] = []
  let buf = ''
  let curRtl = hebrewRe.test(text[0])

  for (const ch of text) {
    const chRtl = hebrewRe.test(ch)
    if (chRtl !== curRtl) {
      segments.push({ chars: buf, rtl: curRtl })
      buf = ''
      curRtl = chRtl
    }
    buf += ch
  }
  if (buf) segments.push({ chars: buf, rtl: curRtl })

  return segments
    .reverse()
    .map(s => s.rtl ? s.chars.split('').reverse().join('') : s.chars)
    .join('')
}

/** Load Hebrew-capable font from public/fonts; fall back to system path. */
function loadFontBytes(filename: string): Buffer | null {
  const candidates = [
    path.resolve(process.cwd(), 'public', 'fonts', filename),
    `/usr/share/fonts/truetype/freefont/${filename}`,
    `/usr/share/fonts/truetype/dejavu/${filename.replace('FreeSans', 'DejaVuSans').replace('FreeSansBold', 'DejaVuSans-Bold')}`,
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p)
  }
  return null
}

export async function generateInvoicePDF(
  invoice: Invoice & { items: InvoiceItem[] },
  business: Business,
  client?: Client | null
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page   = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  // Try to embed a Hebrew-capable TTF font; fall back to Helvetica
  let font: Awaited<ReturnType<typeof pdfDoc.embedFont>>
  let boldFont: Awaited<ReturnType<typeof pdfDoc.embedFont>>

  const regularBytes = loadFontBytes('FreeSans.ttf')
  const boldBytes    = loadFontBytes('FreeSansBold.ttf')

  if (regularBytes && boldBytes) {
    font     = await pdfDoc.embedFont(regularBytes)
    boldFont = await pdfDoc.embedFont(boldBytes)
  } else {
    font     = await pdfDoc.embedFont(StandardFonts.Helvetica)
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  }

  const biz = {
    name:       prepareBidiText(business.name),
    email:      business.email ?? '',
    phone:      business.phone ?? '',
    city:       business.city ?? '',
    vatNumber:  business.vatNumber ?? '',
    bankName:   business.bankName ?? '',
    bankAccount: business.bankAccount ?? '',
  }

  let y = height - 40

  // ─── Header background ────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: BLUE })

  // Business name — right-aligned in header
  const bizNameText = truncate(biz.name, 40)
  page.drawText(bizNameText, {
    x: width - 40 - boldFont.widthOfTextAtSize(bizNameText, 18),
    y: height - 50,
    size: 18,
    font: boldFont,
    color: WHITE,
  })

  // Business details row
  const bizDetails = [biz.email, biz.phone, biz.city].filter(Boolean).join('  |  ')
  if (bizDetails) {
    const det = truncate(bizDetails, 70)
    page.drawText(det, {
      x: width - 40 - font.widthOfTextAtSize(det, 10),
      y: height - 70,
      size: 10,
      font,
      color: rgb(0.8, 0.87, 1),
    })
  }

  if (biz.vatNumber) {
    const vatTxt = prepareBidiText(`עוסק מורשה: ${biz.vatNumber}`)
    page.drawText(vatTxt, {
      x: width - 40 - font.widthOfTextAtSize(vatTxt, 9),
      y: height - 85,
      size: 9,
      font,
      color: rgb(0.8, 0.87, 1),
    })
  }

  // Invoice type label — left side of header
  const typeLabel = prepareBidiText(
    INVOICE_TYPE_LABELS[invoice.type as keyof typeof INVOICE_TYPE_LABELS] || invoice.type
  )
  page.drawText('TAX INVOICE', { x: 40, y: height - 50, size: 16, font: boldFont, color: WHITE })
  page.drawText(`(${typeLabel})`,  { x: 40, y: height - 68, size: 10, font, color: rgb(0.8, 0.87, 1) })

  y = height - 140

  // ─── Invoice info boxes ────────────────────────────────────────────────────
  page.drawRectangle({ x: 30, y: y - 80, width: 240, height: 85, color: LIGHT_GRAY })
  page.drawText(prepareBidiText('פרטי חשבונית'), {
    x: 40, y: y - 20, size: 11, font: boldFont, color: DARK,
  })
  page.drawText(`No: ${invoice.invoiceNumber}`,           { x: 40, y: y - 38, size: 10, font, color: DARK })
  page.drawText(`Date: ${formatDate(invoice.issueDate)}`, { x: 40, y: y - 52, size: 10, font, color: DARK })
  if (invoice.dueDate) {
    page.drawText(`Due: ${formatDate(invoice.dueDate)}`,  { x: 40, y: y - 66, size: 10, font, color: DARK })
  }

  // Status badge
  const statusColors: Record<string, typeof RED> = { PAID: GREEN, OVERDUE: RED, SENT: BLUE }
  const statusColor = statusColors[invoice.status] || GRAY
  const statusLabels: Record<string, string> = {
    DRAFT: 'DRAFT', SENT: 'SENT', PAID: 'PAID', OVERDUE: 'OVERDUE', CANCELLED: 'CANCELLED',
  }
  const statusLabel = statusLabels[invoice.status] || invoice.status
  page.drawRectangle({ x: 40, y: y - 80, width: 70, height: 14, color: statusColor })
  page.drawText(statusLabel, { x: 45, y: y - 76, size: 9, font: boldFont, color: WHITE })

  // Right box: client info
  if (client) {
    const clientName = prepareBidiText(truncate(client.name, 30))
    page.drawRectangle({ x: 325, y: y - 80, width: 240, height: 85, color: LIGHT_GRAY })
    page.drawText(prepareBidiText('חייב לשלם'), {
      x: width - 40 - boldFont.widthOfTextAtSize(prepareBidiText('חייב לשלם'), 11),
      y: y - 20, size: 11, font: boldFont, color: DARK,
    })
    page.drawText(clientName, {
      x: width - 40 - boldFont.widthOfTextAtSize(clientName, 11),
      y: y - 38, size: 11, font: boldFont, color: DARK,
    })
    if (client.email) {
      const em = truncate(client.email, 35)
      page.drawText(em, { x: width - 40 - font.widthOfTextAtSize(em, 9), y: y - 52, size: 9, font, color: GRAY })
    }
    if (client.phone) {
      page.drawText(client.phone, { x: width - 40 - font.widthOfTextAtSize(client.phone, 9), y: y - 64, size: 9, font, color: GRAY })
    }
    if (client.vatNumber) {
      const vt = `ID: ${client.vatNumber}`
      page.drawText(vt, { x: width - 40 - font.widthOfTextAtSize(vt, 9), y: y - 76, size: 9, font, color: GRAY })
    }
  }

  y -= 105

  // ─── Items table ───────────────────────────────────────────────────────────
  page.drawRectangle({ x: 30, y: y - 22, width: width - 60, height: 22, color: BLUE })
  const tableHeaders = [
    { label: prepareBidiText('תיאור'),     x: 40 },
    { label: prepareBidiText("כמות"),      x: 330 },
    { label: prepareBidiText('מחיר יחידה'), x: 368 },
    { label: prepareBidiText("סה\"כ"),    x: 468 },
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
    const desc = prepareBidiText(truncate(item.description, 42))
    page.drawText(desc,                    { x: 40,  y: y - 14, size: 9, font, color: DARK })
    page.drawText(String(item.quantity),   { x: 340, y: y - 14, size: 9, font, color: DARK })
    page.drawText(formatILS(item.unitPrice), { x: 375, y: y - 14, size: 9, font, color: DARK })
    page.drawText(formatILS(item.total),   { x: 468, y: y - 14, size: 9, font, color: DARK })
    page.drawLine({
      start: { x: 30, y: y - 20 }, end: { x: width - 30, y: y - 20 },
      thickness: 0.5, color: rgb(0.9, 0.92, 0.95),
    })
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
    const sz = highlight ? 11 : 9
    const lbl = prepareBidiText(label)
    page.drawText(lbl,   { x: totalsX, y: y - 13, size: sz, font: f, color: c })
    page.drawText(value, { x: width - 30 - (bold ? boldFont : font).widthOfTextAtSize(value, sz), y: y - 13, size: sz, font: f, color: c })
    y -= 22
  }

  drawTotalRow('סכום לפני מע"מ:', formatILS(invoice.subtotal))
  drawTotalRow(`מע"מ (${Math.round(invoice.vatRate * 100)}%):`, formatILS(invoice.vatAmount))
  y -= 4
  drawTotalRow('סה"כ לתשלום:', formatILS(invoice.total), true, true)

  // ─── Notes ─────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    y -= 20
    page.drawText(prepareBidiText('הערות:'), { x: 40, y, size: 10, font: boldFont, color: DARK })
    y -= 16
    page.drawText(prepareBidiText(truncate(invoice.notes, 80)), { x: 40, y, size: 9, font, color: GRAY })
    y -= 10
  }

  // ─── Footer ────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 50, color: LIGHT_GRAY })
  page.drawLine({ start: { x: 0, y: 50 }, end: { x: width, y: 50 }, thickness: 1, color: rgb(0.88, 0.9, 0.94) })
  const footerText = prepareBidiText('הופק על ידי מערכת הנה"ח חכמה | תואם חוק מע"מ תשל"ו-1975')
  page.drawText(footerText, {
    x: width / 2 - font.widthOfTextAtSize(footerText, 8) / 2,
    y: 30, size: 8, font, color: GRAY,
  })
  if (biz.bankAccount) {
    const bankText = `${prepareBidiText('בנק')}: ${biz.bankName} | ${prepareBidiText('חשבון')}: ${biz.bankAccount}`
    page.drawText(bankText, {
      x: width / 2 - font.widthOfTextAtSize(bankText, 8) / 2,
      y: 14, size: 8, font, color: GRAY,
    })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

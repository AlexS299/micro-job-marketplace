import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { parseCommand, twimlResponse, getHelpMessage, ils } from '@/lib/whatsapp'
import { startOfMonth, startOfWeek, startOfDay, startOfYear } from 'date-fns'
import Anthropic from '@anthropic-ai/sdk'

// Twilio sends form-encoded POST; validate signature in production
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || ''
  let from = '', body = '', mediaUrl = '', mediaType = ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    const params = new URLSearchParams(text)
    from      = params.get('From') || ''
    body      = params.get('Body') || ''
    mediaUrl  = params.get('MediaUrl0') || ''
    mediaType = params.get('MediaContentType0') || ''
  } else {
    const json = await req.json().catch(() => ({})) as Record<string, string>
    from      = json.From || json.from || ''
    body      = json.Body || json.body || ''
    mediaUrl  = json.MediaUrl0 || ''
    mediaType = json.MediaContentType0 || ''
  }

  // Normalize phone: whatsapp:+972501234567 → +972501234567
  const phone = from.replace(/^whatsapp:/, '')
  if (!phone) return xml(twimlResponse('שגיאה: לא ניתן לזהות מספר טלפון'))

  // Find business by registered WhatsApp phone
  const business = await db.business.findFirst({ where: { whatsappPhone: phone } })
  if (!business) {
    return xml(twimlResponse(
      'מספר זה אינו מחובר לחשבון. אנא הוסף את המספר בהגדרות האפליקציה.'
    ))
  }

  // Upsert session
  await db.whatsAppSession.upsert({
    where: { businessId_phone: { businessId: business.id, phone } },
    update: { lastMessage: new Date() },
    create: { businessId: business.id, phone },
  })

  // Handle image/receipt
  if (mediaUrl && mediaType.startsWith('image/')) {
    const reply = await handleReceiptImage(business.id, mediaUrl)
    return xml(twimlResponse(reply))
  }

  const cmd = parseCommand(body)
  const reply = await handleCommand(cmd, business)
  return xml(twimlResponse(reply))
}

// ─── Command Handlers ──────────────────────────────────────────────────────────

async function handleCommand(
  cmd: ReturnType<typeof parseCommand>,
  business: { id: string; name: string }
): Promise<string> {
  switch (cmd.type) {
    case 'help':         return getHelpMessage(business.name)
    case 'balance':      return handleBalance(business.id)
    case 'revenue':      return handleRevenue(business.id, cmd.period)
    case 'expenses':     return handleExpenses(business.id, cmd.period)
    case 'invoices':     return handleInvoices(business.id, cmd.filter)
    case 'send_invoice': return handleSendInvoice(business.id, cmd.invoiceNumber)
    case 'alerts':       return handleAlerts(business.id)
    case 'vat':          return handleVAT(business.id)
    case 'report':       return handleReport(business.id, business.name)
    case 'payroll':      return handlePayroll(business.id)
    case 'ai':           return handleAI(cmd.message, business.name)
    default:             return 'לא הבנתי את הפקודה. שלח *עזרה* לרשימת הפקודות.'
  }
}

async function handleBalance(businessId: string): Promise<string> {
  const accounts = await db.bankAccount.findMany({ where: { businessId } })
  if (!accounts.length) return '⚠️ אין חשבונות בנק מחוברים.\nחבר חשבון בנק דרך האפליקציה.'

  const lines = accounts.map(a =>
    `🏦 ${a.bankName} (${a.accountNumber}): *${ils(a.balance)}*`
  )
  const total = accounts.reduce((s, a) => s + a.balance, 0)
  if (accounts.length > 1) lines.push(`\n💰 *סה"כ: ${ils(total)}*`)
  return `*יתרת חשבון בנק*\n\n${lines.join('\n')}`
}

async function handleRevenue(businessId: string, period?: string): Promise<string> {
  const { from, label } = periodRange(period)
  const invoices = await db.invoice.findMany({
    where: { businessId, status: 'PAID', paidAt: { gte: from } },
    select: { total: true },
  })
  const total = invoices.reduce((s, i) => s + i.total, 0)
  const count = invoices.length
  return `📈 *הכנסות ${label}*\n\nסה"כ: *${ils(total)}*\nחשבוניות שולמו: ${count}\nממוצע לחשבונית: ${count ? ils(total / count) : '—'}`
}

async function handleExpenses(businessId: string, period?: string): Promise<string> {
  const { from, label } = periodRange(period)
  const expenses = await db.expense.findMany({
    where: { businessId, date: { gte: from }, status: { not: 'CANCELLED' } },
    select: { total: true, category: true },
  })
  const total = expenses.reduce((s, e) => s + e.total, 0)
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.total
  }
  const top = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 3)
  const lines = top.map(([cat, amt]) => `  • ${categoryLabel(cat)}: ${ils(amt)}`)
  return `📉 *הוצאות ${label}*\n\nסה"כ: *${ils(total)}*\nמסמכים: ${expenses.length}\n\n*קטגוריות מובילות:*\n${lines.join('\n') || '  (אין נתונים)'}`
}

async function handleInvoices(businessId: string, filter?: string): Promise<string> {
  const now = new Date()
  type InvoiceWhere = {
    businessId: string
    status?: { in: string[] }
    dueDate?: { lt: Date }
  }
  const where: InvoiceWhere = { businessId }
  let title = 'כל החשבוניות'

  if (filter === 'open') {
    where.status = { in: ['SENT', 'DRAFT'] }
    title = 'חשבוניות פתוחות'
  } else if (filter === 'overdue') {
    where.status = { in: ['SENT', 'DRAFT'] }
    where.dueDate = { lt: now }
    title = 'חשבוניות באיחור'
  }

  const invoices = await db.invoice.findMany({
    where,
    orderBy: { issueDate: 'desc' },
    take: 8,
    include: { client: { select: { name: true } } },
  })

  if (!invoices.length) return `✅ אין חשבוניות ב: ${title}`

  const lines = invoices.map(i => {
    const overdue = i.dueDate && i.dueDate < now && i.status !== 'PAID' ? ' ⚠️' : ''
    return `• *${i.invoiceNumber}* — ${i.client?.name || 'ללא לקוח'} — ${ils(i.total)}${overdue}`
  })
  return `📋 *${title}* (${invoices.length})\n\n${lines.join('\n')}`
}

async function handleSendInvoice(businessId: string, invoiceNumber: string): Promise<string> {
  const invoice = await db.invoice.findFirst({
    where: { businessId, invoiceNumber },
    include: { client: { select: { name: true } } },
  })
  if (!invoice) return `⚠️ לא נמצאה חשבונית מספר ${invoiceNumber}`
  if (!invoice.pdfUrl) return `⚠️ אין PDF לחשבונית ${invoiceNumber}. צור את ה-PDF דרך האפליקציה.`
  return `📤 *חשבונית ${invoiceNumber}*\nלקוח: ${invoice.client?.name}\nסכום: ${ils(invoice.total)}\nסטטוס: ${statusLabel(invoice.status)}\n\nה-PDF: ${invoice.pdfUrl}`
}

async function handleAlerts(businessId: string): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/alerts?businessId=${businessId}`)
  if (!res.ok) return '⚠️ לא ניתן לטעון התראות כרגע'
  const data = await res.json() as { alerts?: { severity: string; title: string }[] }
  const alerts = data.alerts || []
  if (!alerts.length) return '✅ *אין התראות פעילות*\nהעסק שלך בסדר!'

  const icons: Record<string, string> = { critical: '🔴', warning: '🟡', info: '🔵' }
  const lines = alerts.slice(0, 5).map(a => `${icons[a.severity] ?? '⚪'} ${a.title}`)
  return `⚠️ *התראות פעילות* (${alerts.length})\n\n${lines.join('\n')}`
}

async function handleVAT(businessId: string): Promise<string> {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const [invoices, expenses] = await Promise.all([
    db.invoice.findMany({
      where: { businessId, status: 'PAID', paidAt: { gte: monthStart } },
      select: { vatAmount: true },
    }),
    db.expense.findMany({
      where: { businessId, date: { gte: monthStart }, vatDeductible: true },
      select: { vatAmount: true, vatDeductiblePercent: true },
    }),
  ])

  const outputVAT = invoices.reduce((s, i) => s + i.vatAmount, 0)
  const inputVAT  = expenses.reduce((s, e) => s + e.vatAmount * (e.vatDeductiblePercent / 100), 0)
  const vatOwed   = Math.max(0, outputVAT - inputVAT)

  return `🏛 *סיכום מע"מ — ${now.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}*\n\nמע"מ עסקאות (output): *${ils(outputVAT)}*\nמע"מ תשומות (input): *${ils(inputVAT)}*\n\nלתשלום: *${ils(vatOwed)}*`
}

async function handleReport(businessId: string, businessName: string): Promise<string> {
  const now = new Date()
  const from = startOfMonth(now)

  const [invoices, expenses, openCount] = await Promise.all([
    db.invoice.findMany({ where: { businessId, status: 'PAID', paidAt: { gte: from } }, select: { total: true } }),
    db.expense.findMany({ where: { businessId, date: { gte: from } }, select: { total: true } }),
    db.invoice.count({ where: { businessId, status: { in: ['SENT', 'DRAFT'] } } }),
  ])

  const revenue  = invoices.reduce((s, i) => s + i.total, 0)
  const expTotal = expenses.reduce((s, e) => s + e.total, 0)
  const profit   = revenue - expTotal
  const month    = now.toLocaleDateString('he-IL', { month: 'long' })

  return `📊 *דוח חודשי — ${month}*\n${businessName}\n\n📈 הכנסות: *${ils(revenue)}*\n📉 הוצאות: *${ils(expTotal)}*\n💰 רווח גולמי: *${ils(profit)}*\n\n📋 חשבוניות פתוחות: ${openCount}\n\nלדוח מלא — כנס לאפליקציה`
}

async function handlePayroll(businessId: string): Promise<string> {
  const latestRun = await db.payrollRun.findFirst({
    where: { businessId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: { _count: { select: { employees: true } } },
  })
  if (!latestRun) return '⚠️ לא נמצא ריצת שכר. צור שכר דרך האפליקציה.'

  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  return `💼 *שכר — ${months[latestRun.month - 1]} ${latestRun.year}*\n\nעובדים: ${latestRun._count.employees}\nברוטו סה"כ: *${ils(latestRun.totalGross)}*\nנטו סה"כ: *${ils(latestRun.totalNet)}*\nעלות מעסיק: *${ils(latestRun.totalEmployerCost)}*`
}

async function handleAI(message: string, businessName: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    let reply = ''
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `אתה יועץ עסקי ישראלי של ${businessName}. ענה בעברית, קצר וברור לוואטסאפ (עד 300 תווים אם אפשר).`,
      messages: [{ role: 'user', content: message }],
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        reply += event.delta.text
      }
    }
    return reply.slice(0, 1500)
  } catch {
    return '⚠️ לא ניתן לענות כרגע. נסה שוב בקצת.'
  }
}

async function handleReceiptImage(businessId: string, imageUrl: string): Promise<string> {
  try {
    const imgRes = await fetch(imageUrl)
    const imgBuffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(imgBuffer).toString('base64')
    const mimeType = (imgRes.headers.get('content-type') || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'אתה מנתח קבלות בעברית. חלץ: שם ספק, תאריך, סכום, מע"מ, קטגוריה (ציוד משרדי/אוכל/נסיעות/תוכנה/שכ"ד/אחר). פלט JSON בלבד: {"vendor":"","date":"","subtotal":0,"vat":0,"total":0,"category":""}',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
          { type: 'text', text: 'חלץ פרטי קבלה' },
        ],
      }],
    })

    const rawText = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]+\}/)
    if (!jsonMatch) return '⚠️ לא הצלחתי לזהות קבלה בתמונה'

    const receipt = JSON.parse(jsonMatch[0]) as {
      vendor?: string; date?: string; subtotal?: number; vat?: number; total?: number; category?: string
    }

    await db.expense.create({
      data: {
        businessId,
        vendor: receipt.vendor || 'לא ידוע',
        date: receipt.date ? new Date(receipt.date) : new Date(),
        subtotal: receipt.subtotal || 0,
        vatAmount: receipt.vat || 0,
        total: receipt.total || 0,
        category: mapCategory(receipt.category || ''),
        vatDeductible: true,
        status: 'PENDING',
        rawExtraction: rawText,
      },
    })

    return `✅ *קבלה זוהתה ונשמרה*\n\nספק: ${receipt.vendor}\nסכום: ${ils(receipt.total ?? 0)}\nמע"מ: ${ils(receipt.vat ?? 0)}\nקטגוריה: ${receipt.category}\n\nההוצאה נוספה בהמתנה לאישור.`
  } catch (err) {
    console.error('Receipt OCR error:', err)
    return '⚠️ לא הצלחתי לעבד את הקבלה. נסה שוב עם תמונה ברורה יותר.'
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function periodRange(period?: string): { from: Date; label: string } {
  const now = new Date()
  switch (period) {
    case 'today': return { from: startOfDay(now), label: 'היום' }
    case 'week':  return { from: startOfWeek(now, { weekStartsOn: 0 }), label: 'השבוע' }
    case 'year':  return { from: startOfYear(now), label: 'השנה' }
    default:      return { from: startOfMonth(now), label: 'החודש' }
  }
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    OFFICE: 'ציוד משרדי', FOOD: 'אוכל', TRAVEL: 'נסיעות',
    SOFTWARE: 'תוכנה', RENT: 'שכ"ד', SALARY: 'שכר',
    MARKETING: 'שיווק', PROFESSIONAL: 'שירותים מקצועיים', OTHER: 'אחר',
  }
  return map[cat] || cat
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    DRAFT: 'טיוטה', SENT: 'נשלחה', PAID: 'שולמה', CANCELLED: 'בוטלה',
  }
  return map[s] || s
}

function mapCategory(cat: string): string {
  const lower = cat.toLowerCase()
  if (lower.includes('משרד') || lower.includes('office')) return 'OFFICE'
  if (lower.includes('אוכל') || lower.includes('food')) return 'FOOD'
  if (lower.includes('נסיע') || lower.includes('travel')) return 'TRAVEL'
  if (lower.includes('תוכנה') || lower.includes('software')) return 'SOFTWARE'
  if (lower.includes('שכ"ד') || lower.includes('rent')) return 'RENT'
  if (lower.includes('שיווק') || lower.includes('market')) return 'MARKETING'
  return 'OTHER'
}

function xml(body: string): NextResponse {
  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

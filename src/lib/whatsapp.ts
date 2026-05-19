// WhatsApp Business Bot — Twilio API Integration
// Commands: Hebrew natural language + structured shortcuts

import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken  = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

export const SANDBOX_MODE = process.env.TWILIO_ACCOUNT_SID === undefined

export function getTwilioClient() {
  if (SANDBOX_MODE) return null
  if (!accountSid || !authToken) return null
  return twilio(accountSid, authToken)
}

export async function sendWhatsAppMessage(to: string, body: string, mediaUrl?: string): Promise<boolean> {
  const client = getTwilioClient()
  if (!client) {
    console.log(`[WhatsApp SANDBOX] → ${to}: ${body}`)
    return true
  }

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  await client.messages.create({
    from: fromNumber,
    to: toFormatted,
    body,
    ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
  })
  return true
}

export async function sendWhatsAppTemplate(to: string, contentSid: string, variables: Record<string, string>): Promise<boolean> {
  const client = getTwilioClient()
  if (!client) {
    console.log(`[WhatsApp SANDBOX] template ${contentSid} → ${to}`)
    return true
  }

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  await client.messages.create({
    from: fromNumber,
    to: toFormatted,
    contentSid,
    contentVariables: JSON.stringify(variables),
  })
  return true
}

// ─── Command Parser ────────────────────────────────────────────────────────────

export type BotCommand =
  | { type: 'help' }
  | { type: 'balance' }
  | { type: 'revenue'; period?: 'today' | 'week' | 'month' | 'year' }
  | { type: 'expenses'; period?: 'today' | 'week' | 'month' | 'year' }
  | { type: 'invoices'; filter?: 'open' | 'overdue' | 'paid' }
  | { type: 'send_invoice'; invoiceNumber: string }
  | { type: 'alerts' }
  | { type: 'vat' }
  | { type: 'report' }
  | { type: 'payroll' }
  | { type: 'ai'; message: string }

export function parseCommand(text: string): BotCommand {
  const t = text.trim().toLowerCase()

  if (/^(שלום|היי|הי|בוקר טוב|ערב טוב|hi|hello|hey)/.test(t)) return { type: 'help' }
  if (/^(עזרה|help|פקודות|מה אפשר)/.test(t)) return { type: 'help' }

  if (/^(יתרה|יתרת חשבון|balance)/.test(t)) return { type: 'balance' }

  if (/^(הכנסות?\s*(היום|today))/.test(t)) return { type: 'revenue', period: 'today' }
  if (/^(הכנסות?\s*(שבוע|week))/.test(t)) return { type: 'revenue', period: 'week' }
  if (/^(הכנסות?\s*(שנה|year))/.test(t)) return { type: 'revenue', period: 'year' }
  if (/^(הכנסות?|revenue|income)/.test(t)) return { type: 'revenue', period: 'month' }

  if (/^(הוצאות?\s*(היום|today))/.test(t)) return { type: 'expenses', period: 'today' }
  if (/^(הוצאות?\s*(שבוע|week))/.test(t)) return { type: 'expenses', period: 'week' }
  if (/^(הוצאות?\s*(שנה|year))/.test(t)) return { type: 'expenses', period: 'year' }
  if (/^(הוצאות?|expenses)/.test(t)) return { type: 'expenses', period: 'month' }

  if (/^(חשבוניות? (פתוחות?|לא שולמו|ממתינות))/.test(t)) return { type: 'invoices', filter: 'open' }
  if (/^(חשבוניות? (באיחור|מאוחרות?|overdue))/.test(t)) return { type: 'invoices', filter: 'overdue' }
  if (/^(חשבוניות?|invoices)/.test(t)) return { type: 'invoices' }

  const sendMatch = text.match(/^שלח חשבונית\s+([^\s]+)/i) || text.match(/^send invoice\s+([^\s]+)/i)
  if (sendMatch) return { type: 'send_invoice', invoiceNumber: sendMatch[1] }

  if (/^(התראות?|alerts?)/.test(t)) return { type: 'alerts' }
  if (/^(מע"מ|מעמ|vat)/.test(t)) return { type: 'vat' }
  if (/^(דוח|דו"ח|report|סיכום)/.test(t)) return { type: 'report' }
  if (/^(שכר|משכורת|payroll)/.test(t)) return { type: 'payroll' }

  return { type: 'ai', message: text }
}

// ─── TwiML Response Builder ────────────────────────────────────────────────────

export function twimlResponse(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
}

// ─── Help Message ──────────────────────────────────────────────────────────────

export function getHelpMessage(businessName: string): string {
  return `שלום מ-${businessName}! 👋

*פקודות זמינות:*

💰 *יתרה* — יתרת חשבון בנק
📈 *הכנסות* — הכנסות החודש
📉 *הוצאות* — הוצאות החודש
📄 *חשבוניות* — כל החשבוניות
📋 *חשבוניות פתוחות* — לא שולמו
⚠️ *התראות* — התראות פעילות
🏛 *מע"מ* — סיכום תקופת מע"מ
📊 *דוח* — דוח חודשי מלא
💼 *שכר* — סיכום שכר החודש

📤 *שלח חשבונית [מספר]* — שלח PDF

🤖 כל שאלה חשבונאית — פשוט שאל!`
}

// ─── Number Formatting ─────────────────────────────────────────────────────────

export function ils(n: number): string {
  return `₪${Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

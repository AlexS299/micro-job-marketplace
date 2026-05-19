import nodemailer from 'nodemailer'
import { formatILS, formatDate } from './vat'

interface EmailBusiness {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
}

interface EmailClient {
  name: string
  email?: string | null
}

interface EmailInvoice {
  invoiceNumber: string
  total: number
  subtotal: number
  vatAmount: number
  issueDate: Date | string
  dueDate?: Date | string | null
  notes?: string | null
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendInvoiceEmail(
  invoice: EmailInvoice,
  business: EmailBusiness,
  client: EmailClient,
  pdfBuffer?: Buffer
): Promise<void> {
  const transporter = createTransporter()

  const subject = `חשבונית מס ${invoice.invoiceNumber} מאת ${business.name}`

  const htmlBody = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #1d4ed8; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 24px; }
    .invoice-details { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { color: #64748b; font-size: 14px; }
    .value { font-weight: 600; }
    .total-row { border-top: 2px solid #1d4ed8; margin-top: 12px; padding-top: 12px; }
    .total-row .value { color: #1d4ed8; font-size: 18px; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
    .btn { display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${business.name}</h1>
      <p style="margin: 4px 0; opacity: 0.9;">חשבונית מס ${invoice.invoiceNumber}</p>
    </div>
    <div class="content">
      <p>שלום ${client.name},</p>
      <p>מצורפת חשבונית מס עבור השירותים שניתנו.</p>

      <div class="invoice-details">
        <div class="row">
          <span class="label">מספר חשבונית:</span>
          <span class="value">${invoice.invoiceNumber}</span>
        </div>
        <div class="row">
          <span class="label">תאריך הנפקה:</span>
          <span class="value">${formatDate(invoice.issueDate)}</span>
        </div>
        ${invoice.dueDate ? `
        <div class="row">
          <span class="label">תאריך פירעון:</span>
          <span class="value">${formatDate(invoice.dueDate)}</span>
        </div>
        ` : ''}
        <div class="row">
          <span class="label">סכום לפני מע"מ:</span>
          <span class="value">${formatILS(invoice.subtotal)}</span>
        </div>
        <div class="row">
          <span class="label">מע"מ (18%):</span>
          <span class="value">${formatILS(invoice.vatAmount)}</span>
        </div>
        <div class="row total-row">
          <span class="label" style="font-weight: 700;">סה"כ לתשלום:</span>
          <span class="value">${formatILS(invoice.total)}</span>
        </div>
      </div>

      ${invoice.notes ? `<p style="color: #64748b; font-size: 14px;"><strong>הערות:</strong> ${invoice.notes}</p>` : ''}

      <p>לתשלום ניתן לפנות אלינו:</p>
      ${business.phone ? `<p>טלפון: ${business.phone}</p>` : ''}
      ${business.email ? `<p>אימייל: ${business.email}</p>` : ''}
    </div>
    <div class="footer">
      <p>${business.name} | ${business.address || ''}</p>
      <p>חשבונית זו הופקה בהתאם לחוק מע"מ תשל"ו-1975</p>
    </div>
  </div>
</body>
</html>
  `

  const attachments = []
  if (pdfBuffer) {
    attachments.push({
      filename: `${invoice.invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    })
  }

  await transporter.sendMail({
    from: `"${business.name}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: client.email || '',
    subject,
    html: htmlBody,
    attachments,
  })
}

export async function sendReminderEmail(
  invoice: EmailInvoice,
  business: EmailBusiness,
  client: EmailClient
): Promise<void> {
  const transporter = createTransporter()
  const subject = `תזכורת תשלום — חשבונית ${invoice.invoiceNumber} מאת ${business.name}`

  const htmlBody = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #dc2626; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { padding: 24px; }
    .invoice-details { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { color: #64748b; font-size: 14px; }
    .value { font-weight: 600; }
    .total-row { border-top: 2px solid #dc2626; margin-top: 12px; padding-top: 12px; }
    .total-row .value { color: #dc2626; font-size: 18px; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>תזכורת תשלום</h1>
      <p style="margin: 4px 0; opacity: 0.9;">חשבונית ${invoice.invoiceNumber} — בפיגור תשלום</p>
    </div>
    <div class="content">
      <p>שלום ${client.name},</p>
      <p>ברצוננו להזכיר כי החשבונית הבאה טרם שולמה ועברה את תאריך הפירעון:</p>

      <div class="invoice-details">
        <div class="row">
          <span class="label">מספר חשבונית:</span>
          <span class="value">${invoice.invoiceNumber}</span>
        </div>
        ${invoice.dueDate ? `
        <div class="row">
          <span class="label">תאריך פירעון שחלף:</span>
          <span class="value" style="color: #dc2626;">${formatDate(invoice.dueDate)}</span>
        </div>
        ` : ''}
        <div class="row">
          <span class="label">סכום לפני מע"מ:</span>
          <span class="value">${formatILS(invoice.subtotal)}</span>
        </div>
        <div class="row">
          <span class="label">מע"מ (18%):</span>
          <span class="value">${formatILS(invoice.vatAmount)}</span>
        </div>
        <div class="row total-row">
          <span class="label" style="font-weight: 700;">סה"כ לתשלום:</span>
          <span class="value">${formatILS(invoice.total)}</span>
        </div>
      </div>

      <p>אנא בצע את התשלום בהקדם האפשרי.</p>
      <p>לפרטים נוספים, ניתן לפנות אלינו:</p>
      ${business.phone ? `<p>טלפון: ${business.phone}</p>` : ''}
      ${business.email ? `<p>אימייל: ${business.email}</p>` : ''}
    </div>
    <div class="footer">
      <p>${business.name} | ${business.address || ''}</p>
      <p>חשבונית זו הופקה בהתאם לחוק מע"מ תשל"ו-1975</p>
    </div>
  </div>
</body>
</html>
  `

  await transporter.sendMail({
    from: `"${business.name}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: client.email || '',
    subject,
    html: htmlBody,
  })
}

export async function sendInvitationEmail(params: {
  toEmail: string
  businessName: string
  inviterName: string
  role: string
  inviteUrl: string
  expiresInDays: number
}) {
  const transporter = createTransporter()
  const roleHeb: Record<string, string> = {
    ADMIN: 'מנהל', EDITOR: 'עורך', VIEWER: 'צופה (רואה חשבון)',
  }
  const subject = `הוזמנת להצטרף ל-${params.businessName}`
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /><style>
  body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 12px; padding: 32px; max-width: 480px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .badge { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
  .btn { display: block; background: #1d4ed8; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 24px 0; }
  .footer { font-size: 12px; color: #94a3b8; margin-top: 20px; }
</style></head>
<body>
<div class="card">
  <h2 style="margin-top:0;">הוזמנת ל-${params.businessName} 👋</h2>
  <p>${params.inviterName} הזמין אותך להצטרף כ:</p>
  <span class="badge">${roleHeb[params.role] ?? params.role}</span>
  <a href="${params.inviteUrl}" class="btn">קבל הזמנה ✓</a>
  <p style="font-size:13px;color:#64748b;">ההזמנה תקפה ל-${params.expiresInDays} ימים.</p>
  <div class="footer">אם לא ציפית לאימייל זה, ניתן להתעלם ממנו.</div>
</div>
</body></html>`

  await transporter.sendMail({
    from: `"${params.businessName}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: params.toEmail,
    subject,
    html,
  })
}

export async function sendPasswordResetEmail(params: {
  toEmail: string
  resetUrl: string
}) {
  const transporter = createTransporter()
  const subject = 'איפוס סיסמה — מערכת הנה"ח'
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /><style>
  body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 12px; padding: 32px; max-width: 480px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .btn { display: block; background: #1d4ed8; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 24px 0; }
  .note { font-size: 12px; color: #94a3b8; margin-top: 20px; }
</style></head>
<body>
<div class="card">
  <h2 style="margin-top:0;">איפוס סיסמה</h2>
  <p>קיבלנו בקשה לאיפוס הסיסמה שלך. לחץ על הכפתור למטה תוך שעה:</p>
  <a href="${params.resetUrl}" class="btn">איפוס סיסמה</a>
  <p class="note">אם לא ביקשת לאפס סיסמה — התעלם מאימייל זה. הסיסמה לא תשתנה.</p>
  <p class="note">הקישור תקף לשעה אחת.</p>
</div>
</body></html>`

  await transporter.sendMail({
    from: `"מערכת הנה"ח" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: params.toEmail,
    subject,
    html,
  })
}

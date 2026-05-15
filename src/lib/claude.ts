import Anthropic from '@anthropic-ai/sdk'
import db from './db'
import { calculateVAT, VAT_RATE, generateInvoiceNumber } from './vat'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `אתה עוזר חשבונאי מקצועי לעסקים ישראליים. שמך הוא "רואה", ואתה מתמחה בחוק המס הישראלי, מע"מ, חשבוניות, ודיווחים פיננסיים.

## הכרת החוק הישראלי
- **מע"מ**: שיעור מע"מ נוכחי הוא 18% (החל מינואר 2025)
- **עוסק מורשה**: חייב בתשלום מע"מ ובהגשת דוחות דו-חודשיים (עד 15 לחודש שאחרי תקופת הדיווח)
- **עוסק פטור**: פטור ממע"מ אם מחזור עסקי שנתי נמוך מ-120,000 ₪ (2025)
- **חברה בע"מ**: חייבת בדוח שנתי למס הכנסה, מקדמות חודשיות, ניכוי במקור
- **חשבונית מס**: חובה להנפיק לכל עסקה בסכום מעל 25 ₪
- **קבלה**: ניתנת עבור תשלום שהתקבל
- **חשבונית מס/קבלה**: משמשת גם כחשבונית מס וגם כקבלה

## סוגי מסמכים
- TAX_INVOICE = חשבונית מס
- RECEIPT = קבלה
- COMBINED = חשבונית מס/קבלה
- CREDIT_NOTE = זיכוי

## מועדי הגשה חשובים
- דוח מע"מ דו-חודשי: עד ה-15 לחודש שלאחר תקופת הדיווח
- דוח שנתי (שכיר): 30 באפריל
- דוח שנתי (עצמאי): 31 במאי
- מקדמות מס הכנסה: עד ה-15 לכל חודש

## הוראות התנהגות
1. ענה תמיד בעברית, בטון מקצועי אך חברותי
2. כשאתה יוצר חשבונית או מבצע פעולה, הסבר מה עשית
3. תמיד ציין סכומים בשקלים (₪)
4. כשיש שאלות מיסוי מורכבות, המלץ להתייעץ עם רואה חשבון מוסמך
5. בדוק תאריכי פירעון ועדכן על חשבוניות שפג תוקפן
6. השתמש בכלים כדי לבצע פעולות אמיתיות במסד הנתונים`

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_invoice',
    description: 'יצירת חשבונית מס חדשה במערכת',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: { type: 'string', description: 'מזהה לקוח קיים (אופציונלי)' },
        clientName: { type: 'string', description: 'שם לקוח חדש אם clientId לא סופק' },
        type: {
          type: 'string',
          enum: ['TAX_INVOICE', 'RECEIPT', 'COMBINED', 'CREDIT_NOTE'],
          description: 'סוג המסמך',
        },
        dueDate: { type: 'string', description: 'תאריך פירעון (ISO 8601)' },
        notes: { type: 'string', description: 'הערות לחשבונית' },
        items: {
          type: 'array',
          description: 'פריטי החשבונית',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'תיאור הפריט' },
              quantity: { type: 'number', description: 'כמות' },
              unitPrice: { type: 'number', description: 'מחיר ליחידה (ללא מע"מ)' },
              vatIncluded: { type: 'boolean', description: 'האם המחיר כולל מע"מ' },
            },
            required: ['description', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'get_invoice',
    description: 'קבלת פרטי חשבונית לפי מזהה או מספר חשבונית',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'מזהה החשבונית' },
        invoiceNumber: { type: 'string', description: 'מספר החשבונית (לדוגמה: INV-2025-001)' },
      },
    },
  },
  {
    name: 'list_invoices',
    description: 'רשימת חשבוניות עם סינון',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
          description: 'סנן לפי סטטוס',
        },
        clientId: { type: 'string', description: 'סנן לפי לקוח' },
        dateFrom: { type: 'string', description: 'מתאריך (ISO 8601)' },
        dateTo: { type: 'string', description: 'עד תאריך (ISO 8601)' },
        limit: { type: 'number', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 10)' },
      },
    },
  },
  {
    name: 'update_invoice_status',
    description: 'עדכון סטטוס חשבונית',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string', description: 'מזהה החשבונית' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
          description: 'הסטטוס החדש',
        },
      },
      required: ['invoiceId', 'status'],
    },
  },
  {
    name: 'create_client',
    description: 'הוספת לקוח חדש',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'שם הלקוח' },
        email: { type: 'string', description: 'כתובת אימייל' },
        phone: { type: 'string', description: 'מספר טלפון' },
        vatNumber: { type: 'string', description: 'מספר עוסק / ח.פ' },
        address: { type: 'string', description: 'כתובת' },
        city: { type: 'string', description: 'עיר' },
        notes: { type: 'string', description: 'הערות' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_clients',
    description: 'רשימת לקוחות עם חיפוש',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'חיפוש לפי שם, אימייל, או מספר עוסק' },
      },
    },
  },
  {
    name: 'get_financial_summary',
    description: 'קבלת סיכום פיננסי לפי תקופה',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['month', 'quarter', 'year'],
          description: 'תקופת הדיווח',
        },
      },
    },
  },
  {
    name: 'calculate_vat_report',
    description: 'חישוב דוח מע"מ לתקופה',
    input_schema: {
      type: 'object' as const,
      properties: {
        periodStart: { type: 'string', description: 'תחילת תקופה (ISO 8601)' },
        periodEnd: { type: 'string', description: 'סוף תקופה (ISO 8601)' },
      },
      required: ['periodStart', 'periodEnd'],
    },
  },
  {
    name: 'list_bank_transactions',
    description: 'רשימת תנועות בנקאיות',
    input_schema: {
      type: 'object' as const,
      properties: {
        dateFrom: { type: 'string', description: 'מתאריך (ISO 8601)' },
        dateTo: { type: 'string', description: 'עד תאריך (ISO 8601)' },
        category: {
          type: 'string',
          description: 'קטגוריה: INCOME, EXPENSE, VAT, SALARY, TAX, TRANSFER, OTHER',
        },
        limit: { type: 'number', description: 'מספר תוצאות מקסימלי (ברירת מחדל: 20)' },
      },
    },
  },
  {
    name: 'get_tax_advice',
    description: 'קבלת ייעוץ מס ישראלי (מידע כללי בלבד)',
    input_schema: {
      type: 'object' as const,
      properties: {
        question: { type: 'string', description: 'שאלת המס' },
        context: { type: 'string', description: 'הקשר נוסף (אופציונלי)' },
      },
      required: ['question'],
    },
  },
  {
    name: 'list_expenses',
    description: 'רשימת הוצאות שנסרקו, עם סיכום מע"מ תשומות לניכוי',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          description: 'סנן לפי קטגוריה: OFFICE, TRAVEL, MEALS, PROFESSIONAL, MARKETING, RENT, UTILITIES, INSURANCE, SALARY, SOFTWARE, OTHER',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'APPROVED', 'REJECTED'],
          description: 'סנן לפי סטטוס',
        },
        dateFrom: { type: 'string', description: 'מתאריך (ISO 8601)' },
        dateTo: { type: 'string', description: 'עד תאריך (ISO 8601)' },
      },
    },
  },
]

// ─── Tool Executors ────────────────────────────────────────────────────────────

async function getOrCreateBusiness() {
  let business = await db.business.findFirst()
  if (!business) {
    business = await db.business.create({
      data: {
        name: 'העסק שלי',
        taxType: 'OSEK_MURSHEH',
        vatReportPeriod: 'BIMONTHLY',
      },
    })
  }
  return business
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTool(toolName: string, toolInput: Record<string, any>): Promise<string> {
  try {
    switch (toolName) {
      case 'create_invoice': {
        const business = await getOrCreateBusiness()

        // Resolve client
        let clientId = toolInput.clientId as string | undefined
        if (!clientId && toolInput.clientName) {
          const existing = await db.client.findFirst({
            where: { businessId: business.id, name: { contains: toolInput.clientName } },
          })
          if (existing) {
            clientId = existing.id
          } else {
            const newClient = await db.client.create({
              data: { businessId: business.id, name: toolInput.clientName },
            })
            clientId = newClient.id
          }
        }

        // Calculate totals
        const items = (toolInput.items || []) as Array<{
          description: string
          quantity: number
          unitPrice: number
          vatIncluded?: boolean
        }>
        let subtotal = 0
        const processedItems = items.map((item) => {
          const { net, vat, gross } = calculateVAT(item.unitPrice * item.quantity, item.vatIncluded || false)
          subtotal += net
          return {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.vatIncluded ? net / item.quantity : item.unitPrice,
            total: net,
            vatIncluded: item.vatIncluded || false,
          }
        })

        const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100
        const total = subtotal + vatAmount

        // Generate invoice number
        const year = new Date().getFullYear()
        const count = await db.invoice.count({ where: { businessId: business.id } })
        const invoiceNumber = generateInvoiceNumber(year, count + 1)

        const invoice = await db.invoice.create({
          data: {
            businessId: business.id,
            clientId: clientId || null,
            invoiceNumber,
            type: toolInput.type || 'TAX_INVOICE',
            dueDate: toolInput.dueDate ? new Date(toolInput.dueDate) : null,
            notes: toolInput.notes || null,
            subtotal,
            vatAmount,
            vatRate: VAT_RATE,
            total,
            items: { create: processedItems },
          },
          include: { items: true, client: true },
        })

        return JSON.stringify({
          success: true,
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.client?.name || 'לא צוין',
            total: invoice.total,
            vatAmount: invoice.vatAmount,
            subtotal: invoice.subtotal,
            status: invoice.status,
            type: invoice.type,
          },
          message: `חשבונית ${invoice.invoiceNumber} נוצרה בהצלחה. סה"כ: ₪${invoice.total.toFixed(2)}`,
        })
      }

      case 'get_invoice': {
        const where = toolInput.invoiceId
          ? { id: toolInput.invoiceId }
          : { invoiceNumber: toolInput.invoiceNumber }
        const invoice = await db.invoice.findFirst({
          where,
          include: { items: true, client: true },
        })
        if (!invoice) return JSON.stringify({ error: 'חשבונית לא נמצאה' })
        return JSON.stringify(invoice)
      }

      case 'list_invoices': {
        const business = await getOrCreateBusiness()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { businessId: business.id }
        if (toolInput.status) where.status = toolInput.status
        if (toolInput.clientId) where.clientId = toolInput.clientId
        if (toolInput.dateFrom || toolInput.dateTo) {
          where.issueDate = {}
          if (toolInput.dateFrom) where.issueDate.gte = new Date(toolInput.dateFrom)
          if (toolInput.dateTo) where.issueDate.lte = new Date(toolInput.dateTo)
        }
        const invoices = await db.invoice.findMany({
          where,
          include: { client: true, items: true },
          orderBy: { issueDate: 'desc' },
          take: toolInput.limit || 10,
        })
        return JSON.stringify({
          count: invoices.length,
          invoices: invoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            client: inv.client?.name || 'לא צוין',
            total: inv.total,
            status: inv.status,
            type: inv.type,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
          })),
        })
      }

      case 'update_invoice_status': {
        const updateData: Record<string, unknown> = { status: toolInput.status }
        if (toolInput.status === 'PAID') updateData.paidAt = new Date()
        const invoice = await db.invoice.update({
          where: { id: toolInput.invoiceId },
          data: updateData,
          include: { client: true },
        })
        return JSON.stringify({
          success: true,
          invoiceNumber: invoice.invoiceNumber,
          newStatus: invoice.status,
          message: `סטטוס חשבונית ${invoice.invoiceNumber} עודכן ל-${invoice.status}`,
        })
      }

      case 'create_client': {
        const business = await getOrCreateBusiness()
        const client = await db.client.create({
          data: {
            businessId: business.id,
            name: toolInput.name,
            email: toolInput.email || null,
            phone: toolInput.phone || null,
            vatNumber: toolInput.vatNumber || null,
            address: toolInput.address || null,
            city: toolInput.city || null,
            notes: toolInput.notes || null,
          },
        })
        return JSON.stringify({
          success: true,
          client: { id: client.id, name: client.name, email: client.email },
          message: `לקוח ${client.name} נוסף בהצלחה`,
        })
      }

      case 'list_clients': {
        const business = await getOrCreateBusiness()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { businessId: business.id }
        if (toolInput.search) {
          where.OR = [
            { name: { contains: toolInput.search } },
            { email: { contains: toolInput.search } },
            { vatNumber: { contains: toolInput.search } },
          ]
        }
        const clients = await db.client.findMany({
          where,
          include: { _count: { select: { invoices: true } } },
          orderBy: { name: 'asc' },
        })
        return JSON.stringify({
          count: clients.length,
          clients: clients.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            invoiceCount: c._count.invoices,
          })),
        })
      }

      case 'get_financial_summary': {
        const business = await getOrCreateBusiness()
        const period = toolInput.period || 'month'
        const now = new Date()
        let dateFrom: Date

        if (period === 'month') {
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
        } else if (period === 'quarter') {
          const quarterStart = Math.floor(now.getMonth() / 3) * 3
          dateFrom = new Date(now.getFullYear(), quarterStart, 1)
        } else {
          dateFrom = new Date(now.getFullYear(), 0, 1)
        }

        const [invoices, bankAccounts] = await Promise.all([
          db.invoice.findMany({
            where: { businessId: business.id, issueDate: { gte: dateFrom }, status: { not: 'CANCELLED' } },
          }),
          db.bankAccount.findMany({ where: { businessId: business.id } }),
        ])

        const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.total, 0)
        const outstandingAmount = invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + i.total, 0)
        const outstandingCount = invoices.filter(i => ['SENT', 'OVERDUE'].includes(i.status)).length
        const totalVAT = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.vatAmount, 0)
        const bankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0)

        return JSON.stringify({
          period,
          dateFrom,
          totalRevenue,
          outstandingAmount,
          outstandingCount,
          vatCollected: totalVAT,
          bankBalance,
          invoiceCount: invoices.length,
          summary: `תקופה: ${period} | הכנסות: ₪${totalRevenue.toFixed(2)} | פתוחות: ₪${outstandingAmount.toFixed(2)} (${outstandingCount} חשבוניות) | מע"מ שנגבה: ₪${totalVAT.toFixed(2)} | יתרת בנק: ₪${bankBalance.toFixed(2)}`,
        })
      }

      case 'calculate_vat_report': {
        const business = await getOrCreateBusiness()
        const periodStart = new Date(toolInput.periodStart)
        const periodEnd = new Date(toolInput.periodEnd)

        const [invoices, transactions] = await Promise.all([
          db.invoice.findMany({
            where: {
              businessId: business.id,
              issueDate: { gte: periodStart, lte: periodEnd },
              status: { notIn: ['CANCELLED', 'DRAFT'] },
            },
          }),
          db.bankTransaction.findMany({
            where: {
              bankAccount: { businessId: business.id },
              date: { gte: periodStart, lte: periodEnd },
            },
          }),
        ])

        const outputVAT = invoices.reduce((s, i) => s + i.vatAmount, 0)
        const totalRevenue = invoices.reduce((s, i) => s + i.subtotal, 0)
        const expenseTransactions = transactions.filter(t => t.amount < 0 && t.category === 'EXPENSE')
        const totalExpenses = Math.abs(expenseTransactions.reduce((s, t) => s + t.amount, 0))
        const inputVAT = Math.round(totalExpenses * VAT_RATE * 100) / 100
        const vatOwed = Math.round((outputVAT - inputVAT) * 100) / 100

        return JSON.stringify({
          periodStart,
          periodEnd,
          outputVAT: Math.round(outputVAT * 100) / 100,
          inputVAT,
          vatOwed,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          invoiceCount: invoices.length,
          message: vatOwed > 0
            ? `יש לשלם מע"מ של ₪${vatOwed.toFixed(2)} עד ה-15 לחודש הבא`
            : `יש להחזר מע"מ של ₪${Math.abs(vatOwed).toFixed(2)}`,
        })
      }

      case 'list_bank_transactions': {
        const business = await getOrCreateBusiness()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { bankAccount: { businessId: business.id } }
        if (toolInput.dateFrom || toolInput.dateTo) {
          where.date = {}
          if (toolInput.dateFrom) where.date.gte = new Date(toolInput.dateFrom)
          if (toolInput.dateTo) where.date.lte = new Date(toolInput.dateTo)
        }
        if (toolInput.category) where.category = toolInput.category
        const transactions = await db.bankTransaction.findMany({
          where,
          orderBy: { date: 'desc' },
          take: toolInput.limit || 20,
        })
        return JSON.stringify({
          count: transactions.length,
          transactions: transactions.map((t) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: t.category,
            isReconciled: t.isReconciled,
          })),
        })
      }

      case 'get_tax_advice': {
        return JSON.stringify({
          question: toolInput.question,
          note: 'ייעוץ זה הוא מידע כללי בלבד ואינו מהווה ייעוץ מקצועי. יש להתייעץ עם רואה חשבון מוסמך.',
          relevantLaw: 'חוק מע"מ תשל"ו-1975, פקודת מס הכנסה [נוסח חדש], תשכ"א-1961',
        })
      }

      case 'list_expenses': {
        const business = await getOrCreateBusiness()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { businessId: business.id }
        if (toolInput.category) where.category = toolInput.category
        if (toolInput.status) where.status = toolInput.status
        if (toolInput.dateFrom || toolInput.dateTo) {
          where.date = {}
          if (toolInput.dateFrom) where.date.gte = new Date(toolInput.dateFrom)
          if (toolInput.dateTo) where.date.lte = new Date(toolInput.dateTo)
        }
        const expenses = await db.expense.findMany({
          where,
          orderBy: { date: 'desc' },
          take: 30,
        })
        const totalAmount = expenses.reduce((s, e) => s + e.total, 0)
        const vatDeductible = expenses.reduce(
          (s, e) => s + (e.vatDeductible ? e.vatAmount * (e.vatDeductiblePercent / 100) : 0),
          0
        )
        return JSON.stringify({
          count: expenses.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
          vatDeductible: Math.round(vatDeductible * 100) / 100,
          expenses: expenses.map(e => ({
            id: e.id,
            vendor: e.vendor,
            date: e.date,
            total: e.total,
            vatAmount: e.vatAmount,
            category: e.category,
            status: e.status,
            vatDeductible: e.vatDeductible,
            vatDeductiblePercent: e.vatDeductiblePercent,
          })),
          summary: `${expenses.length} הוצאות | סה"כ: ₪${totalAmount.toFixed(2)} | מע"מ תשומות לניכוי: ₪${vatDeductible.toFixed(2)}`,
        })
      }

      default:
        return JSON.stringify({ error: `כלי לא מוכר: ${toolName}` })
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error)
    return JSON.stringify({ error: `שגיאה בביצוע הפעולה: ${error instanceof Error ? error.message : String(error)}` })
  }
}

// ─── Streaming Chat ────────────────────────────────────────────────────────────

export interface StreamChunk {
  type: 'text' | 'tool_start' | 'tool_result' | 'done' | 'error'
  content?: string
  toolName?: string
  toolInput?: Record<string, unknown>
  toolResult?: string
}

export async function* streamChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): AsyncGenerator<StreamChunk> {
  try {
    // Convert to Anthropic message format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    let continueLoop = true

    while (continueLoop) {
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: AI_TOOLS,
        messages: anthropicMessages,
      })

      let currentText = ''
      const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
      let currentToolUse: { id: string; name: string; inputJson: string } | null = null

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'text') {
            currentText = ''
          } else if (event.content_block.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              inputJson: '',
            }
            yield { type: 'tool_start', toolName: event.content_block.name }
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            currentText += event.delta.text
            yield { type: 'text', content: event.delta.text }
          } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
            currentToolUse.inputJson += event.delta.partial_json
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUse) {
            const input = JSON.parse(currentToolUse.inputJson || '{}')
            toolUses.push({ id: currentToolUse.id, name: currentToolUse.name, input })
            currentToolUse = null
          }
        } else if (event.type === 'message_stop') {
          const finalMessage = await stream.finalMessage()

          if (finalMessage.stop_reason === 'tool_use' && toolUses.length > 0) {
            // Add assistant's response to message history
            anthropicMessages.push({
              role: 'assistant',
              content: finalMessage.content,
            })

            // Execute tools and collect results
            const toolResults: Anthropic.ToolResultBlockParam[] = []
            for (const toolUse of toolUses) {
              const result = await executeTool(toolUse.name, toolUse.input)
              yield {
                type: 'tool_result',
                toolName: toolUse.name,
                toolResult: result,
              }
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result,
              })
            }

            // Add tool results to message history
            anthropicMessages.push({
              role: 'user',
              content: toolResults,
            })
            // Continue the loop to get Claude's response to tool results
          } else {
            continueLoop = false
            yield { type: 'done' }
          }
        }
      }

      if (toolUses.length === 0) {
        continueLoop = false
      }
    }
  } catch (error) {
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'שגיאה לא ידועה',
    }
  }
}

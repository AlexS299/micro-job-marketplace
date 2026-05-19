import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// Column aliases for each field (handles Hebrew, English, and common software exports)
const ALIASES = {
  clients: {
    name:       ['שם', 'שם לקוח', 'name', 'client name', 'customer', 'Имя клиента'],
    email:      ['מייל', 'אימייל', 'דואר אלקטרוני', 'email', 'e-mail', 'Электронная почта'],
    phone:      ['טלפון', 'phone', 'mobile', 'Телефон'],
    vatNumber:  ['ח.פ', 'מספר עוסק', 'עוסק', 'vat', 'tax id', 'ИНН'],
    city:       ['עיר', 'city', 'Город'],
    address:    ['כתובת', 'address', 'Адрес'],
    notes:      ['הערות', 'notes', 'Примечания'],
  },
  invoices: {
    invoiceNumber: ['מספר חשבונית', 'מספר', 'invoice #', 'invoice number', '№'],
    clientName:    ['לקוח', 'שם לקוח', 'client', 'customer', 'Клиент'],
    issueDate:     ['תאריך', 'תאריך הפקה', 'date', 'issue date', 'Дата'],
    dueDate:       ['תאריך פירעון', 'תאריך יעד', 'due date', 'Срок оплаты'],
    total:         ['סה"כ', 'סכום', 'total', 'amount', 'Итого'],
    status:        ['סטטוס', 'status', 'Статус'],
    notes:         ['הערות', 'notes', 'Примечания'],
  },
  expenses: {
    vendor:      ['ספק', 'vendor', 'supplier', 'Поставщик'],
    description: ['תיאור', 'פירוט', 'description', 'Описание'],
    date:        ['תאריך', 'date', 'Дата'],
    total:       ['סה"כ', 'סכום', 'total', 'amount', 'Итого'],
    category:    ['קטגוריה', 'category', 'Категория'],
    notes:       ['הערות', 'notes', 'Примечания'],
  },
}

function matchCol(headers: string[], aliases: string[]): string | null {
  const normalized = headers.map(h => h.trim().toLowerCase())
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias.toLowerCase())
    if (idx !== -1) return headers[idx]
  }
  return null
}

function parseRows(buffer: Buffer, filename: string): Record<string, string>[] {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'csv') {
    const text = buffer.toString('utf-8')
    const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
    return result.data
  }

  // Excel (.xlsx / .xls / .ods)
  const wb = XLSX.read(buffer)
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
}

async function importClients(rows: Record<string, string>[], businessId: string) {
  const headers = Object.keys(rows[0] ?? {})
  const get = (field: keyof typeof ALIASES.clients) => matchCol(headers, ALIASES.clients[field])

  let imported = 0
  for (const row of rows) {
    const name = get('name') ? row[get('name')!]?.trim() : ''
    if (!name) continue
    // Skip if a client with this name already exists for this business
    const existing = await db.client.findFirst({ where: { businessId, name }, select: { id: true } })
    if (existing) { imported++; continue }

    await db.client.create({
      data: {
        businessId, name,
        email:     get('email')     ? row[get('email')!]?.trim()     || null : null,
        phone:     get('phone')     ? row[get('phone')!]?.trim()     || null : null,
        vatNumber: get('vatNumber') ? row[get('vatNumber')!]?.trim() || null : null,
        city:      get('city')      ? row[get('city')!]?.trim()      || null : null,
        address:   get('address')   ? row[get('address')!]?.trim()   || null : null,
        notes:     get('notes')     ? row[get('notes')!]?.trim()     || null : null,
      },
    })
    imported++
  }
  return imported
}

async function importExpenses(rows: Record<string, string>[], businessId: string) {
  const headers = Object.keys(rows[0] ?? {})
  const get = (field: keyof typeof ALIASES.expenses) => matchCol(headers, ALIASES.expenses[field])

  let imported = 0
  for (const row of rows) {
    const totalStr = get('total') ? row[get('total')!] : ''
    const total = parseFloat(totalStr?.replace(/[^0-9.]/g, '') || '0')
    if (!total) continue

    const dateStr = get('date') ? row[get('date')!]?.trim() : ''
    const date = dateStr ? new Date(dateStr) : new Date()
    if (isNaN(date.getTime())) continue

    await db.expense.create({
      data: {
        businessId,
        vendor:      get('vendor')      ? row[get('vendor')!]?.trim()      || 'לא ידוע' : 'לא ידוע',
        description: get('description') ? row[get('description')!]?.trim() || null : null,
        date,
        subtotal:    total,
        vatAmount:   0,
        total,
        category:    get('category') ? row[get('category')!]?.trim() || 'אחר' : 'אחר',
        notes:       get('notes') ? row[get('notes')!]?.trim() || null : null,
      },
    })
    imported++
  }
  return imported
}

export async function POST(req: NextRequest) {
  const { business, error } = await getAuthBusiness()
  if (error) return error

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file) return NextResponse.json({ error: 'קובץ לא נמצא' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'הקובץ גדול מדי (מקסימום 10MB)' }, { status: 400 })
  }
  if (!['clients', 'expenses'].includes(type ?? '')) {
    return NextResponse.json({ error: 'סוג לא חוקי' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let rows: Record<string, string>[]
  try {
    rows = parseRows(buffer, file.name)
  } catch {
    return NextResponse.json({ error: 'לא ניתן לקרוא את הקובץ' }, { status: 400 })
  }

  if (!rows.length) return NextResponse.json({ error: 'הקובץ ריק' }, { status: 400 })

  let imported = 0
  if (type === 'clients') {
    imported = await importClients(rows, business.id)
  } else if (type === 'expenses') {
    imported = await importExpenses(rows, business.id)
  }

  return NextResponse.json({ ok: true, imported, total: rows.length })
}

// GET — download a CSV template
export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') ?? 'clients'

  const templates: Record<string, string[][]> = {
    clients: [
      ['שם', 'מייל', 'טלפון', 'מספר עוסק', 'עיר', 'כתובת', 'הערות'],
      ['חברת דוגמה בע"מ', 'info@example.co.il', '03-1234567', '514123456', 'תל אביב', 'רחוב הרצל 1', ''],
    ],
    expenses: [
      ['ספק', 'תיאור', 'תאריך', 'סה"כ', 'קטגוריה', 'הערות'],
      ['מכולת שמש', 'ציוד משרדי', '01/01/2025', '250', 'משרד', ''],
    ],
    invoices: [
      ['מספר חשבונית', 'לקוח', 'תאריך', 'תאריך פירעון', 'סה"כ', 'סטטוס', 'הערות'],
      ['2025-001', 'לקוח לדוגמה', '01/01/2025', '31/01/2025', '5000', 'SENT', ''],
    ],
  }

  const rows = templates[type] ?? templates.clients
  const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')

  return new Response('﻿' + csv, { // BOM for Excel Hebrew support
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="template_${type}.csv"`,
    },
  })
}

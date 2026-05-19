import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import Papa from 'papaparse'
import { getAuthBusiness } from '@/lib/auth-context'

async function getOrCreateBankAccount(businessId: string) {
  let account = await db.bankAccount.findFirst({ where: { businessId } })
  if (!account) {
    account = await db.bankAccount.create({
      data: {
        businessId,
        bankName: 'ייבוא CSV',
        accountNumber: 'IMPORTED',
        currency: 'ILS',
        balance: 0,
      },
    })
  }
  return account
}

function detectFormat(headers: string[]): 'hapoalim' | 'leumi' | 'generic' {
  const h = headers.map(s => s.toLowerCase().trim())
  if (h.some(s => s.includes('זיכוי') || s.includes('credit'))) return 'hapoalim'
  if (h.some(s => s.includes('פירוט') || s.includes('תנועה'))) return 'leumi'
  return 'generic'
}

function parseAmount(debit: string, credit: string): number {
  const d = parseFloat((debit || '0').replace(/[₪,\s]/g, '')) || 0
  const c = parseFloat((credit || '0').replace(/[₪,\s]/g, '')) || 0
  return c - d // positive = income, negative = expense
}

function parseRow(
  row: Record<string, string>,
  format: string
): { date: Date; description: string; amount: number; balance: number | null } | null {
  try {
    let date: Date
    let description: string
    let amount: number
    let balance: number | null = null

    if (format === 'hapoalim') {
      date = new Date(row['תאריך'] || row['date'] || '')
      description = row['תיאור'] || row['description'] || ''
      amount = parseAmount(
        row['חיוב'] || row['debit'] || '0',
        row['זיכוי'] || row['credit'] || '0'
      )
      const balStr = (row['יתרה'] || row['balance'] || '').replace(/[₪,\s]/g, '')
      balance = balStr ? parseFloat(balStr) || null : null
    } else {
      const values = Object.values(row)
      const keys = Object.keys(row)
      const dateKey = keys.find(k => ['תאריך', 'date', 'Date', 'תאריך ערך'].includes(k)) || keys[0]
      const descKey = keys.find(k => ['תיאור', 'description', 'Description', 'פירוט', 'תנועה'].includes(k)) || keys[1]
      const debitKey = keys.find(k => ['חיוב', 'debit', 'Debit'].includes(k))
      const creditKey = keys.find(k => ['זיכוי', 'credit', 'Credit'].includes(k))
      const balKey = keys.find(k => ['יתרה', 'balance', 'Balance'].includes(k))

      date = new Date(row[dateKey] || values[0])
      description = row[descKey] || values[1] || ''
      amount = parseAmount(
        debitKey ? row[debitKey] : '0',
        creditKey ? row[creditKey] : '0'
      )
      if (balKey) {
        const balStr = (row[balKey] || '').replace(/[₪,\s]/g, '')
        balance = balStr ? parseFloat(balStr) || null : null
      }
    }

    if (isNaN(date.getTime()) || !description.trim()) return null
    return { date, description: description.trim(), amount, balance }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'לא הועלה קובץ' }, { status: 400 })
    }

    const text = await file.text()
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    })

    const { data, errors } = result

    if (errors.length > 0 && data.length === 0) {
      return NextResponse.json(
        { error: 'שגיאה בפרסור הקובץ. ודא שהוא CSV תקין' },
        { status: 400 }
      )
    }

    const headers = data.length > 0 ? Object.keys(data[0]) : []
    const format = detectFormat(headers)

    const { business, error: authError } = await getAuthBusiness()
    if (authError) return authError
    const account = await getOrCreateBankAccount(business.id)

    let imported = 0
    let skipped = 0

    for (const row of data) {
      const parsed = parseRow(row, format)
      if (!parsed) {
        skipped++
        continue
      }

      // Skip duplicates (same date + description + amount)
      const existing = await db.bankTransaction.findFirst({
        where: {
          bankAccountId: account.id,
          date: parsed.date,
          description: parsed.description,
          amount: parsed.amount,
        },
      })
      if (existing) {
        skipped++
        continue
      }

      const category = parsed.amount > 0 ? 'INCOME' : 'EXPENSE'
      await db.bankTransaction.create({
        data: {
          bankAccountId: account.id,
          date: parsed.date,
          description: parsed.description,
          amount: parsed.amount,
          balance: parsed.balance,
          category,
        },
      })
      imported++
    }

    // Update account balance if we have it in the last row
    const lastWithBalance = [...data].reverse().find(
      row => row['יתרה'] || row['balance'] || row['Balance']
    )
    if (lastWithBalance) {
      const balKey = Object.keys(lastWithBalance).find(k =>
        ['יתרה', 'balance', 'Balance'].includes(k)
      )
      if (balKey) {
        const bal = parseFloat((lastWithBalance[balKey] || '').replace(/[₪,\s]/g, ''))
        if (!isNaN(bal)) {
          await db.bankAccount.update({ where: { id: account.id }, data: { balance: bal } })
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: data.length,
      message: `יובאו ${imported} עסקאות (${skipped} כפולים/שגיאות דולגו)`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'שגיאה בייבוא: ' + String(error) },
      { status: 500 }
    )
  }
}

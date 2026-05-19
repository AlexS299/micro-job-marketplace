import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { scanDocument } from '@/lib/document-scanner'
import db from '@/lib/db'
import { getAuthBusiness } from '@/lib/auth-context'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'expenses')
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const { business, error } = await getAuthBusiness()
    if (error) return error

    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'לא הועלה קובץ' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'סוג קובץ לא נתמך. העלה תמונה (JPG, PNG, WEBP)' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'הקובץ גדול מדי (מקסימום 10MB)' }, { status: 400 })
    }

    // Save file
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `expense-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Scan with Claude vision
    const scanned = await scanDocument(filePath)

    // Save to DB
    const expense = await db.expense.create({
      data: {
        businessId: business.id,
        vendor: scanned.vendor,
        description: scanned.description,
        date: scanned.date ? new Date(scanned.date) : new Date(),
        subtotal: scanned.subtotal,
        vatAmount: scanned.vatAmount,
        total: scanned.total,
        category: scanned.category,
        receiptNumber: scanned.receiptNumber,
        vatDeductible: scanned.vatDeductible,
        vatDeductiblePercent: scanned.vatDeductiblePercent,
        documentPath: `/uploads/expenses/${filename}`,
        rawExtraction: scanned.rawText,
        confidence: scanned.confidence,
        status: 'PENDING',
        notes: scanned.notes,
      },
    })

    return NextResponse.json({ expense, scanned })
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'שגיאה בסריקת המסמך' },
      { status: 500 }
    )
  }
}

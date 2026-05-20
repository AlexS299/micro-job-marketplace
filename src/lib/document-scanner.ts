import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from './expense-categories'

export { EXPENSE_CATEGORIES, type ExpenseCategory }

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ScannedExpense {
  vendor: string | null
  date: string | null
  subtotal: number
  vatAmount: number
  total: number
  vatRate: number
  description: string | null
  category: ExpenseCategory
  receiptNumber: string | null
  vatDeductible: boolean
  vatDeductiblePercent: number
  confidence: number
  notes: string | null
  rawText: string | null
}

const SCANNER_PROMPT = `אתה מומחה בקריאת קבלות וחשבוניות ישראליות ובינלאומיות.
קרא את המסמך המצורף וחלץ את כל פרטי ההוצאה.

החזר תשובה בפורמט JSON בלבד, ללא טקסט נוסף:
{
  "vendor": "שם הספק/בית העסק",
  "date": "YYYY-MM-DD (תאריך הקבלה)",
  "subtotal": 0.00,
  "vatAmount": 0.00,
  "total": 0.00,
  "vatRate": 0.18,
  "description": "תיאור קצר של הקנייה",
  "category": "אחת בדיוק מהרשימה: OFFICE, TRAVEL, MEALS, PROFESSIONAL, MARKETING, RENT, UTILITIES, INSURANCE, SALARY, SOFTWARE, OTHER",
  "receiptNumber": "מספר קבלה/חשבונית אם מופיע",
  "vatDeductible": true,
  "vatDeductiblePercent": 100,
  "confidence": 0.0-1.0,
  "notes": "הערות חשובות (למשל: הוצאה מעורבת, הגבלות ניכוי)",
  "rawText": "הטקסט שזיהית במסמך (עד 500 תווים)"
}

## כללי ניכוי מע"מ בישראל לפי קטגוריה:
- OFFICE, PROFESSIONAL, MARKETING, SOFTWARE: vatDeductible=true, vatDeductiblePercent=100
- TRAVEL (רכב פרטי): vatDeductible=true, vatDeductiblePercent=67 (2/3 בלבד)
- MEALS (ארוחות עסקיות): vatDeductible=false, vatDeductiblePercent=0
- RENT (משרד): vatDeductible=true, vatDeductiblePercent=100
- UTILITIES: vatDeductible=true, vatDeductiblePercent=100
- INSURANCE: vatDeductible=false, vatDeductiblePercent=0

## חשוב:
- אם הסכום כולל מע"מ: subtotal = total / 1.18, vatAmount = total - subtotal
- אם אין מע"מ מופיע: vatAmount = 0, vatDeductible = false
- confidence: 0.9+ אם קריאה ברורה, 0.7-0.9 אם חלקית, מתחת ל-0.7 אם קשה לקרוא`

function fileToBase64(filePath: string): string {
  const buffer = fs.readFileSync(filePath)
  return buffer.toString('base64')
}

function getMediaType(filePath: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  return map[ext] || 'image/jpeg'
}

export async function scanDocument(filePath: string): Promise<ScannedExpense> {
  const base64 = fileToBase64(filePath)
  const mediaType = getMediaType(filePath)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: SCANNER_PROMPT,
          },
        ],
      },
    ],
  })

  const textContent = response.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('לא התקבלה תשובה מה-AI')
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('לא ניתן לפרש את התשובה')
  }

  const parsed = JSON.parse(jsonMatch[0])

  return {
    vendor: parsed.vendor || null,
    date: parsed.date || null,
    subtotal: Number(parsed.subtotal) || 0,
    vatAmount: Number(parsed.vatAmount) || 0,
    total: Number(parsed.total) || 0,
    vatRate: Number(parsed.vatRate) || 0.18,
    description: parsed.description || null,
    category: (parsed.category as ExpenseCategory) || 'OTHER',
    receiptNumber: parsed.receiptNumber || null,
    vatDeductible: Boolean(parsed.vatDeductible),
    vatDeductiblePercent: Number(parsed.vatDeductiblePercent) ?? 100,
    confidence: Number(parsed.confidence) || 0.5,
    notes: parsed.notes || null,
    rawText: parsed.rawText || null,
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Alert } from '@/lib/alerts'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const alert: Alert = await request.json()

  const prompt = `אתה "רואה" — יועץ פיננסי חכם לעסקים ישראליים.
בעל העסק מקבל את ההתראה הבאה ורוצה הסבר מעמיק ופעולות מומלצות:

**התראה:** ${alert.title}
**הודעה:** ${alert.message}
**קטגוריה:** ${alert.category}
**חומרה:** ${alert.severity}
${alert.amount ? `**סכום:** ₪${alert.amount.toLocaleString()}` : ''}
${alert.daysLeft !== undefined ? `**ימים שנותרו:** ${alert.daysLeft}` : ''}
${alert.data ? `**נתונים נוספים:** ${JSON.stringify(alert.data)}` : ''}

ענה בפורמט הזה בדיוק (markdown):

## מה קורה כאן?
[2-3 משפטים בעברית פשוטה — מה המשמעות של ההתראה הזו לעסק]

## למה זה חשוב?
[1-2 משפטים — מה קורה אם לא מטפלים]

## 3 צעדים מיידיים:
1. **[פעולה]** — [הסבר קצר]
2. **[פעולה]** — [הסבר קצר]
3. **[פעולה]** — [הסבר קצר]

## טיפ מקצועי
[תובנה אחת שרואה חשבון היה נותן — ספציפית לסיטואציה הזו]`

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}

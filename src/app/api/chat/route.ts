import { NextRequest, NextResponse } from 'next/server'
import { streamChat } from '@/lib/claude'
import db from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'הודעה נדרשת' }, { status: 400 })
    }

    // Save user message to DB
    await db.chatMessage.create({
      data: { role: 'user', content: message },
    })

    const messages = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let fullText = ''

        try {
          for await (const chunk of streamChat(messages)) {
            const data = JSON.stringify(chunk)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))

            if (chunk.type === 'text') {
              fullText += chunk.content || ''
            }

            if (chunk.type === 'done') {
              // Save assistant response to DB
              if (fullText) {
                await db.chatMessage.create({
                  data: { role: 'assistant', content: fullText },
                })
              }
              controller.close()
              return
            }

            if (chunk.type === 'error') {
              controller.close()
              return
            }
          }
        } catch (error) {
          const errChunk = JSON.stringify({
            type: 'error',
            content: error instanceof Error ? error.message : 'שגיאה לא ידועה',
          })
          controller.enqueue(encoder.encode(`data: ${errChunk}\n\n`))
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'שגיאה בעיבוד הבקשה' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const messages = await db.chatMessage.findMany({
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return NextResponse.json(messages)
  } catch (error) {
    console.error('Chat GET error:', error)
    return NextResponse.json({ error: 'שגיאה בטעינת ההיסטוריה' }, { status: 500 })
  }
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import {
  Send,
  Sparkles,
  Loader2,
  FileText,
  TrendingUp,
  Calendar,
  User,
  Wrench,
  AlertCircle,
} from 'lucide-react'
import { formatDate } from '@/lib/vat'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolUse?: string | null
  createdAt: string
  streaming?: boolean
  toolsExecuted?: string[]
}

const QUICK_ACTIONS = [
  { label: 'צור חשבונית', icon: FileText, message: 'אני רוצה ליצור חשבונית חדשה' },
  { label: 'מצב פיננסי', icon: TrendingUp, message: 'מה המצב הפיננסי שלי החודש?' },
  { label: 'מועד מע"מ', icon: Calendar, message: 'מתי אני צריך להגיש דוח מע"מ?' },
  { label: 'לקוחות', icon: User, message: 'הצג לי רשימת לקוחות' },
]

const TOOL_LABELS: Record<string, string> = {
  create_invoice: 'יוצר חשבונית...',
  get_invoice: 'מחפש חשבונית...',
  list_invoices: 'טוען חשבוניות...',
  update_invoice_status: 'מעדכן סטטוס...',
  create_client: 'מוסיף לקוח...',
  list_clients: 'טוען לקוחות...',
  get_financial_summary: 'מחשב סיכום פיננסי...',
  calculate_vat_report: 'מחשב דוח מע"מ...',
  list_bank_transactions: 'טוען תנועות בנק...',
  get_tax_advice: 'מחפש מידע על מיסים...',
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentToolLabels, setCurrentToolLabels] = useState<string[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Load chat history
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data: Message[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data)
        } else {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: 'שלום! אני רואה, העוזר החשבונאי שלך. אני יכול לעזור לך:\n\n• **ליצור חשבוניות מס** ולנהל לקוחות\n• **לחשב מע"מ** ולתזכר מועדי הגשה\n• **לנתח את המצב הפיננסי** של העסק\n• **לספק ייעוץ** בנושאי מיסוי ישראלי\n\nכיצד אוכל לסייע לך?',
            createdAt: new Date().toISOString(),
          }])
        }
      })
      .catch(() => {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'שלום! אני רואה, העוזר החשבונאי שלך. כיצד אוכל לסייע?',
          createdAt: new Date().toISOString(),
        }])
      })
      .finally(() => setLoadingHistory(false))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentToolLabels])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    }

    const history = messages
      .filter((m) => !m.streaming)
      .slice(-10) // last 10 messages for context
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setCurrentToolLabels([])

    // Create streaming assistant message
    const assistantMsgId = (Date.now() + 1).toString()
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streaming: true,
      toolsExecuted: [],
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      const executedTools: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const chunk = JSON.parse(line.slice(6))

            if (chunk.type === 'text') {
              fullContent += chunk.content
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: fullContent } : m
                )
              )
            } else if (chunk.type === 'tool_start') {
              const toolLabel = TOOL_LABELS[chunk.toolName] || `מבצע ${chunk.toolName}...`
              setCurrentToolLabels((prev) => [...prev, toolLabel])
              executedTools.push(chunk.toolName)
            } else if (chunk.type === 'tool_result') {
              setCurrentToolLabels((prev) => prev.filter((l) => !l.startsWith(TOOL_LABELS[chunk.toolName]?.split('...')[0] || '')))
            } else if (chunk.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, streaming: false, toolsExecuted: executedTools }
                    : m
                )
              )
              setCurrentToolLabels([])
            } else if (chunk.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: `שגיאה: ${chunk.content}`, streaming: false }
                    : m
                )
              )
              setCurrentToolLabels([])
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: 'שגיאה בתקשורת עם השרת. אנא נסה שוב.', streaming: false }
            : m
        )
      )
      setCurrentToolLabels([])
      console.error('Chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function formatMessageContent(content: string) {
    // Simple markdown-like formatting
    return content
      .split('\n')
      .map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <strong key={i} className="block">{line.slice(2, -2)}</strong>
        }
        if (line.startsWith('• ')) {
          return <span key={i} className="block">• {line.slice(2)}</span>
        }
        // Inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <span key={i} className="block">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>
              }
              return part
            })}
          </span>
        )
      })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-700 rounded-xl">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-900">רואה - עוזר חשבונאי AI</h1>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full" />
            מחובר | Claude AI
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap pb-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => sendMessage(action.message)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          )
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'flex gap-3',
                msg.role === 'user' ? 'justify-start' : 'justify-end'
              )}
            >
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center mt-1">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}

              <div
                className={clsx(
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-blue-700 text-white rounded-tr-sm'
                    : 'bg-white shadow-sm border border-slate-100 text-slate-800 rounded-tl-sm'
                )}
              >
                {/* Tool executions badge */}
                {msg.role === 'assistant' && msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {msg.toolsExecuted.map((tool, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                        <Wrench className="w-3 h-3" />
                        {TOOL_LABELS[tool]?.replace('...', '') || tool}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-0.5">
                  {formatMessageContent(msg.content)}
                </div>

                {msg.streaming && !msg.content && (
                  <div className="flex gap-1 items-center py-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-blue-400 rounded-full typing-dot" />
                    <span className="w-2 h-2 bg-blue-400 rounded-full typing-dot" />
                  </div>
                )}

                <p className="text-[10px] mt-2 opacity-50">
                  {formatDate(msg.createdAt)}
                </p>
              </div>

              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center mt-1">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Tool execution indicators */}
        {currentToolLabels.map((label, i) => (
          <div key={i} className="flex justify-end gap-3">
            <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-2 rounded-full flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {label}
            </div>
            <div className="flex-shrink-0 w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-slate-200">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="שאל שאלה, צור חשבונית, בדוק מצב פיננסי..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 max-h-32"
            style={{ direction: 'rtl' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex-shrink-0 flex items-center justify-center w-11 h-11 bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          <AlertCircle className="w-3 h-3 inline ml-1" />
          ייעוץ AI בלבד — אינו מחליף ייעוץ מקצועי
        </p>
      </form>
    </div>
  )
}

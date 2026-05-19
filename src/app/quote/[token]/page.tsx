import { notFound } from 'next/navigation'
import db from '@/lib/db'
import QuoteResponseButtons from './QuoteResponseButtons'

interface Props { params: { token: string } }

export default async function QuotePage({ params }: Props) {
  const quote = await db.quote.findUnique({
    where: { token: params.token },
    include: { items: true, business: true, client: true },
  })
  if (!quote) notFound()

  const ils = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n)
  const fmtDate = (d: Date) => d.toLocaleDateString('he-IL')

  const expired = quote.validUntil < new Date()
  const responded = quote.status === 'ACCEPTED' || quote.status === 'DECLINED'

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <p className="text-blue-100 text-sm mb-1">הצעת מחיר</p>
            <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
            <p className="text-blue-100 mt-1">{quote.business.name}</p>
          </div>

          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div>
                <p className="text-slate-500 mb-0.5">הוכנה עבור</p>
                <p className="font-semibold text-slate-900">{quote.client?.name ?? 'לקוח יקר'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">תאריך הנפקה</p>
                <p className="font-semibold text-slate-900">{fmtDate(quote.issueDate)}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">תקף עד</p>
                <p className={`font-semibold ${expired ? 'text-red-600' : 'text-slate-900'}`}>
                  {fmtDate(quote.validUntil)} {expired ? '(פג תוקף)' : ''}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-0.5">סטטוס</p>
                <p className={`font-semibold ${
                  quote.status === 'ACCEPTED' ? 'text-green-600' :
                  quote.status === 'DECLINED' ? 'text-red-600' :
                  quote.status === 'SENT'     ? 'text-blue-600' : 'text-slate-600'
                }`}>
                  {quote.status === 'DRAFT' ? 'טיוטה' : quote.status === 'SENT' ? 'נשלחה' :
                   quote.status === 'ACCEPTED' ? '✓ אושרה' : quote.status === 'DECLINED' ? '✗ נדחתה' : quote.status}
                </p>
              </div>
            </div>

            {/* Items table */}
            <div className="border rounded-xl overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-right p-3 font-medium text-slate-600">תיאור</th>
                    <th className="text-center p-3 font-medium text-slate-600 w-16">כמות</th>
                    <th className="text-left p-3 font-medium text-slate-600 w-28">מחיר יחידה</th>
                    <th className="text-left p-3 font-medium text-slate-600 w-28">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-3 text-slate-800">{item.description}</td>
                      <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="p-3 text-left text-slate-600">{ils(item.unitPrice)}</td>
                      <td className="p-3 text-left font-medium">{ils(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="space-y-2 mb-6 text-sm max-w-xs mr-auto">
              <div className="flex justify-between text-slate-600">
                <span>סכום לפני מע"מ</span>
                <span>{ils(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>מע"מ ({Math.round(quote.vatRate * 100)}%)</span>
                <span>{ils(quote.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2">
                <span>סה"כ</span>
                <span className="text-blue-600">{ils(quote.total)}</span>
              </div>
            </div>

            {quote.notes && (
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 mb-6">
                <p className="font-medium text-slate-600 mb-1">הערות</p>
                <p className="whitespace-pre-line">{quote.notes}</p>
              </div>
            )}

            {quote.terms && (
              <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-800 mb-6">
                <p className="font-medium mb-1">תנאים והגבלות</p>
                <p className="whitespace-pre-line">{quote.terms}</p>
              </div>
            )}

            {/* Action buttons */}
            {!responded && !expired ? (
              <QuoteResponseButtons token={params.token} quoteNumber={quote.quoteNumber} />
            ) : responded ? (
              <div className={`rounded-xl p-4 text-center font-semibold ${
                quote.status === 'ACCEPTED' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {quote.status === 'ACCEPTED'
                  ? `✓ אישרת את ההצעה ב-${fmtDate(quote.acceptedAt!)}`
                  : `✗ דחית את ההצעה ב-${fmtDate(quote.declinedAt!)}`}
              </div>
            ) : (
              <div className="bg-red-50 text-red-800 rounded-xl p-4 text-center">
                ⏰ הצעה זו פגה תוקף. פנה אל {quote.business.name} לקבלת הצעה מעודכנת.
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          הצעה זו הופקה על ידי {quote.business.name}
          {quote.business.vatNumber ? ` · מע"מ ${quote.business.vatNumber}` : ''}
        </p>
      </div>
    </div>
  )
}

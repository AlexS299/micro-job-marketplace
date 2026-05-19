import { redirect, notFound } from 'next/navigation'
import db from '@/lib/db'

interface Props { params: { token: string } }

export default async function PayPage({ params }: Props) {
  const link = await db.paymentLink.findUnique({
    where: { token: params.token },
    include: { invoice: { include: { items: true } }, business: true },
  })

  if (!link) notFound()

  if (link.status === 'PAID') {
    redirect(`/pay/${params.token}/success`)
  }

  if (link.expiresAt < new Date()) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">לינק התשלום פג תוקף</h1>
          <p className="text-gray-500">פנה אל {link.business.name} לקבלת לינק חדש.</p>
        </div>
      </div>
    )
  }

  const { invoice, business } = link
  const ils = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n)

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💳</div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 mt-1">חשבונית מס׳ {invoice.invoiceNumber}</p>
        </div>

        {/* Invoice items */}
        <div className="border rounded-xl overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-3 font-medium text-gray-600">תיאור</th>
                <th className="text-center p-3 font-medium text-gray-600">כמות</th>
                <th className="text-left p-3 font-medium text-gray-600">סכום</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-3 text-gray-800">{item.description}</td>
                  <td className="p-3 text-center text-gray-600">{item.quantity}</td>
                  <td className="p-3 text-left font-medium">{ils(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="space-y-2 mb-8 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>סכום לפני מע"מ</span>
            <span>{ils(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>מע"מ ({Math.round(invoice.vatRate * 100)}%)</span>
            <span>{ils(invoice.vatAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
            <span>סה"כ לתשלום</span>
            <span className="text-blue-600">{ils(invoice.total)}</span>
          </div>
        </div>

        {/* Pay button — redirect to provider */}
        <a
          href={link.providerUrl}
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-bold text-lg py-4 rounded-xl transition-colors"
        >
          שלם עכשיו {ils(invoice.total)}
        </a>

        <p className="text-center text-xs text-gray-400 mt-4">
          התשלום מאובטח ומעובד על ידי {link.provider === 'CARDCOM' ? 'קארדקום' : link.provider === 'TRANZILA' ? 'טרנזילה' : 'פיימי'}
        </p>
      </div>
    </div>
  )
}

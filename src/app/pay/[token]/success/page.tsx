import db from '@/lib/db'
import { notFound } from 'next/navigation'

interface Props { params: { token: string } }

export default async function PaySuccessPage({ params }: Props) {
  const link = await db.paymentLink.findUnique({
    where: { token: params.token },
    include: { business: true, invoice: true },
  })
  if (!link) notFound()

  const ils = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n)

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">התשלום התקבל!</h1>
        <p className="text-gray-500 mb-6">
          תודה על תשלום חשבונית {link.invoice.invoiceNumber} בסכום {ils(link.amount)}.
        </p>
        <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800">
          <p className="font-medium">{link.business.name}</p>
          {link.transactionId && (
            <p className="mt-1 text-green-600">מספר אסמכתא: {link.transactionId}</p>
          )}
        </div>
      </div>
    </div>
  )
}

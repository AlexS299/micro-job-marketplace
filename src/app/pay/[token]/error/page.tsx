import db from '@/lib/db'
import { notFound } from 'next/navigation'

interface Props { params: { token: string } }

export default async function PayErrorPage({ params }: Props) {
  const link = await db.paymentLink.findUnique({
    where: { token: params.token },
    include: { business: true },
  })
  if (!link) notFound()

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">התשלום נכשל</h1>
        <p className="text-gray-500 mb-6">
          ניתן לנסות שוב או לפנות אל {link.business.name}.
        </p>
        <a
          href={`/pay/${params.token}`}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors"
        >
          נסה שוב
        </a>
      </div>
    </div>
  )
}

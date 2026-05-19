import { notFound } from 'next/navigation'
import PortalView from './PortalView'

async function getPortalData(token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/portal/${token}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function PortalPage({ params }: { params: { token: string } }) {
  const data = await getPortalData(params.token)
  if (!data) notFound()
  return <PortalView data={data} />
}

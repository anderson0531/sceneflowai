import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBillingUrl } from '@/lib/billing/billingUrls'

export default async function PricingRedirectPage() {
  const session = await getServerSession(authOptions as any)
  const isAuthenticated = Boolean(session?.user)

  redirect(getBillingUrl({ isAuthenticated, anchor: 'pricing' }))
}

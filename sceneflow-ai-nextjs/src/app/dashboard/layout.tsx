export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect(getLoginUrl({ returnUrl: '/dashboard' }))
  }

  return <div className="max-w-full h-full min-h-0">{children}</div>
}

export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import { LocaleBootstrap } from '@/components/i18n/LocaleBootstrap'
import { AppMessagesProvider } from '@/components/i18n/AppMessagesProvider'
import { UntranslatedStringOverlay } from '@/components/i18n/UntranslatedStringOverlay'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect(getLoginUrl({ returnUrl: '/dashboard' }))
  }

  // Covers the Dashboard home and Projects. The studios, Series and Settings
  // each add their own provider in their own layout, so nothing loads a catalog
  // it does not render.
  return (
    <AppMessagesProvider surfaces={['dashboard']}>
      <div className="max-w-full h-full min-h-0">
        <LocaleBootstrap />
        <UntranslatedStringOverlay />
        {children}
      </div>
    </AppMessagesProvider>
  )
}

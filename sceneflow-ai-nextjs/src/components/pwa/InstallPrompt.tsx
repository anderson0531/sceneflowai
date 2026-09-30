'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AppInstallCard } from '@/components/pwa/AppInstallCard'

/** Signed-in app routes. The card uses z-[120] so it paints above the phone companion. */
export default function InstallPrompt() {
  const { status } = useSession()
  const pathname = usePathname()

  return <AppInstallCard surface="banner" authStatus={status} pathname={pathname} />
}
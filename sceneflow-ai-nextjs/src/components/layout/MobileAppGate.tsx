'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Monitor, Smartphone } from 'lucide-react'
import { useIsDesktopOrTablet } from '@/hooks/useScreenSize'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import { MobileCompanion } from '@/components/mobile/MobileCompanion'
import { AppInstallCard } from '@/components/pwa/AppInstallCard'

interface MobileAppGateProps {
  children: React.ReactNode
  translateControl?: React.ReactNode
}

function PhoneLoader() {
  const t = useTranslations('common.status')
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950 text-slate-300">
      <p className="text-sm">{t('loading')}</p>
    </div>
  )
}

function PhoneSignIn() {
  const t = useTranslations('common.companion')
  const tNav = useTranslations('common.nav')
  const pathname = usePathname() || '/dashboard'
  const loginHref = getLoginUrl({ returnUrl: pathname })

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex items-center justify-center gap-3 text-cyan-400">
          <Smartphone className="h-8 w-8" />
          <Monitor className="h-8 w-8 opacity-40" />
        </div>
        <h1 className="text-2xl font-semibold">{t('brand')}</h1>
        <h2 className="mt-4 text-lg font-medium">{t('signInTitle')}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{t('signInBody')}</p>
        <a
          href={loginHref}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-cyan-500 px-6 text-sm font-semibold text-slate-950"
        >
          {tNav('signIn')}
        </a>
        <div className="mt-6 text-left">
          <AppInstallCard surface="phone-sign-in" authStatus="unauthenticated" pathname={pathname} />
        </div>
      </div>
    </div>
  )
}

/**
 * Phones never mount the studio. Width is unknown during SSR, so the first
 * paint is a loader instead of the desktop workspace.
 */
export function MobileAppGate({ children, translateControl }: MobileAppGateProps) {
  const isDesktop = useIsDesktopOrTablet()
  const { status } = useSession()

  if (isDesktop === null || (isDesktop === false && status === 'loading')) {
    return <PhoneLoader />
  }

  if (isDesktop) {
    return (
      <>
        {children}
        {translateControl}
      </>
    )
  }

  if (status !== 'authenticated') {
    return <PhoneSignIn />
  }

  return <MobileCompanion />
}

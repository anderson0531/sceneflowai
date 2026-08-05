'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Settings,
  Shield,
  CreditCard,
  Users,
  Bell,
  Database,
  Zap,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { isAdminEmail } from '@/lib/adminUtils'
import { ProductPageShell, ProductPageHeader } from '@/components/product'

/** Labels come from the catalog; only structure lives here. */
const baseSettingsNavItems = [
  { key: 'profile', href: '/dashboard/settings/profile', icon: Users },
  { key: 'integrations', href: '/dashboard/settings/integrations', icon: Zap },
  { key: 'security', href: '/dashboard/settings/security', icon: Shield },
  { key: 'billing', href: '/dashboard/settings/billing', icon: CreditCard },
  { key: 'notifications', href: '/dashboard/settings/notifications', icon: Bell },
  { key: 'data', href: '/dashboard/settings/data', icon: Database },
] as const

export function SettingsLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const t = useTranslations('settings')

  const settingsNavItems = useMemo(() => {
    const items: Array<{ key: string; href: string; icon: typeof Users }> = [
      ...baseSettingsNavItems,
    ]

    if (session?.user?.email && isAdminEmail(session.user.email)) {
      items.push({ key: 'admin', href: '/dashboard/settings/admin', icon: Shield })
    }

    return items
  }, [session?.user?.email])

  return (
    <ProductPageShell>
      <ProductPageHeader
        icon={<Settings className="h-5 w-5" />}
        title={t('shell.title')}
        subtitle={t('shell.subtitle')}
        accent="product"
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:w-80 shrink-0"
        >
          <div className="rounded-xl border border-gray-700/60 bg-gray-800/60 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-lg font-semibold text-white">{t('shell.sectionsHeading')}</h2>

            <nav className="space-y-2">
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`block rounded-lg p-3 transition-colors duration-200 ${
                      isActive
                        ? 'border-e-2 border-sf-primary bg-gray-900/80 text-white'
                        : 'text-gray-400 hover:bg-gray-900/50 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`h-5 w-5 ${isActive ? 'text-sf-primary' : 'text-gray-500'}`}
                      />
                      <div className="flex-1">
                        <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-200'}`}>
                          {t(`nav.${item.key}`)}
                        </div>
                        <div className={`text-sm ${isActive ? 'text-sf-primary' : 'text-gray-500'}`}>
                          {t(`nav.${item.key}Description`)}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-6 border-t border-gray-700/60 pt-6">
              <h3 className="mb-3 text-sm font-medium text-gray-300">{t('shell.quickActions')}</h3>
              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  className="block rounded p-2 text-sm text-gray-400 transition-colors hover:bg-gray-900/50 hover:text-white"
                >
                  ← {t('shell.backToDashboard')}
                </Link>
                <Link
                  href="/dashboard/workflow"
                  className="block rounded p-2 text-sm text-gray-400 transition-colors hover:bg-gray-900/50 hover:text-white"
                >
                  {t('shell.continueWorkflow')}
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1"
        >
          {children}
        </motion.div>
      </div>
    </ProductPageShell>
  )
}

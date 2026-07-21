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
import { isAdminEmail } from '@/lib/adminUtils'
import { ProductPageShell, ProductPageHeader } from '@/components/product'

const baseSettingsNavItems = [
  {
    name: 'Profile',
    href: '/dashboard/settings/profile',
    icon: Users,
    description: 'Manage your account information',
  },
  {
    name: 'Integrations',
    href: '/dashboard/settings/integrations',
    icon: Zap,
    description: 'Connect AI providers and external services',
  },
  {
    name: 'Security',
    href: '/dashboard/settings/security',
    icon: Shield,
    description: 'Password and security settings',
  },
  {
    name: 'Billing',
    href: '/dashboard/settings/billing',
    icon: CreditCard,
    description: 'Manage your subscription and billing',
  },
  {
    name: 'Notifications',
    href: '/dashboard/settings/notifications',
    icon: Bell,
    description: 'Email and push notification preferences',
  },
  {
    name: 'Data & Privacy',
    href: '/dashboard/settings/data',
    icon: Database,
    description: 'Data export and privacy controls',
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const settingsNavItems = useMemo(() => {
    const items = [...baseSettingsNavItems]

    if (session?.user?.email && isAdminEmail(session.user.email)) {
      items.push({
        name: 'Admin',
        href: '/dashboard/settings/admin',
        icon: Shield,
        description: 'Admin functions and controls',
      })
    }

    return items
  }, [session?.user?.email])

  return (
    <ProductPageShell>
      <ProductPageHeader
        icon={<Settings className="h-5 w-5" />}
        title="Account Settings"
        subtitle="Manage your account, integrations, and preferences"
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
            <h2 className="mb-4 text-lg font-semibold text-white">Settings</h2>

            <nav className="space-y-2">
              {settingsNavItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block rounded-lg p-3 transition-colors duration-200 ${
                      isActive
                        ? 'border-r-2 border-sf-primary bg-gray-900/80 text-white'
                        : 'text-gray-400 hover:bg-gray-900/50 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`h-5 w-5 ${isActive ? 'text-sf-primary' : 'text-gray-500'}`}
                      />
                      <div className="flex-1">
                        <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-200'}`}>
                          {item.name}
                        </div>
                        <div className={`text-sm ${isActive ? 'text-sf-primary' : 'text-gray-500'}`}>
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-6 border-t border-gray-700/60 pt-6">
              <h3 className="mb-3 text-sm font-medium text-gray-300">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  className="block rounded p-2 text-sm text-gray-400 transition-colors hover:bg-gray-900/50 hover:text-white"
                >
                  ← Back to Dashboard
                </Link>
                <Link
                  href="/dashboard/workflow"
                  className="block rounded p-2 text-sm text-gray-400 transition-colors hover:bg-gray-900/50 hover:text-white"
                >
                  Continue Workflow
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

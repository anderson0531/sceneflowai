'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, FolderOpen, Library, CreditCard, Settings } from 'lucide-react'

const actions = [
  {
    label: 'New project',
    description: 'Start a film or episode',
    href: '/dashboard/studio/new-project',
    icon: Plus,
    primary: true,
  },
  {
    label: 'Projects',
    description: 'Browse all work',
    href: '/dashboard/projects',
    icon: FolderOpen,
  },
  {
    label: 'Series',
    description: 'Multi-episode shows',
    href: '/dashboard/series',
    icon: Library,
  },
  {
    label: 'Billing',
    description: 'Credits & plan',
    href: '/dashboard/settings/billing',
    icon: CreditCard,
  },
  {
    label: 'Settings',
    description: 'Account & integrations',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardQuickStart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
      className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/60 p-5"
    >
      <h2 className="text-sm font-semibold text-white mb-3">Quick start</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href}>
              <div
                className={`
                  flex flex-col gap-1.5 p-3 rounded-lg border transition-all h-full
                  ${
                    action.primary
                      ? 'bg-gradient-to-br from-indigo-600/30 to-purple-600/20 border-indigo-500/40 hover:border-indigo-400/60'
                      : 'bg-gray-900/40 border-gray-700/50 hover:border-gray-600 hover:bg-gray-700/30'
                  }
                `}
              >
                <Icon
                  className={`w-4 h-4 ${action.primary ? 'text-indigo-300' : 'text-gray-400'}`}
                />
                <span className="text-sm font-medium text-white">{action.label}</span>
                <span className="text-[10px] text-gray-500 leading-tight">{action.description}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </motion.div>
  )
}

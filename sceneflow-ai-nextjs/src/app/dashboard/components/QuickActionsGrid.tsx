'use client'

import { motion } from 'framer-motion'
import { Plus, BookOpen, Cloud, Key, CreditCard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

const quickActions = [
  { 
    label: 'New Project', 
    icon: <Plus className="w-5 h-5" />, 
    href: '/dashboard/studio/new-project',
    color: 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
  },
  { 
    label: 'Series Bibles', 
    icon: <BookOpen className="w-5 h-5" />, 
    href: '/dashboard/series-bibles',
    color: 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
  },
  { 
    label: 'Asset Library', 
    icon: <Cloud className="w-5 h-5" />, 
    href: '/dashboard/asset-library',
    color: 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
  },
  { 
    label: 'BYOK Config', 
    icon: <Key className="w-5 h-5" />, 
    href: '/dashboard/settings/byok',
    color: 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
  },
  { 
    label: 'Buy Credits', 
    icon: <CreditCard className="w-5 h-5" />, 
    href: '/dashboard/settings/billing',
    color: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
  },
  { 
    label: 'Settings', 
    icon: <Settings className="w-5 h-5" />, 
    href: '/dashboard/settings',
    color: 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
  },
]

export function QuickActionsGrid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-white">⚡ Quick Actions</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action, index) => (
          <Link key={index} href={action.href}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer ${action.color}`}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}

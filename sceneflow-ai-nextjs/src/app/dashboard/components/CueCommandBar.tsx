'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Plus, 
  FolderOpen, 
  CreditCard, 
  Settings,
  Sparkles
} from 'lucide-react'

/**
 * CueCommandBar - Compact Welcome Header with Integrated Quick Actions
 * 
 * 2026 Design: Hyper-Personalized Adaptive Layout
 * - Reduced vertical height
 * - Quick actions inline
 * - Glassmorphism effect
 */

const quickActions = [
  { 
    label: 'New Project', 
    icon: Plus, 
    href: '/dashboard/studio/new-project',
    primary: true
  },
  { 
    label: 'Projects', 
    icon: FolderOpen, 
    href: '/dashboard/projects'
  },
  { 
    label: 'Credits', 
    icon: CreditCard, 
    href: '/dashboard/settings/billing'
  },
  { 
    label: 'Settings', 
    icon: Settings, 
    href: '/dashboard/settings'
  },
]

export function CueCommandBar() {
  const { data: session } = useSession()
  
  // Get user's first name from session
  const userName = useMemo(() => {
    const name = session?.user?.name
    const email = session?.user?.email
    
    if (name && name.includes(' ')) {
      return name.split(' ')[0]
    }
    
    const emailPrefix = email?.split('@')[0]
    if (name && name === emailPrefix) {
      const knownUsers: Record<string, string> = {
        'anderson0531': 'Brian',
      }
      if (knownUsers[name]) {
        return knownUsers[name]
      }
    }
    
    if (name) {
      return name.split(' ')[0]
    }
    
    return 'there'
  }, [session?.user?.name, session?.user?.email])

  // Get user initials for avatar
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800/60 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-lg px-5 py-3"
    >
      <div className="flex items-center justify-between">
        {/* Left: Avatar + Welcome */}
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
            {userInitial}
          </div>
          
          {/* Welcome Text */}
          <div>
            <h2 className="text-base font-medium text-white">
              Welcome back, <span className="text-indigo-400 font-semibold">{userName}</span>
            </h2>
            <p className="text-xs text-gray-400">
              What would you like to create today?
            </p>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                  transition-all duration-200
                  ${action.primary 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

export default CueCommandBar

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Settings, 
  Shield, 
  CreditCard, 
  Users, 
  Bell,
  Database,
  Key,
  Zap
} from 'lucide-react'

const settingsNavItems = [
  {
    name: 'Profile',
    href: '/dashboard/settings/profile',
    icon: Users,
    description: 'Manage your account information'
  },
  {
    name: 'Integrations',
    href: '/dashboard/settings/integrations',
    icon: Zap,
    description: 'Connect AI providers and external services'
  },
  {
    name: 'Security',
    href: '/dashboard/settings/security',
    icon: Shield,
    description: 'Password and security settings'
  },
  {
    name: 'Billing',
    href: '/dashboard/settings/billing',
    icon: CreditCard,
    description: 'Manage your subscription and billing'
  },
  {
    name: 'Notifications',
    href: '/dashboard/settings/notifications',
    icon: Bell,
    description: 'Email and push notification preferences'
  },
  {
    name: 'Data & Privacy',
    href: '/dashboard/settings/data',
    icon: Database,
    description: 'Data export and privacy controls'
  }
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-dark-bg">
      
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Settings Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-sf-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Account Settings</h1>
          </div>
          <p className="text-gray-400">Manage your account, integrations, and preferences</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:w-80 flex-shrink-0"
          >
            <div className="bg-dark-card rounded-xl border border-dark-border p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Settings</h2>
              
              <nav className="space-y-2">
                {settingsNavItems.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`block p-3 rounded-lg transition-colors duration-200 ${
                        isActive
                          ? 'bg-dark-bg border-r-2 border-sf-primary text-white'
                          : 'text-dark-text-secondary hover:bg-dark-bg'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${
                          isActive ? 'text-sf-primary' : 'text-dark-text-secondary'
                        }`} />
                        <div className="flex-1">
                          <div className={`font-medium ${
                            isActive ? 'text-white' : 'text-dark-text'
                          }`}>
                            {item.name}
                          </div>
                          <div className={`text-sm ${
                            isActive ? 'text-sf-primary' : 'text-dark-text-secondary'
                          }`}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </nav>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-dark-border">
                <h3 className="text-sm font-medium text-dark-text mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/dashboard"
                    className="block p-2 text-sm text-dark-text-secondary hover:text-dark-text hover:bg-dark-bg rounded transition-colors duration-200"
                  >
                    ← Back to Dashboard
                  </Link>
                  <Link
                    href="/dashboard/workflow"
                    className="block p-2 text-sm text-dark-text-secondary hover:text-dark-text hover:bg-dark-bg rounded transition-colors duration-200"
                  >
                    Continue Workflow
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Settings, Key, User, CreditCard, Shield, Bell, Palette } from 'lucide-react'
import { useStore } from '@/store/useStore'

const settingsSections = [
  {
    name: 'BYOK Settings',
    description: 'Configure your own API keys for AI services',
    href: '/dashboard/settings/byok',
    icon: Key,
    status: 'configured', // Will be dynamic based on actual configuration
    color: 'blue'
  },
  {
    name: 'Profile',
    description: 'Manage your account information and preferences',
    href: '/dashboard/settings/profile',
    icon: User,
    status: 'available',
    color: 'green'
  },
  {
    name: 'Billing & Credits',
    description: 'Manage your subscription and credit balance',
    href: '/dashboard/settings/billing',
    icon: CreditCard,
    status: 'available',
    color: 'purple'
  },
  {
    name: 'Security',
    description: 'Two-factor authentication and security settings',
    href: '/dashboard/settings/security',
    icon: Shield,
    status: 'coming-soon',
    color: 'orange'
  },
  {
    name: 'Notifications',
    description: 'Configure email and push notifications',
    href: '/dashboard/settings/notifications',
    icon: Bell,
    status: 'coming-soon',
    color: 'yellow'
  },
  {
    name: 'Appearance',
    description: 'Customize themes and display preferences',
    href: '/dashboard/settings/appearance',
    icon: Palette,
    status: 'available',
    color: 'indigo'
  }
]

export default function SettingsPage() {
  const { byokSettings } = useStore()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured':
        return 'text-green-600 bg-green-100'
      case 'available':
        return 'text-blue-600 bg-blue-100'
      case 'coming-soon':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'configured':
        return 'Configured'
      case 'available':
        return 'Available'
      case 'coming-soon':
        return 'Coming Soon'
      default:
        return 'Available'
    }
  }

  const isBYOKConfigured = Object.values(byokSettings).some(provider => provider.isConfigured)

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your account, preferences, and security settings
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsSections.map((section) => {
          const Icon = section.icon
          const isConfigured = section.name === 'BYOK Settings' ? isBYOKConfigured : section.status === 'configured'
          const status = isConfigured ? 'configured' : section.status
          
          return (
            <Link key={section.name} href={section.href}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 bg-${section.color}-100 rounded-lg flex items-center justify-center group-hover:bg-${section.color}-200 transition-colors duration-200`}>
                      <Icon className={`w-6 h-6 text-${section.color}-600`} />
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                      {getStatusText(status)}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{section.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {section.name === 'BYOK Settings' && isBYOKConfigured && (
                    <div className="text-sm text-green-600 font-medium">
                      ✓ API keys configured
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Quick Actions</CardTitle>
          <CardDescription className="text-blue-700">
            Common settings you might need
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/settings/byok">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium">
                Configure BYOK
              </button>
            </Link>
            <Link href="/dashboard/settings/profile">
              <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm font-medium">
                Update Profile
              </button>
            </Link>
            <Link href="/dashboard/settings/billing">
              <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm font-medium">
                Manage Billing
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

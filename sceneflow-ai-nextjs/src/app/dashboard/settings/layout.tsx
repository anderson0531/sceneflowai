import Link from 'next/link'
import { Settings, Key, User, CreditCard } from 'lucide-react'

const settingsNav = [
  { name: 'Profile', href: '/dashboard/settings/profile', icon: User },
  { name: 'BYOK Settings', href: '/dashboard/settings/byok', icon: Key },
  { name: 'Billing & Credits', href: '/dashboard/settings/billing', icon: CreditCard },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-8">
        {/* Settings Navigation */}
        <aside className="w-64 flex-shrink-0">
          <div className="sticky top-6">
                          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </h2>
            <nav className="space-y-1">
              {settingsNav.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Settings Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

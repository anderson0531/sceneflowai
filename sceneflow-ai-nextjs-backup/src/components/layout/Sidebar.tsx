'use client'

import { useStore } from '@/store/useStore'
import { 
  Home, 
  FolderOpen, 
  Plus, 
  Lightbulb, 
  Settings, 
  Key,
  User,
  CreditCard,
  Sparkles,
  Layout,
  Camera,
  Film,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'New Project', href: '/dashboard/projects/new', icon: Plus },
  { name: 'Ideas', href: '/dashboard/ideas', icon: Lightbulb },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const workflowNav = [
  { 
    name: 'The Spark Studio', 
    href: '/dashboard/workflow/ideation', 
    icon: Sparkles,
    description: 'Ideation & Brainstorming',
    step: 'ideation'
  },
  { 
    name: 'Vision Board', 
    href: '/dashboard/workflow/storyboard', 
    icon: Layout,
    description: 'Storyboard & Planning',
    step: 'storyboard'
  },
  { 
    name: 'The Director\'s Chair', 
    href: '/dashboard/workflow/scene-direction', 
    icon: Camera,
    description: 'Scene Direction & Control',
    step: 'scene-direction'
  },
  { 
    name: 'The Screening Room', 
    href: '/dashboard/workflow/video-generation', 
    icon: Film,
    description: 'Video Generation & Review',
    step: 'video-generation'
  },
]

const settingsNav = [
  { name: 'Profile', href: '/dashboard/settings/profile', icon: User },
  { name: 'BYOK Settings', href: '/dashboard/settings/byok', icon: Key },
  { name: 'Billing & Credits', href: '/dashboard/settings/billing', icon: CreditCard },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, user, currentStep } = useStore()
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href
  const isCurrentStep = (step: string) => currentStep === step

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SF</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">SceneFlow AI</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info & Credits */}
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
                <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-medium text-blue-900">
                  {user.credits} Credits
                </span>
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Main
              </h3>
              <nav className="space-y-1 mb-6">
                {mainNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href) ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              {/* Workflow Navigation */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Workflow
              </h3>
              <nav className="space-y-1 mb-6">
                {workflowNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href) ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' : isCurrentStep(item.step) ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium transition-colors">
                          {item.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </nav>

              {/* Settings Navigation */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Settings
              </h3>
              <nav className="space-y-1">
                {settingsNav.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href) ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">SceneFlow AI v1.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

'use client'

import { useEnhancedStore } from '@/store/enhancedStore'
import { 
  Home, 
  FolderOpen, 
  Plus, 
  FileText,
  Settings, 
  Key,
  User,
  CreditCard,
  Sparkles,
  Layout,
  Camera,
  Film,
  Menu,
  X,
  BookOpen
} from 'lucide-react'
import { CheckCircle, Wrench } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Spark Studio', href: '/studio/crispr-debate-001', icon: Sparkles },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const workflowNav = [
  { 
    name: 'The Spark Studio', 
    href: '/studio/crispr-debate-001', 
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
    description: 'Video Generation',
    step: 'video-generation'
  },
  { 
    name: 'Quality Review', 
    href: '/dashboard/workflow/review', 
    icon: CheckCircle,
    description: 'Assess & validate quality',
    step: 'review'
  },
  { 
    name: 'Optimization', 
    href: '/dashboard/workflow/optimization', 
    icon: Wrench,
    description: 'Improve & finalize',
    step: 'optimization'
  },
]

const settingsNav = [
  { name: 'Profile', href: '/dashboard/settings/profile', icon: User },
  { name: 'BYOK Settings', href: '/dashboard/settings/byok', icon: Key },
  { name: 'Billing & Credits', href: '/dashboard/settings/billing', icon: CreditCard },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, user, currentStep } = useEnhancedStore()
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
      <div className={`fixed inset-y-0 left-0 z-50 w-64 navigation-bar transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-sf-border">
            <div className="flex-1"></div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 rounded-md text-sf-text-secondary hover:text-sf-text-primary hover:bg-sf-surface-light"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info & Credits */}
          {user && (
            <div className="p-4 border-b border-sf-border">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-sf-primary rounded-full flex items-center justify-center">
                  <span className="text-sf-background font-medium text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-heading">{user.name}</p>
                  <p className="text-xs text-caption">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-sf-surface-light rounded-lg">
                <div className="w-4 h-4 bg-sf-primary rounded-full"></div>
                <span className="text-sm font-medium text-sf-primary font-emphasis">
                  {user.credits} Credits
                </span>
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="nav-section-header mb-3">
                Main
              </h3>
              <nav className="space-y-1 mb-6">
                {mainNav.map((item) => {
                  const Icon = item.icon
                  const isActiveItem = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 font-emphasis ${
                        isActiveItem 
                          ? 'nav-link-active nav-active-indicator-right' 
                          : 'nav-link nav-item-hover'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActiveItem ? 'text-sf-primary' : 'text-sf-text-secondary'}`} />
                      <span className={isActiveItem ? 'text-sf-primary' : 'text-sf-text-secondary'}>
                        {item.name}
                      </span>
                    </Link>
                  )
                })}
              </nav>

              {/* Workflow Navigation */}
              <h3 className="nav-section-header mb-3">
                Workflow
              </h3>
              <nav className="space-y-1 mb-6">
                {workflowNav.map((item) => {
                  const Icon = item.icon
                  const isActiveItem = isActive(item.href) || isCurrentStep(item.step)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 font-emphasis ${
                        isActiveItem 
                          ? 'nav-link-active nav-active-indicator-left' 
                          : 'nav-link nav-item-hover'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActiveItem ? 'text-sf-primary' : 'text-sf-text-secondary'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium transition-colors ${isActiveItem ? 'text-sf-primary' : 'text-sf-text-secondary'}`}>
                          {item.name}
                        </div>
                        <div className={`text-xs transition-colors mt-0.5 ${isActiveItem ? 'text-sf-accent' : 'text-caption'}`}>
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </nav>

              {/* Settings Navigation */}
              <h3 className="nav-section-header mb-3">
                Settings
              </h3>
              <nav className="space-y-1">
                {settingsNav.map((item) => {
                  const Icon = item.icon
                  const isActiveItem = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 font-emphasis ${
                        isActiveItem 
                          ? 'nav-link-active nav-active-indicator-right' 
                          : 'nav-link nav-item-hover'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActiveItem ? 'text-sf-primary' : 'text-sf-text-secondary'}`} />
                      <span className={isActiveItem ? 'text-sf-primary' : 'text-sf-text-secondary'}>
                        {item.name}
                      </span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-sf-border">
            <div className="text-center">
              <p className="text-xs text-caption">SceneFlow AI v1.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

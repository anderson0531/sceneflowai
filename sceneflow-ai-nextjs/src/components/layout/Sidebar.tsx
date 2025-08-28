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
  BookOpen,
  CheckCircle,
  Wrench
} from 'lucide-react'
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
    step: 'ideation',
    phase: 1,
    credits: 'Uses Analysis Credits'
  },
  { 
    name: 'Vision Board', 
    href: '/dashboard/workflow/storyboard', 
    icon: Layout,
    description: 'Storyboard & Planning',
    step: 'storyboard',
    phase: 1,
    credits: 'Uses Analysis Credits'
  },
  { 
    name: 'The Director\'s Chair', 
    href: '/dashboard/workflow/scene-direction', 
    icon: Camera,
    description: 'Scene Direction & Control',
    step: 'scene-direction',
    phase: 1,
    credits: 'Uses Analysis Credits'
  },
  { 
    name: 'Video Generation', 
    href: '/dashboard/workflow/video-generation', 
    icon: Film,
    description: 'AI Video Generation',
    step: 'video-generation',
    phase: 2,
    credits: '🔑 BYOK Required'
  },
  { 
    name: 'Quality Review', 
    href: '/dashboard/workflow/review', 
    icon: CheckCircle,
    description: 'Assess & validate quality',
    step: 'review',
    phase: 2,
    credits: '🔑 BYOK Required'
  },
  { 
    name: 'Optimization', 
    href: '/dashboard/workflow/optimization', 
    icon: Wrench,
    description: 'Improve & finalize',
    step: 'optimization',
    phase: 2,
    credits: '🔑 BYOK Required'
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

  // Group workflow steps by phase
  const phase1Steps = workflowNav.filter(item => item.phase === 1)
  const phase2Steps = workflowNav.filter(item => item.phase === 2)

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
      <div className={`fixed inset-y-0 left-0 z-50 w-80 navigation-bar transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-gray-800/30">
            <div className="flex-1"></div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Info & Credits */}
          {user && (
            <div className="p-6 border-b border-gray-700/50 bg-gray-800/30">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-sf-primary rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-base font-bold text-white">{user.name}</p>
                  <p className="text-sm text-gray-300">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 px-4 py-3 bg-sf-primary/10 rounded-xl border border-sf-primary/20">
                <div className="w-5 h-5 bg-sf-primary rounded-full shadow-sm"></div>
                <span className="text-base font-semibold text-sf-primary">
                  {user.credits} Credits
                </span>
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="nav-section-header mb-4 text-base font-bold text-gray-300 tracking-wide">
                MAIN
              </h3>
              <nav className="space-y-2 mb-8">
                {mainNav.map((item) => {
                  const Icon = item.icon
                  const isActiveItem = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                        isActiveItem 
                          ? 'bg-sf-primary/15 text-white border-l-4 border-sf-primary shadow-lg' 
                          : 'text-gray-200 hover:text-white hover:bg-gray-800/50 hover:translate-x-1'
                      }`}
                    >
                      <Icon className={`mr-4 h-6 w-6 ${isActiveItem ? 'text-sf-primary' : 'text-gray-400'}`} />
                      <span className={isActiveItem ? 'text-white' : 'text-gray-200'}>
                        {item.name}
                      </span>
                    </Link>
                  )
                })}
              </nav>

              {/* Phase 1: Pre-Production Suite */}
              <div className="mb-8">
                <h3 className="nav-section-header mb-4 text-base font-bold text-blue-300 tracking-wide">
                  PHASE 1: PRE-PRODUCTION SUITE
                </h3>
                <p className="text-xs text-blue-200 mb-3 px-4">
                  Uses Analysis Credits
                </p>
                <nav className="space-y-2 mb-4">
                  {phase1Steps.map((item) => {
                    const Icon = item.icon
                    const isActiveItem = isActive(item.href) || isCurrentStep(item.step)
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                          isActiveItem 
                            ? 'bg-blue-500/15 text-white border-l-4 border-blue-500 shadow-lg' 
                            : 'text-gray-200 hover:text-white hover:bg-gray-800/50 hover:translate-x-1'
                        }`}
                      >
                        <Icon className={`mr-4 h-6 w-6 ${isActiveItem ? 'text-blue-400' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-base font-semibold transition-colors leading-tight ${isActiveItem ? 'text-white' : 'text-gray-200'}`}>
                            {item.name}
                          </div>
                          <div className={`text-sm transition-colors mt-1 text-gray-400 leading-tight ${isActiveItem ? 'text-blue-400/80' : 'text-gray-400'}`}>
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </nav>
                

              </div>

              {/* Phase 2: Generation & Post */}
              <div className="mb-8">
                <h3 className="nav-section-header mb-4 text-base font-bold text-orange-300 tracking-wide">
                  PHASE 2: GENERATION & POST
                </h3>
                <p className="text-xs text-orange-200 mb-3 px-4">
                  🔑 BYOK Required
                </p>
                <nav className="space-y-2">
                  {phase2Steps.map((item) => {
                    const Icon = item.icon
                    const isActiveItem = isActive(item.href) || isCurrentStep(item.step)
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                          isActiveItem 
                            ? 'bg-orange-500/15 text-white border-l-4 border-orange-500 shadow-lg' 
                            : 'text-gray-200 hover:text-white hover:bg-gray-800/50 hover:translate-x-1'
                        }`}
                      >
                        <Icon className={`mr-4 h-6 w-6 ${isActiveItem ? 'text-orange-400' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-base font-semibold transition-colors leading-tight ${isActiveItem ? 'text-white' : 'text-gray-200'}`}>
                            {item.name}
                          </div>
                          <div className={`text-sm transition-colors mt-1 text-gray-400 leading-tight ${isActiveItem ? 'text-orange-400/80' : 'text-gray-400'}`}>
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Settings Navigation */}
              <h3 className="nav-section-header mb-4 text-base font-bold text-gray-300 tracking-wide">
                SETTINGS
              </h3>
              <nav className="space-y-2">
                {settingsNav.map((item) => {
                  const Icon = item.icon
                  const isActiveItem = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                        isActiveItem 
                          ? 'bg-sf-primary/15 text-white border-l-4 border-sf-primary shadow-lg' 
                          : 'text-gray-200 hover:text-white hover:bg-gray-800/50 hover:translate-x-1'
                      }`}
                    >
                      <Icon className={`mr-4 h-6 w-6 ${isActiveItem ? 'text-sf-primary' : 'text-gray-400'}`} />
                      <span className={isActiveItem ? 'text-white' : 'text-gray-200'}>
                        {item.name}
                      </span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
            <div className="text-center">
              <p className="text-sm text-gray-400 font-medium">SceneFlow AI v1.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

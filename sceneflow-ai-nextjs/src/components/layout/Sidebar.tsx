'use client'

import React from 'react'
import { useEnhancedStore } from '../../store/enhancedStore'
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
  Film,
  Menu,
  X,
  BookOpen,
  CheckCircle,
  Wrench
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Start Project', href: '/dashboard/studio/new-project', icon: Sparkles },
]

const workflowNav = [
  { 
    name: 'The Blueprint', 
    href: '/dashboard/studio/new-project', 
    icon: Sparkles,
    description: 'Ideation & Scripting',
    step: 'start',
    phase: 1,
    credits: 'Uses Analysis Credits'
  },
  { 
    name: 'Production Studio', 
    href: '/dashboard/workflow/vision', 
    icon: Layout,
    description: 'Script & Visual Development',
    step: 'vision',
    phase: 1,
    credits: 'Uses Analysis Credits'
  },
  { 
    name: 'Final Cut', 
    href: '/dashboard/workflow/generation', 
    icon: CheckCircle,
    description: 'Screening & Editing',
    step: 'review',
    phase: 2,
    credits: '🔑 BYOK Required'
  },
  { 
    name: 'The Premiere', 
    href: '/dashboard', 
    icon: Wrench,
    description: 'Optimization & Publishing',
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
  const { sidebarOpen, setSidebarOpen, user, currentStep, projects, currentProject } = useEnhancedStore()
  const pathname = usePathname()
  const studioHref = currentProject?.id ? `/dashboard/studio/${currentProject.id}` : '/dashboard/studio/new-project'
  const projectVisionHref = currentProject?.id ? `/dashboard/workflow/vision/${currentProject.id}` : '/dashboard/workflow/storyboard'
  
  const isActive = (href: string) => {
    if (href.startsWith('/dashboard/studio')) {
      return pathname.startsWith('/dashboard/studio')
    }
    if (href.startsWith('/dashboard/workflow/vision')) {
      return pathname.startsWith('/dashboard/workflow/vision')
    }
    if (href.startsWith('/dashboard/workflow')) {
      return pathname.startsWith(href)
    }
    return pathname === href
  }
  const isCurrentStep = (step: string) => currentStep === step
  
  // Check if there's an active project
  const hasActiveProject = projects && projects.length > 0 && projects.some(p => !p.completedSteps.includes('optimization'))
  
  // Check if a workflow step should be active
  const isWorkflowStepActive = (step: string) => {
    if (step === 'start') return true
    if (!hasActiveProject) return false
    // Allow navigation to current and previous workflow steps
    const order = ['start', 'storyboard', 'scene-direction', 'video-generation', 'review', 'optimization']
    const currentIdx = order.indexOf(currentStep)
    const stepIdx = order.indexOf(step as any)
    return stepIdx !== -1 && stepIdx <= currentIdx
  }

  // Group workflow steps by phase
  const phase1Steps = workflowNav.filter(item => item.phase === 1).map(item => {
    if (item.name === 'The Blueprint') return { ...item, href: studioHref }
    if (item.name === 'Production Studio') return { ...item, href: projectVisionHref }
    return item
  })
  const phase2Steps = workflowNav.filter(item => item.phase === 2)

  // Note: mobile/desktop initialization handled in GlobalSidebar

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
      <div className={`fixed inset-y-0 left-0 z-50 w-80 navigation-bar transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full bg-white dark:bg-gray-900/95 border-r border-gray-200 dark:border-gray-700/50">
          {/* Close button for mobile only */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30 md:hidden">
            <div className="flex-1"></div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              aria-label="Hide menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>


          {/* User Info & Credits */}
          {user && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-sf-primary rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
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
              <h3 className="nav-section-header mb-4 text-base font-bold text-gray-600 dark:text-gray-300 tracking-wide">
                MAIN
              </h3>
              <nav className="space-y-2 mb-8">
                {mainNav.map((item) => {
                  const Icon = item.icon
                  const isActiveItem = isActive(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.name === 'Start Project' ? studioHref : item.href}
                      prefetch={false}
                      className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                        isActiveItem 
                          ? 'bg-sf-primary/15 text-gray-900 dark:text-white border-l-4 border-sf-primary shadow-lg' 
                          : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:translate-x-1'
                      }`}
                    >
                      <span className={`mr-4 ${isActiveItem ? 'text-sf-primary' : 'text-gray-500 dark:text-gray-400'}`}><Icon size={24} /></span>
                      <span className={isActiveItem ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}>
                        {item.name}
                      </span>
                    </Link>
                  )
                })}
              </nav>

              {/* Phase 1: Pre-Production Suite */}
              <div className="mb-8">
                <h3 className="nav-section-header mb-4 text-base font-bold text-blue-600 dark:text-blue-300 tracking-wide">
                  PHASE 1: PRE-PRODUCTION SUITE
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-200 mb-3 px-4">
                  Uses Analysis Credits
                </p>
                <nav className="space-y-2 mb-4">
                  {phase1Steps.map((item) => {
                    const Icon = item.icon
                    const isActiveItem = isActive(item.href) || isCurrentStep(item.step)
                    const isStepEnabled = isWorkflowStepActive(item.step)
                    
                    return (
                      <Link
                        key={item.name}
                        href={isStepEnabled ? item.href : '#'}
                        prefetch={false}
                        onClick={(e) => {
                          if (!isStepEnabled) {
                            e.preventDefault()
                            // Could show a tooltip or message here
                          }
                        }}
                        className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                          isActiveItem 
                            ? 'bg-blue-500/15 text-gray-900 dark:text-white border-l-4 border-blue-500 shadow-lg' 
                            : isStepEnabled
                            ? 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:translate-x-1'
                            : 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className={`mr-4 ${isActiveItem ? 'text-blue-400' : isStepEnabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}><Icon size={24} /></span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-base font-semibold transition-colors leading-tight ${isActiveItem ? 'text-gray-900 dark:text-white' : isStepEnabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                            {item.name}
                          </div>
                          <div className={`text-sm transition-colors mt-1 leading-tight ${isActiveItem ? 'text-blue-600 dark:text-blue-400/80' : isStepEnabled ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
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
                <h3 className="nav-section-header mb-4 text-base font-bold text-orange-600 dark:text-orange-300 tracking-wide">
                  PHASE 2: GENERATION & POST
                </h3>
                <p className="text-xs text-orange-600 dark:text-orange-200 mb-3 px-4">
                  🔑 BYOK Required
                </p>
                <nav className="space-y-2">
                  {phase2Steps.map((item) => {
                    const Icon = item.icon
                    const isActiveItem = isActive(item.href) || isCurrentStep(item.step)
                    const isStepEnabled = isWorkflowStepActive(item.step)
                    
                    return (
                      <Link
                        key={item.name}
                        href={isStepEnabled ? item.href : '#'}
                        prefetch={false}
                        onClick={(e) => {
                          if (!isStepEnabled) {
                            e.preventDefault()
                            // Could show a tooltip or message here
                          }
                        }}
                        className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                          isActiveItem 
                            ? 'bg-orange-500/15 text-gray-900 dark:text-white border-l-4 border-orange-500 shadow-lg' 
                            : isStepEnabled
                            ? 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:translate-x-1'
                            : 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className={`mr-4 ${isActiveItem ? 'text-orange-400' : isStepEnabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}><Icon size={24} /></span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-base font-semibold transition-colors leading-tight ${isActiveItem ? 'text-gray-900 dark:text-white' : isStepEnabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                            {item.name}
                          </div>
                          <div className={`text-sm transition-colors mt-1 leading-tight ${isActiveItem ? 'text-orange-600 dark:text-orange-400/80' : isStepEnabled ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </nav>
              </div>

              {/* Settings Navigation */}
              <h3 className="nav-section-header mb-4 text-base font-bold text-gray-600 dark:text-gray-300 tracking-wide">
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
                      prefetch={false}
                      className={`flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                        isActiveItem 
                          ? 'bg-sf-primary/15 text-gray-900 dark:text-white border-l-4 border-sf-primary shadow-lg' 
                          : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:translate-x-1'
                      }`}
                    >
                      <span className={`mr-4 ${isActiveItem ? 'text-sf-primary' : 'text-gray-500 dark:text-gray-400'}`}><Icon size={24} /></span>
                      <span className={isActiveItem ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}>
                        {item.name}
                      </span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/30">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {`SceneFlow AI${process.env.NEXT_PUBLIC_APP_VERSION ? ` v${process.env.NEXT_PUBLIC_APP_VERSION}` : ''}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

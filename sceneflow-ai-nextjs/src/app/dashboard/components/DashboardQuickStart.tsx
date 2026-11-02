'use client'

import Link from 'next/link'
import {
  Plus,
  FileText,
  Library,
  Sparkles,
  Key,
  GraduationCap,
} from 'lucide-react'
import { STUDIO_DISPLAY_NAMES } from '@/constants/studioDisplayNames'
import { DEMO_PROJECT_ID } from '@/lib/demo/uiSandboxProject'
import { openJitHelp } from '@/components/help/JitHelpDrawer'

export interface DashboardQuickStartProps {
  onImportScript?: () => void
}

export function DashboardQuickStart({ onImportScript }: DashboardQuickStartProps = {}) {
  const actions = [
    {
      id: 'new-project',
      label: 'New Film Blueprint',
      description: 'Expand a concept or chapter into a 3-act treatment',
      href: '/dashboard/studio/new-project',
      icon: Plus,
      accent: 'indigo',
      primary: true,
    },
    {
      id: 'import-script',
      label: 'Import Script or Treatment',
      description: 'Upload a screenplay or treatment into Blueprint Room',
      onClick: onImportScript,
      href: onImportScript ? undefined : '/dashboard/studio/new-project?import=true',
      icon: FileText,
      accent: 'cyan',
    },
    {
      id: 'series-room',
      label: STUDIO_DISPLAY_NAMES.series,
      description: 'Lock cast & locations across multiple episodes',
      href: '/dashboard/series',
      icon: Library,
      accent: 'purple',
    },
    {
      id: 'sandbox-demo',
      label: 'UI Sandbox Demo',
      description: 'Explore a populated Production Stage with zero credits',
      href: `/dashboard/workflow/vision/${DEMO_PROJECT_ID}`,
      icon: Sparkles,
      accent: 'emerald',
    },
    {
      id: 'byok-keys',
      label: 'BYOK & Cloud Keys',
      description: 'Connect your own AI provider keys for direct billing',
      href: '/dashboard/settings/byok',
      icon: Key,
      accent: 'amber',
    },
    {
      id: 'studio-academy',
      label: 'Studio Academy',
      description: 'Interactive 10-minute tour & workflow playbooks',
      onClick: () => openJitHelp({ tab: 'tutorial' }),
      icon: GraduationCap,
      accent: 'blue',
    },
  ]

  const renderCardContent = (action: (typeof actions)[number]) => {
    const Icon = action.icon
    return (
      <div
        className={`
          flex items-start gap-3 p-3.5 rounded-xl border transition-all h-full text-left group
          ${
            action.primary
              ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-600/25 to-purple-600/15 hover:border-indigo-400/70'
              : 'border-gray-700/60 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/70'
          }
        `}
      >
        <div
          className={`
            w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors
            ${
              action.primary
                ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/30'
                : 'bg-gray-800 text-gray-300 group-hover:text-indigo-300 border border-gray-700/60'
            }
          `}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors">
            {action.label}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 leading-snug">
            {action.description}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-800/80 p-5 backdrop-blur-sm h-full flex flex-col justify-between shadow-lg">
      <div className="mb-3.5">
        <h2 className="text-base font-semibold text-white">Studio Launchpad</h2>
        <p className="text-xs text-gray-400 mt-0.5">Workflows, script import, and studio tools</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
        {actions.map((action) => {
          if (action.onClick) {
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="w-full h-full text-left"
              >
                {renderCardContent(action)}
              </button>
            )
          }
          return (
            <Link key={action.id} href={action.href || '/dashboard'} className="block h-full">
              {renderCardContent(action)}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

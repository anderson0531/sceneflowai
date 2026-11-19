'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Plus,
  FileText,
  Library,
  Briefcase,
  Key,
  GraduationCap,
} from 'lucide-react'
import { openJitHelp } from '@/components/help/JitHelpDrawer'

export interface DashboardQuickStartProps {
  onImportScript?: () => void
}

export function DashboardQuickStart({ onImportScript }: DashboardQuickStartProps = {}) {
  const t = useTranslations('dashboard.quickStart')

  const actions = [
    {
      id: 'new-project',
      label: t('newBlueprintTitle'),
      description: t('newBlueprintDesc'),
      href: '/dashboard/studio/new-project',
      icon: Plus,
      accent: 'indigo',
      primary: true,
    },
    {
      id: 'producer-service',
      label: t('producerServiceTitle'),
      description: t('producerServiceDesc'),
      href: '/dashboard/settings/producer?onboarding=1',
      icon: Briefcase,
      accent: 'emerald',
    },
    {
      id: 'import-script',
      label: t('importScriptTitle'),
      description: t('importScriptDesc'),
      onClick: onImportScript,
      href: onImportScript ? undefined : '/dashboard/studio/new-project?import=true',
      icon: FileText,
      accent: 'cyan',
    },
    {
      id: 'series-room',
      label: t('seriesRoomTitle'),
      description: t('seriesRoomDesc'),
      href: '/dashboard/series',
      icon: Library,
      accent: 'purple',
    },
    {
      id: 'byok-keys',
      label: t('byokTitle'),
      description: t('byokDesc'),
      href: '/dashboard/settings/byok',
      icon: Key,
      accent: 'amber',
    },
    {
      id: 'studio-academy',
      label: t('academyTitle'),
      description: t('academyDesc'),
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
        <h2 className="text-base font-semibold text-white">{t('title')}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{t('subtitle')}</p>
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

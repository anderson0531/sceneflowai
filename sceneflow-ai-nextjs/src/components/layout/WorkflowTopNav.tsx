'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEnhancedStore } from '@/store/enhancedStore'

const steps = (
  projectId: string | undefined
): Array<{ key: string; label: string; href: string }> => [
  { key: 'blueprint', label: 'Blueprint', href: '/dashboard/studio/new-project' },
  { key: 'vision', label: 'Vision', href: `/projects/${projectId || 'current'}/vision` },
  { key: 'action', label: 'Action Plan', href: '/dashboard/workflow/scene-direction' },
  { key: 'creation', label: 'Creation Hub', href: '/dashboard/workflow/video-generation' },
  { key: 'polish', label: 'Polish', href: '/dashboard/workflow/generation' },
  { key: 'launch', label: 'Launchpad', href: '/dashboard' },
]

export default function WorkflowTopNav() {
  const pathname = usePathname()
  const { currentProject } = useEnhancedStore()
  const projectId = currentProject?.id
  const links = steps(projectId)
  return (
    <div className="sticky top-16 z-40 bg-sf-surface/70 backdrop-blur border-b border-sf-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-2 py-2 overflow-x-auto justify-center">
          {links.map((s) => {
            const active = pathname?.startsWith(s.href)
            return (
              <Link
                key={s.key}
                href={s.href}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${active ? 'bg-sf-primary/20 text-white border border-sf-primary/40' : 'text-sf-text-secondary hover:text-white hover:bg-sf-surface-light'}`}
              >
                {s.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}



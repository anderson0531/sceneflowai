'use client'

import React, { useMemo } from 'react'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { episodeNav } from '../../config/nav/episodeNav'
import { seriesNav } from '../../config/nav/seriesNav'
import { mainNav, settingsNav } from '../../config/nav/globalNav'
import { useStore } from '../../store/useStore'

function useBYOKReady() {
  const byok = useStore(s => s.byokSettings)
  return !!byok?.videoGenerationProvider?.isConfigured
}

function usePhaseLocks(seriesId?: string, episodeId?: string) {
  return useMemo(() => {
    if (!seriesId || !episodeId) return {} as Record<number, { locked: boolean }>
    try {
      const key = `sf_phaseLocks:${seriesId}:${episodeId}`
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }, [seriesId, episodeId])
}

function useLegacyWorkflow(pathname: string) {
  const currentProject = useStore(s => s.currentProject)
  const studioHref = currentProject?.id ? `/dashboard/studio/${currentProject.id}` : '/dashboard/studio/new-project'
  const projectVisionHref = currentProject?.id ? `/projects/${currentProject.id}/vision` : '/dashboard/workflow/storyboard'
  const items = [
    { key: 'start', label: 'The Blueprint', href: studioHref },
    { key: 'vision', label: 'Vision', href: projectVisionHref },
    { key: 'direction', label: 'Action Plan', href: '/dashboard/workflow/scene-direction' },
    { key: 'video', label: 'Creation Hub', href: '/dashboard/workflow/video-generation' },
    { key: 'review', label: 'Polish', href: '/dashboard/workflow/review' },
    { key: 'opt', label: 'Launchpad', href: '/dashboard/workflow/optimization' },
  ]
  return { items }
}

export function GlobalSidebar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const params = useParams() as any
  const seriesId = params?.seriesId as string | undefined
  const episodeId = params?.episodeId as string | undefined
  const byokReady = useBYOKReady()
  const phaseLocks = usePhaseLocks(seriesId, episodeId)

  let flowItems: Array<{ key:string; label:string; href:string; requires?: number[]; byok?: boolean }> = []
  if (seriesId && episodeId) flowItems = episodeNav(seriesId, episodeId)
  else if (seriesId) flowItems = seriesNav(seriesId)
  else flowItems = useLegacyWorkflow(pathname).items

  return (
    <div className="flex">
      <aside className="w-64 shrink-0 border-r border-gray-800 bg-gray-950/90">
        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">MAIN</h3>
            <div className="space-y-1">
              {mainNav.map(i => (
                <Link key={i.key} href={i.href} className={`block px-3 py-2 rounded hover:bg-gray-800 ${pathname===i.href?'bg-gray-800 text-white':'text-gray-300'}`}>{i.label}</Link>
              ))}
            </div>
          </section>

          {flowItems.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 mb-2">WORKFLOW</h3>
              <div className="space-y-1">
                {flowItems.map(i => {
                  const unmet = (i.requires || []).some(p => !(phaseLocks as any)[p]?.locked)
                  const blocked = unmet || (i.byok && !byokReady)
                  const className = `block px-3 py-2 rounded ${pathname===i.href?'bg-gray-800 text-white':'text-gray-300 hover:bg-gray-800'} ${blocked?'opacity-60 cursor-not-allowed':''}`
                  const content = (
                    <span className="flex items-center gap-2">
                      <span>{i.label}</span>
                      {i.byok && !byokReady && <span className="text-[10px] px-1 rounded bg-orange-500/20 text-orange-300">BYOK</span>}
                      {unmet && <span className="text-[10px] px-1 rounded bg-blue-500/20 text-blue-300">Locked</span>}
                    </span>
                  )
                  return blocked ? (
                    <span key={i.key} className={className} title={!byokReady && i.byok ? 'Bring Your Own Key required' : 'Complete earlier phases first'}>{content}</span>
                  ) : (
                    <Link key={i.key} href={i.href} prefetch={false} className={className}>{content}</Link>
                  )
                })}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">SETTINGS</h3>
            <div className="space-y-1">
              {settingsNav.map(i => (
                <Link key={i.key} href={i.href} className={`block px-3 py-2 rounded hover:bg-gray-800 ${pathname===i.href?'bg-gray-800 text-white':'text-gray-300'}`}>{i.label}</Link>
              ))}
            </div>
          </section>
        </div>
      </aside>
      <main className="flex-1 min-h-screen">{children}</main>
      </div>
  )
}

export default GlobalSidebar

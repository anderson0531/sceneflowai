'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, Check, ChevronDown, Layers, User } from 'lucide-react'
import {
  getActiveWorkspaceOwnerId,
  setActiveWorkspaceOwnerId,
  subscribeActiveWorkspace,
} from '@/lib/producer/activeWorkspaceClient'

interface WorkspaceContextOption {
  ownerUserId: string
  label: string
  role: 'owner' | 'admin' | 'project_manager' | 'qa_reviewer'
  roleLabel: string
  isPersonal: boolean
  primaryColor?: string
  monthlyCreditLimit?: number | null
  creditsUsedMonth?: number
}

const ROLE_BADGE_TEXT: Record<WorkspaceContextOption['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  project_manager: 'PM',
  qa_reviewer: 'QA',
}

export function WorkspaceSwitcher() {
  const { status } = useSession()
  const [contexts, setContexts] = useState<WorkspaceContextOption[]>([])
  const [activeScope, setActiveScope] = useState<string>('all')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveScope(getActiveWorkspaceOwnerId())
    return subscribeActiveWorkspace((next) => setActiveScope(next))
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/workspace/contexts')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted || !data.success || !Array.isArray(data.contexts)) return
        setContexts(data.contexts)
      } catch {
        // Optional for multi-workspace team members
      }
    })()
    return () => {
      mounted = false
    }
  }, [status])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Render nothing for solo creators with no external agency memberships
  if (contexts.length <= 1) {
    return null
  }

  const currentContext =
    activeScope === 'all'
      ? null
      : activeScope === 'personal'
        ? contexts.find((c) => c.isPersonal) || null
        : contexts.find((c) => c.ownerUserId === activeScope) || null

  const activeLabel =
    activeScope === 'all'
      ? 'All Workspaces'
      : currentContext
        ? currentContext.label
        : 'All Workspaces'

  const handleSelect = (nextScope: string) => {
    setActiveWorkspaceOwnerId(nextScope)
    setActiveScope(nextScope)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-indigo-500/35 bg-indigo-950/40 px-3 py-1.5 text-xs font-medium text-indigo-100 hover:bg-indigo-900/50 transition-colors max-w-[230px]"
        title="Switch active agency workspace"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {activeScope === 'all' ? (
          <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        ) : currentContext?.isPersonal ? (
          <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        ) : (
          <Building2 className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
        )}
        <span className="truncate">{activeLabel}</span>
        {currentContext && !currentContext.isPersonal && (
          <span className="rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200 shrink-0">
            {ROLE_BADGE_TEXT[currentContext.role]}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 mt-2 w-72 rounded-xl border border-gray-700/80 bg-gray-900 shadow-2xl py-1.5 z-50"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Active Studio Workspace
          </div>

          <button
            type="button"
            onClick={() => handleSelect('all')}
            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-gray-800/80 transition-colors ${
              activeScope === 'all' ? 'text-cyan-300 bg-cyan-950/30' : 'text-gray-200'
            }`}
          >
            <span className="inline-flex items-center gap-2 truncate">
              <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate font-medium">All Workspaces</span>
            </span>
            {activeScope === 'all' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
          </button>

          <div className="my-1 border-t border-gray-800" />

          {contexts.map((ctx) => {
            const scopeKey = ctx.isPersonal ? 'personal' : ctx.ownerUserId
            const isSelected = activeScope === scopeKey
            return (
              <button
                key={ctx.ownerUserId}
                type="button"
                onClick={() => handleSelect(scopeKey)}
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 hover:bg-gray-800/80 transition-colors ${
                  isSelected ? 'text-cyan-300 bg-cyan-950/30' : 'text-gray-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {ctx.isPersonal ? (
                      <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                    <span className="truncate font-medium">{ctx.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 pl-5 mt-0.5 flex items-center gap-1.5">
                    <span>{ctx.roleLabel}</span>
                    {!ctx.isPersonal && ctx.monthlyCreditLimit ? (
                      <span>
                        · {(ctx.creditsUsedMonth || 0).toLocaleString()}/
                        {ctx.monthlyCreditLimit.toLocaleString()} cr
                      </span>
                    ) : null}
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

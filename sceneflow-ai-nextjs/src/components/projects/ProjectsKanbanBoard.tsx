'use client'

import React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  UserCheck,
} from 'lucide-react'
import {
  KANBAN_COLUMNS,
  evaluateProjectSla,
  resolveKanbanStage,
  type KanbanStageId,
} from '@/lib/producer/agencyOps'

export interface KanbanProjectItem {
  id: string
  title: string
  status: string
  currentStep?: string | null
  progress?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  metadata?: Record<string, any> | null
  assignedMembers?: Array<{ memberUserId: string; memberEmail: string; role: string }>
}

interface ProjectsKanbanBoardProps {
  projects: KanbanProjectItem[]
  busy: boolean
  onMoveStage: (projectId: string, targetStage: KanbanStageId) => void
  onUpdateDueDate: (projectId: string, targetDeliveryDate: string | null) => void
}

function getProjectHref(project: KanbanProjectItem): string {
  const step = String(project.currentStep || '').toLowerCase()
  if (step === 'vision' || step === 'creation' || step === 'polish' || step === 'launch') {
    return `/dashboard/workflow/vision/${project.id}`
  }
  return `/dashboard/studio/${project.id}`
}

export function ProjectsKanbanBoard({
  projects,
  busy,
  onMoveStage,
  onUpdateDueDate,
}: ProjectsKanbanBoardProps) {
  const grouped = React.useMemo(() => {
    const map = new Map<KanbanStageId, KanbanProjectItem[]>()
    for (const col of KANBAN_COLUMNS) {
      map.set(col.id, [])
    }
    for (const proj of projects) {
      const stage = resolveKanbanStage(proj)
      map.get(stage)?.push(proj)
    }
    return map
  }, [projects])

  return (
    <div className="overflow-x-auto pb-4">
      <div className="grid grid-flow-col auto-cols-[minmax(285px,1fr)] gap-4 min-w-[1160px]">
        {KANBAN_COLUMNS.map((col) => {
          const cards = grouped.get(col.id) || []
          return (
            <div
              key={col.id}
              className="flex flex-col rounded-xl border border-gray-800 bg-gray-900/60 min-h-[420px]"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-gray-800/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${col.accentClass}`}
                    >
                      {col.label}
                    </span>
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-300 tabular-nums">
                      {cards.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 truncate">{col.description}</p>
                </div>
              </div>

              {/* Column Cards */}
              <div className="p-2.5 space-y-2.5 flex-1">
                {cards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-800 py-8 px-3 text-center text-xs text-gray-500">
                    No projects in {col.shortLabel}
                  </div>
                ) : (
                  cards.map((proj) => {
                    const sla = evaluateProjectSla(proj)
                    const order = (proj.metadata?.clientOrder || {}) as Record<string, any>
                    const customerName = order.customerName || order.customerLabel || null
                    const locale = order.locale ? String(order.locale).toUpperCase() : null
                    const dueDateValue = sla.targetDeliveryDate
                      ? sla.targetDeliveryDate.slice(0, 10)
                      : ''
                    const pm = proj.assignedMembers?.[0]

                    return (
                      <div
                        key={proj.id}
                        className={`rounded-lg border p-3 bg-gray-950/80 space-y-2.5 transition-colors hover:border-gray-700 ${
                          sla.slaLevel === 'overdue'
                            ? 'border-red-500/45'
                            : sla.slaLevel === 'waiting_stale'
                              ? 'border-amber-500/40'
                              : 'border-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={getProjectHref(proj)}
                            className="text-xs font-semibold text-white hover:text-cyan-300 line-clamp-2 leading-snug"
                          >
                            {proj.title}
                          </Link>
                          <Link
                            href={getProjectHref(proj)}
                            className="text-gray-500 hover:text-cyan-300 shrink-0"
                            title="Open Project"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        {/* Client & Locale Metadata */}
                        {(customerName || locale || order.clientPriceUsd) && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                            {customerName && (
                              <span className="truncate max-w-[140px] text-gray-300">
                                {customerName}
                              </span>
                            )}
                            {locale && (
                              <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-cyan-300">
                                {locale}
                              </span>
                            )}
                            {typeof order.clientPriceUsd === 'number' && order.clientPriceUsd > 0 && (
                              <span className="rounded bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-300 tabular-nums">
                                ${order.clientPriceUsd.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}

                        {/* SLA Status Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              sla.slaLevel === 'overdue'
                                ? 'bg-red-950/50 border-red-500/40 text-red-300'
                                : sla.slaLevel === 'due_soon'
                                  ? 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                                  : sla.slaLevel === 'waiting_stale'
                                    ? 'bg-orange-950/50 border-orange-500/40 text-orange-200'
                                    : sla.slaLevel === 'delivered'
                                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                                      : 'bg-gray-900 border-gray-700 text-gray-400'
                            }`}
                          >
                            {sla.slaLevel === 'overdue' ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : sla.slaLevel === 'delivered' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {sla.badgeLabel}
                          </span>

                          {pm && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-indigo-300 truncate max-w-[125px]"
                              title={`Assigned PM: ${pm.memberEmail}`}
                            >
                              <UserCheck className="w-3 h-3 shrink-0" />
                              <span className="truncate">{pm.memberEmail.split('@')[0]}</span>
                            </span>
                          )}
                        </div>

                        {/* Inline Target Delivery Date & Stage Move Controls */}
                        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between gap-2">
                          <label className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                            <Calendar className="w-3 h-3 text-gray-500 shrink-0" />
                            <input
                              type="date"
                              aria-label={`Target delivery date for ${proj.title}`}
                              value={dueDateValue}
                              disabled={busy}
                              onChange={(e) =>
                                onUpdateDueDate(proj.id, e.target.value || null)
                              }
                              className="bg-gray-900 border border-gray-800 rounded px-1.5 py-0.5 text-[10px] text-gray-200 focus:outline-none focus:border-cyan-500 w-[112px]"
                            />
                          </label>

                          <select
                            aria-label={`Move ${proj.title} to pipeline stage`}
                            value={col.id}
                            disabled={busy}
                            onChange={(e) =>
                              onMoveStage(proj.id, e.target.value as KanbanStageId)
                            }
                            className="bg-gray-900 border border-gray-800 rounded px-1.5 py-0.5 text-[10px] text-cyan-200 focus:outline-none focus:border-cyan-500 max-w-[115px]"
                          >
                            {KANBAN_COLUMNS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                → {opt.shortLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

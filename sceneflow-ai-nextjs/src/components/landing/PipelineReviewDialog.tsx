'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { ReviewerMilestone, ReviewerMilestoneId } from '@/config/landing/productionPipelineDemo'

type Props = {
  open: boolean
  title: string
  milestones: ReviewerMilestone[]
  labels: Record<ReviewerMilestoneId, string>
  activeId: ReviewerMilestoneId
  onSelect: (id: ReviewerMilestoneId) => void
  onClose: () => void
  closeLabel?: string
}

export function PipelineReviewDialog({
  open,
  title,
  milestones,
  labels,
  activeId,
  onSelect,
  onClose,
  closeLabel = 'Close',
}: Props) {
  const active = milestones.find((milestone) => milestone.id === activeId) ?? milestones[0]

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !active || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[70] flex flex-col bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{title}</p>
        <nav aria-label="Production review" className="flex flex-wrap gap-2">
          {milestones.map((milestone) => {
            const current = milestone.id === active.id
            return (
              <button
                key={milestone.id}
                type="button"
                onClick={() => onSelect(milestone.id)}
                aria-current={current ? 'page' : undefined}
                className={
                  current
                    ? 'rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950'
                    : 'rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:border-cyan-300'
                }
              >
                {labels[milestone.id]}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/15 bg-black/50 p-2 text-gray-200 hover:text-white"
          aria-label={closeLabel}
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      <iframe
        key={active.href}
        src={active.href}
        title={labels[active.id]}
        className="min-h-0 w-full flex-1 border-0 bg-black"
      />
    </div>,
    document.body
  )
}

'use client'

import React, { useCallback, useRef } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type SceneBeatStageStatus = 'ready' | 'attention' | 'action' | 'idle'

export type SceneBeatStageMarker =
  | 'Action'
  | 'Dialogue'
  | 'Narration'
  | 'Custom'
  | 'End'
  | 'Poster'
  | 'SFX'
  | 'Music'
  | 'Excluded'

const KIND_MARKERS: Record<string, SceneBeatStageMarker> = {
  action: 'Action',
  dialogue: 'Dialogue',
  narration: 'Narration',
  custom: 'Custom',
}

export function shotKindMarker(kind: string | null | undefined): SceneBeatStageMarker | undefined {
  if (!kind) return undefined
  return KIND_MARKERS[kind]
}

export interface SceneBeatStageItem {
  id: string
  beatNumber?: number
  status?: SceneBeatStageStatus
  /** Spoken name for the status light, e.g. "Placeholder" or "Final". */
  statusLabel?: string
  /** Hover text for the row. Used when a clip render failed. */
  statusDetail?: string
  /** Type and role chips: Action, Dialogue, SFX, End, Poster, and so on. */
  markers?: SceneBeatStageMarker[]
  /** Short extra chip, e.g. "End" on an optional end frame. */
  caption?: string
  ariaLabel: string
}

export interface SceneBeatStageProps {
  items: SceneBeatStageItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  railLabel?: string
  stage?: React.ReactNode
  detail?: React.ReactNode
  /** Right column when the caller already owns the stage and detail markup. */
  children?: React.ReactNode
  empty?: React.ReactNode
  /** Drag rows to reorder. Ids are the item ids. */
  onReorder?: (fromId: string, toId: string) => void
  reorderDisabled?: boolean
  className?: string
}

const RAIL_PANEL_CLASS =
  'flex w-full max-w-[280px] shrink-0 max-h-[40vh] flex-col rounded-lg border border-slate-600 bg-slate-950 lg:w-[280px] lg:max-h-[min(72vh,40rem)]'

const RAIL_LIST_CLASS =
  'min-h-0 flex-1 cursor-grab overflow-y-auto overscroll-contain px-1 pb-1 active:cursor-grabbing [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:hover:bg-gray-500'

const THUMB_DRAG_THRESHOLD_PX = 6

function statusClass(status: SceneBeatStageStatus | undefined): string | null {
  if (status === 'ready') return 'bg-emerald-400'
  if (status === 'attention') return 'bg-amber-400'
  if (status === 'action') return 'bg-red-500'
  return null
}

function statusTextClass(status: SceneBeatStageStatus | undefined): string {
  if (status === 'ready') return 'text-emerald-300'
  if (status === 'attention') return 'text-amber-300'
  if (status === 'action') return 'text-red-300'
  return 'text-slate-400'
}

function markerClass(marker: string): string {
  switch (marker) {
    case 'Dialogue':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-200'
    case 'Narration':
      return 'border-violet-500/40 bg-violet-500/10 text-violet-200'
    case 'Action':
      return 'border-slate-500/50 bg-slate-700/50 text-slate-200'
    case 'Custom':
      return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
    case 'SFX':
      return 'border-orange-500/40 bg-orange-500/10 text-orange-200'
    case 'Music':
      return 'border-purple-500/40 bg-purple-500/10 text-purple-200'
    case 'Poster':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
    case 'Excluded':
      return 'border-slate-600/60 text-slate-500'
    default:
      return 'border-slate-600/50 bg-slate-800/80 text-slate-300'
  }
}

function rowMarkers(item: SceneBeatStageItem): string[] {
  const markers: string[] = [...(item.markers ?? [])]
  const caption = item.caption?.trim()
  if (caption && !markers.includes(caption)) markers.push(caption)
  return markers
}

function rowAriaLabel(item: SceneBeatStageItem, markers: string[]): string {
  const parts = [item.ariaLabel]
  if (markers.length > 0) parts.push(markers.join(', '))
  const status = item.statusLabel?.trim()
  if (status) parts.push(status)
  return parts.join(', ')
}

function ShotRow({
  item,
  selected,
  sortable,
  disabled,
  onSelect,
}: {
  item: SceneBeatStageItem
  selected: boolean
  sortable: boolean
  disabled?: boolean
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !sortable || disabled,
  })
  const dot = statusClass(item.status)
  const markers = rowMarkers(item)
  const statusLabel = item.statusLabel?.trim()

  const button = (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect(item.id)}
      className={cn(
        'flex w-full items-center gap-2 border-b border-l-2 border-b-slate-800/80 px-2 py-1.5 text-left text-xs',
        selected
          ? 'border-l-cyan-400 bg-slate-800/80'
          : 'border-l-transparent hover:bg-slate-800/40',
        isDragging && 'z-10 opacity-80'
      )}
      {...(sortable && !disabled ? { ...attributes, ...listeners } : {})}
      aria-label={rowAriaLabel(item, markers)}
      aria-pressed={selected}
    >
      <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-slate-300">
        {item.beatNumber ?? ''}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {markers.map((marker) => (
          <span
            key={marker}
            className={cn(
              'rounded border px-1 py-px text-[9px] font-medium uppercase tracking-wide',
              markerClass(marker)
            )}
          >
            {marker}
          </span>
        ))}
      </span>
      {(dot || statusLabel) && (
        <span className="flex max-w-[46%] shrink-0 items-center gap-1">
          {dot && (
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', dot)}
              data-status={item.status}
            />
          )}
          {statusLabel && (
            <span
              className={cn('truncate text-xs leading-tight', statusTextClass(item.status))}
              title={statusLabel}
            >
              {statusLabel}
            </span>
          )}
        </span>
      )}
    </button>
  )

  if (!item.statusDetail) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-left">
        {item.statusDetail}
      </TooltipContent>
    </Tooltip>
  )
}

export function SceneBeatStage({
  items,
  selectedId,
  onSelect,
  railLabel = 'Shots',
  stage,
  detail,
  children,
  empty,
  onReorder,
  reorderDisabled = false,
  className,
}: SceneBeatStageProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const didDragScroll = useRef(false)
  const sortable = !!onReorder && !reorderDisabled && items.length > 1

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const moveSelection = useCallback(
    (delta: number) => {
      if (items.length === 0) return
      const index = Math.max(
        0,
        items.findIndex((item) => item.id === selectedId)
      )
      const next = items[(index + delta + items.length) % items.length]
      if (next) onSelect(next.id)
    },
    [items, onSelect, selectedId]
  )

  const onRailKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target && target !== event.currentTarget && target.closest('input, textarea, select, button')) {
      if (target !== event.currentTarget && target.tagName !== 'BUTTON') return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      moveSelection(1)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      moveSelection(-1)
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || sortable) return
    const el = railRef.current
    if (!el) return
    const pointerId = event.pointerId
    const startY = event.clientY
    const startScrollTop = el.scrollTop
    let dragging = false
    didDragScroll.current = false

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || !railRef.current) return
      const deltaY = ev.clientY - startY
      if (!dragging && Math.abs(deltaY) < THUMB_DRAG_THRESHOLD_PX) return
      dragging = true
      didDragScroll.current = true
      ev.preventDefault()
      railRef.current.scrollTop = startScrollTop - deltaY
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const onClickCapture = (event: React.MouseEvent) => {
    if (!didDragScroll.current) return
    event.preventDefault()
    event.stopPropagation()
    didDragScroll.current = false
  }

  const onDragEnd = (event: DragEndEvent) => {
    if (!onReorder || !event.over) return
    const fromId = String(event.active.id)
    const toId = String(event.over.id)
    if (fromId !== toId) onReorder(fromId, toId)
  }

  const list = (
    <div className="flex flex-col content-start">
      {items.length === 0 ? (
        <p className="px-1 text-[10px] text-slate-500">Nothing matches these filters.</p>
      ) : (
        items.map((item) => (
          <ShotRow
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            sortable={sortable}
            disabled={reorderDisabled}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  )

  const rail = (
    <div className={RAIL_PANEL_CLASS}>
      <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Shots
      </p>
      <div
        ref={railRef}
        role="listbox"
        aria-label={railLabel}
        tabIndex={0}
        className={RAIL_LIST_CLASS}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}
        onKeyDown={onRailKeyDown}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
      >
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {list}
        </SortableContext>
      </div>
    </div>
  )

  return (
    <TooltipProvider delayDuration={300}>
    <div className={cn('flex flex-col items-start gap-3 lg:flex-row', className)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {rail}
      </DndContext>
      <div className="sticky top-2 flex w-full min-w-0 max-w-full flex-1 flex-col gap-2 self-start lg:min-w-[40rem]">
        {items.length === 0 && empty ? empty : stage}
        {children}
        {detail}
      </div>
    </div>
    </TooltipProvider>
  )
}

'use client'

import React, { useCallback, useRef } from 'react'
import { Film } from 'lucide-react'
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

export type SceneBeatStageStatus = 'ready' | 'attention' | 'idle'

export interface SceneBeatStageItem {
  id: string
  beatNumber?: number
  imageUrl?: string
  status?: SceneBeatStageStatus
  /** Short overlay, e.g. "End" on an optional end frame. */
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
  /** Drag thumbnails to reorder. Ids are the item ids. */
  onReorder?: (fromId: string, toId: string) => void
  reorderDisabled?: boolean
  className?: string
}

const RAIL_CLASS =
  'w-full max-w-[280px] shrink-0 max-h-[40vh] cursor-grab overflow-y-auto overscroll-contain rounded-lg border border-slate-700/50 bg-slate-900/40 p-1.5 active:cursor-grabbing lg:w-[280px] lg:max-h-[min(72vh,40rem)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:hover:bg-gray-500'

const THUMB_DRAG_THRESHOLD_PX = 6

function statusClass(status: SceneBeatStageStatus | undefined): string | null {
  if (status === 'ready') return 'bg-emerald-400'
  if (status === 'attention') return 'bg-amber-400'
  return null
}

function BeatThumb({
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

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      aria-label={item.ariaLabel}
      onClick={() => onSelect(item.id)}
      className={cn(
        'relative aspect-video overflow-hidden rounded border bg-slate-900 text-left',
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-500/50'
          : 'border-slate-700 hover:border-slate-500',
        isDragging && 'z-10 opacity-80'
      )}
      {...(sortable && !disabled ? { ...attributes, ...listeners } : {})}
      aria-pressed={selected}
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Film className="h-4 w-4 text-slate-600" />
        </div>
      )}
      {item.beatNumber != null && (
        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[10px] text-slate-200">
          {item.beatNumber}
        </span>
      )}
      {item.caption && (
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] uppercase tracking-wide text-slate-200">
          {item.caption}
        </span>
      )}
      {dot && <span className={cn('absolute right-1 top-1 h-2 w-2 rounded-full', dot)} />}
    </button>
  )
}

export function SceneBeatStage({
  items,
  selectedId,
  onSelect,
  railLabel = 'Beats',
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

  const grid = (
    <div className="grid grid-cols-2 content-start gap-2">
      {items.length === 0 ? (
        <p className="col-span-2 px-1 text-[10px] text-slate-500">Nothing matches these filters.</p>
      ) : (
        items.map((item) => (
          <BeatThumb
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
    <div
      ref={railRef}
      role="listbox"
      aria-label={railLabel}
      tabIndex={0}
      className={RAIL_CLASS}
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}
      onKeyDown={onRailKeyDown}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </div>
  )

  return (
    <div className={cn('flex flex-col items-start gap-3 lg:flex-row', className)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {rail}
      </DndContext>
      <div className="sticky top-2 flex w-full min-w-0 flex-1 flex-col gap-2 self-start lg:w-auto">
        {items.length === 0 && empty ? empty : stage}
        {children}
        {detail}
      </div>
    </div>
  )
}

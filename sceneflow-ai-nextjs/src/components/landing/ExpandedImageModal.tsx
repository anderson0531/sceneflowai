'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { motion } from 'framer-motion'
import { Move, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ExpandedImageModalProps = {
  imageUrl: string
  closeLabel: string
  expandImageLabel?: string
  onClose: () => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function ExpandedImageModal({
  imageUrl,
  closeLabel,
  expandImageLabel = '',
  onClose,
}: ExpandedImageModalProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  const applyTransform = useCallback((nextZoom: number, nextX: number, nextY: number) => {
    const clampedZoom = Number(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM).toFixed(2))
    const viewport = viewportRef.current
    const cw = viewport?.clientWidth || 1200
    const ch = viewport?.clientHeight || 800
    const maxPanX = Math.max(0, (cw * clampedZoom - cw) / 2)
    const maxPanY = Math.max(0, (ch * clampedZoom - ch) / 2)
    setZoom(clampedZoom)
    setPan({
      x: clamp(nextX, -maxPanX, maxPanX),
      y: clamp(nextY, -maxPanY, maxPanY),
    })
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') applyTransform(zoom + ZOOM_STEP, pan.x, pan.y)
      else if (e.key === '-' || e.key === '_') applyTransform(zoom - ZOOM_STEP, pan.x, pan.y)
      else if (e.key === '0') applyTransform(1, 0, 0)
    }

    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, zoom, pan.x, pan.y, applyTransform])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        const nextZoom = zoom - event.deltaY * 0.008
        applyTransform(nextZoom, pan.x, pan.y)
      } else if (zoom > 1.01) {
        applyTransform(zoom, pan.x - event.deltaX, pan.y - event.deltaY)
      } else {
        const nextZoom = zoom - event.deltaY * 0.003
        applyTransform(nextZoom, pan.x, pan.y)
      }
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [zoom, pan.x, pan.y, applyTransform])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= 1.01) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    applyTransform(zoom, drag.originX + dx, drag.originY + dy)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      dragRef.current = null
      setIsDragging(false)
    }
  }

  const handleDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const offsetX = event.clientX - (rect.left + rect.width / 2)
    const offsetY = event.clientY - (rect.top + rect.height / 2)

    if (zoom < 2) {
      const nextZoom = 2.25
      const ratio = nextZoom / zoom
      applyTransform(
        nextZoom,
        offsetX - (offsetX - pan.x) * ratio,
        offsetY - (offsetY - pan.y) * ratio
      )
    } else {
      applyTransform(1, 0, 0)
    }
  }

  const zoomPercent = Math.round(zoom * 100)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md md:p-8"
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="relative flex h-full w-full max-w-7xl flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute left-3 top-3 z-20 hidden items-center gap-2 rounded-full border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md sm:flex">
          <Move className="h-3.5 w-3.5 text-cyan-400" />
          <span>Scroll or double-click to zoom · Drag to pan</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/75 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-md transition-colors hover:border-cyan-400/50 hover:bg-slate-900"
        >
          <X className="h-4 w-4" />
          {closeLabel}
        </button>

        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          className={cn(
            'relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl touch-none',
            zoom > 1.01
              ? isDragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : 'cursor-zoom-in'
          )}
        >
          <img
            src={imageUrl}
            alt={expandImageLabel}
            draggable={false}
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className={cn(
              'h-full w-full object-contain select-none pointer-events-none will-change-transform',
              !isDragging && 'transition-transform duration-150 ease-out'
            )}
          />
        </div>

        {/* Bottom Floating Studio Zoom Bar */}
        <div className="absolute bottom-4 z-20 flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/85 px-3.5 py-2 text-xs text-white shadow-2xl backdrop-blur-xl">
          {[1, 2, 3].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyTransform(preset, preset === 1 ? 0 : pan.x, preset === 1 ? 0 : pan.y)}
              className={cn(
                'rounded-lg px-2 py-1 font-mono text-xs font-medium transition',
                Math.abs(zoom - preset) < 0.08
                  ? 'bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/50'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              )}
            >
              {preset === 1 ? 'Fit' : `${preset}×`}
            </button>
          ))}

          <span className="h-4 w-px bg-white/15" aria-hidden="true" />

          <button
            type="button"
            onClick={() => applyTransform(zoom - ZOOM_STEP, pan.x, pan.y)}
            disabled={zoom <= MIN_ZOOM + 0.01}
            className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <input
            type="range"
            min={100}
            max={400}
            step={5}
            value={zoomPercent}
            aria-label="Zoom level percentage"
            onChange={(e) => applyTransform(Number(e.currentTarget.value) / 100, pan.x, pan.y)}
            className="h-1.5 w-24 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400"
          />

          <button
            type="button"
            onClick={() => applyTransform(zoom + ZOOM_STEP, pan.x, pan.y)}
            disabled={zoom >= MAX_ZOOM - 0.01}
            className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <span className="min-w-[3.25rem] text-center font-mono text-xs font-semibold tabular-nums text-cyan-300">
            {zoomPercent}%
          </span>

          <button
            type="button"
            onClick={() => applyTransform(1, 0, 0)}
            className="rounded-lg p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

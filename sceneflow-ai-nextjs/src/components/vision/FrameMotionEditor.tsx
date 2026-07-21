'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Move, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { transformToCss } from '@/lib/storyboard/storyboardImageEffects'
import {
  applyKenBurnsPreset,
  clampRect,
  computeFrameKenBurnsTransform,
  DEFAULT_BEAT_KEN_BURNS,
  KEN_BURNS_PRESET_LABELS,
  type BeatKenBurnsEasing,
  type BeatKenBurnsSettings,
  type FrameViewportRect,
  type KenBurnsPresetId,
} from '@/lib/storyboard/kenBurnsFrame'

interface FrameMotionEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  beatLabel?: string
  value?: BeatKenBurnsSettings
  onSave: (settings: BeatKenBurnsSettings) => void
}

type ActiveRect = 'start' | 'end'

const EASING_OPTIONS: { value: BeatKenBurnsEasing; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'drift', label: 'Drift' },
  { value: 'push', label: 'Push' },
  { value: 'dramatic', label: 'Dramatic' },
]

function normalizeSettings(value?: BeatKenBurnsSettings): BeatKenBurnsSettings {
  if (!value) return { ...DEFAULT_BEAT_KEN_BURNS }
  return {
    enabled: value.enabled ?? false,
    start: clampRect(value.start ?? DEFAULT_BEAT_KEN_BURNS.start),
    end: clampRect(value.end ?? DEFAULT_BEAT_KEN_BURNS.end),
    easing: value.easing ?? 'smooth',
  }
}

interface RectOverlayProps {
  rect: FrameViewportRect
  colorClass: string
  label: string
  active: boolean
  onActivate: () => void
  onChange: (rect: FrameViewportRect) => void
}

function RectOverlay({
  rect,
  colorClass,
  label,
  active,
  onActivate,
  onChange,
}: RectOverlayProps) {
  const dragRef = useRef<{
    mode: 'move' | 'resize'
    pointerId: number
    startX: number
    startY: number
    origin: FrameViewportRect
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (
    e: React.PointerEvent,
    mode: 'move' | 'resize'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    onActivate()
    dragRef.current = {
      mode,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...rect },
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const el = containerRef.current?.parentElement
    if (!el) return
    const bounds = el.getBoundingClientRect()
    const dx = (e.clientX - drag.startX) / bounds.width
    const dy = (e.clientY - drag.startY) / bounds.height

    if (drag.mode === 'move') {
      onChange(
        clampRect({
          ...drag.origin,
          x: drag.origin.x + dx,
          y: drag.origin.y + dy,
        })
      )
      return
    }

    onChange(
      clampRect({
        ...drag.origin,
        width: drag.origin.width + dx,
        height: drag.origin.height + dy,
      })
    )
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute border-2 rounded-sm cursor-move touch-none',
        colorClass,
        active ? 'ring-2 ring-white/70 z-20' : 'z-10 opacity-90'
      )}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
      }}
      onPointerDown={(e) => handlePointerDown(e, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="absolute -top-5 left-0 text-[10px] font-medium px-1 py-0.5 rounded bg-black/70 text-white whitespace-nowrap">
        {label}
      </span>
      <div
        className="absolute bottom-0 right-0 w-3 h-3 bg-white/90 border border-slate-900/50 cursor-se-resize rounded-sm"
        onPointerDown={(e) => handlePointerDown(e, 'resize')}
      />
    </div>
  )
}

export function FrameMotionEditor({
  open,
  onOpenChange,
  imageUrl,
  beatLabel,
  value,
  onSave,
}: FrameMotionEditorProps) {
  const [settings, setSettings] = useState<BeatKenBurnsSettings>(() =>
    normalizeSettings(value)
  )
  const [activeRect, setActiveRect] = useState<ActiveRect>('start')
  const [previewProgress, setPreviewProgress] = useState(0)

  useEffect(() => {
    if (open) {
      setSettings(normalizeSettings(value))
      setActiveRect('start')
      setPreviewProgress(0)
    }
  }, [open, value])

  useEffect(() => {
    if (!open || !settings.enabled) return
    let frame = 0
    let raf = 0
    const tick = () => {
      frame += 1
      const cycle = (frame % 120) / 120
      setPreviewProgress(cycle <= 0.5 ? cycle * 2 : 2 - cycle * 2)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open, settings.enabled])

  const previewTransform = useMemo(() => {
    if (!settings.enabled) return transformToCss({ scale: 1, translateX: 0, translateY: 0 })
    return transformToCss(computeFrameKenBurnsTransform(settings, previewProgress))
  }, [settings, previewProgress])

  const updateRect = useCallback((target: ActiveRect, rect: FrameViewportRect) => {
    setSettings((prev) => ({
      ...prev,
      [target]: clampRect(rect),
    }))
  }, [])

  const applyPreset = (preset: KenBurnsPresetId) => {
    setSettings((prev) => applyKenBurnsPreset(preset, prev))
  }

  const handleReset = () => {
    setSettings({ ...DEFAULT_BEAT_KEN_BURNS, enabled: settings.enabled })
  }

  const handleSave = () => {
    onSave(settings)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-4 h-4 text-cyan-400" />
            Frame motion{beatLabel ? ` — ${beatLabel}` : ''}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Drag the cyan (pan from) and amber (pan to) regions. Motion plays in Screening Room and exports to MP4.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-700 bg-black">
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              />
              <RectOverlay
                rect={settings.start}
                colorClass="border-cyan-400 bg-cyan-400/10"
                label="Pan from"
                active={activeRect === 'start'}
                onActivate={() => setActiveRect('start')}
                onChange={(rect) => updateRect('start', rect)}
              />
              <RectOverlay
                rect={settings.end}
                colorClass="border-amber-400 bg-amber-400/10"
                label="Pan to"
                active={activeRect === 'end'}
                onActivate={() => setActiveRect('end')}
                onChange={(rect) => updateRect('end', rect)}
              />
            </div>

            <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-700 bg-black">
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover origin-center"
                style={{
                  transform: previewTransform,
                  transition: settings.enabled ? 'transform 0.08s linear' : undefined,
                }}
              />
              <div className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-slate-300">
                Live preview
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Enable motion</p>
                <p className="text-xs text-slate-400">Overrides global Ken Burns for this beat</p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-300 mb-2">Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(KEN_BURNS_PRESET_LABELS) as KenBurnsPresetId[]).map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] border-slate-600 text-slate-200 hover:bg-slate-800"
                    onClick={() => applyPreset(preset)}
                  >
                    {KEN_BURNS_PRESET_LABELS[preset]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-300 mb-2">Easing</p>
              <Select
                value={settings.easing}
                onValueChange={(v) =>
                  setSettings((prev) => ({ ...prev, easing: v as BeatKenBurnsEasing }))
                }
              >
                <SelectTrigger className="h-9 bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EASING_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-slate-600 text-slate-200"
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset regions
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save motion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

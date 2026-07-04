'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Image as ImageIcon, Loader, Zap } from 'lucide-react'
import { IMAGE_CREDITS } from '@/lib/credits/creditCosts'
import {
  enumerateStoryboardFrameSlots,
  filterStoryboardSlotsForExpressChecklist,
  type StoryboardFrameSlot,
} from '@/lib/storyboard/types'

export type ExpressSceneScope = 'missing' | 'selected'

export interface ExpressSceneConfirmOptions {
  scope: ExpressSceneScope
  includeEndFrames: boolean
  selectedFrameKeys: string[]
}

interface ExpressSceneConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scene: Record<string, unknown>
  isRunning?: boolean
  onConfirm: (options: ExpressSceneConfirmOptions) => void
}

function slotEligibleForScope(slot: StoryboardFrameSlot, scope: ExpressSceneScope): boolean {
  if (scope === 'missing') return !slot.ownImageUrl
  return !!slot.ownImageUrl
}

export function ExpressSceneConfirmDialog({
  open,
  onOpenChange,
  scene,
  isRunning = false,
  onConfirm,
}: ExpressSceneConfirmDialogProps) {
  const [scope, setScope] = useState<ExpressSceneScope>('missing')
  const [selectedFrameKeys, setSelectedFrameKeys] = useState<string[]>([])

  const allSlots = useMemo(
    () => enumerateStoryboardFrameSlots(scene, undefined, { startFramesOnly: true }),
    [scene]
  )

  const checklistSlots = useMemo(
    () => filterStoryboardSlotsForExpressChecklist(allSlots, { includeEndFrames: false }),
    [allSlots]
  )

  useEffect(() => {
    if (!open) return
    setScope('missing')
  }, [open])

  useEffect(() => {
    if (!open) return
    const selected = checklistSlots
      .filter((slot) => slotEligibleForScope(slot, scope))
      .map((slot) => slot.key)
    setSelectedFrameKeys(selected)
  }, [open, scope, checklistSlots])

  const selectedSet = useMemo(() => new Set(selectedFrameKeys), [selectedFrameKeys])

  const toggleSlot = (key: string, checked: boolean) => {
    setSelectedFrameKeys((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key]
      return prev.filter((id) => id !== key)
    })
  }

  const creditTotal = selectedFrameKeys.length * IMAGE_CREDITS.IMAGEN_3
  const nothingSelected = selectedFrameKeys.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            <Zap className="w-5 h-5" />
            Express Scene
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose which pre-vis frames to generate or regenerate. Regenerating existing frames
            updates images only — direction and audio are left unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Scope
            </p>
            <div className="inline-flex rounded-md border border-amber-600/40 overflow-hidden">
              {(['missing', 'selected'] as ExpressSceneScope[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setScope(value)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    scope === value
                      ? 'bg-amber-600 text-white'
                      : 'bg-transparent text-amber-200/80 hover:bg-amber-900/30'
                  }`}
                >
                  {value === 'missing' ? 'Missing only' : 'Regenerate selected'}
                </button>
              ))}
            </div>
            {scope === 'selected' && (
              <p className="text-[11px] text-amber-200/70 mt-2">
                Checked frames with existing images will be regenerated. Direction and audio are not
                rerun.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Frames
            </p>
            {checklistSlots.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No frames available for this scope.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {checklistSlots.map((slot) => (
                  <label
                    key={slot.key}
                    className="flex items-start gap-2 rounded border border-gray-700/80 bg-gray-800/40 p-2 cursor-pointer hover:bg-gray-800/70"
                  >
                    <Checkbox
                      checked={selectedSet.has(slot.key)}
                      onCheckedChange={(checked) => toggleSlot(slot.key, checked === true)}
                      disabled={isRunning}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm text-gray-100 truncate">
                        <ImageIcon className="w-3.5 h-3.5 shrink-0 text-amber-300/80" />
                        {slot.label}
                      </span>
                      <span
                        className={`text-[10px] ${
                          slot.ownImageUrl ? 'text-green-400' : 'text-amber-400'
                        }`}
                      >
                        {slot.ownImageUrl ? 'Has image' : 'Missing'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedFrameKeys.length > 0 && (
              <p className="text-[11px] text-amber-300/60 mt-2">
                Image credits (est.): {creditTotal} ({selectedFrameKeys.length} frame
                {selectedFrameKeys.length === 1 ? '' : 's'} × {IMAGE_CREDITS.IMAGEN_3})
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() =>
              onConfirm({
                scope,
                includeEndFrames: false,
                selectedFrameKeys,
              })
            }
            disabled={isRunning || nothingSelected}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Express Scene
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

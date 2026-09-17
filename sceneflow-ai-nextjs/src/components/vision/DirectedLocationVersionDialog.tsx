'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getSceneBeats } from '@/lib/script/beatMigration'
import type { LocationVersionAppliesFrom } from '@/types/visionReferences'
import type { DirectedLocationVersionInput } from '@/lib/vision/locationScriptSync'

export interface DirectedLocationBeatOption {
  sceneNumber: number
  beatIndex: number
  beatId?: string
  label: string
}

export interface DirectedLocationChoice {
  id: string
  name: string
}

export interface DirectedLocationVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: DirectedLocationChoice[]
  beats: DirectedLocationBeatOption[]
  defaultLocationId?: string
  isSubmitting?: boolean
  onConfirm: (payload: DirectedLocationVersionInput & { locationId: string }) => void | Promise<void>
}

export function directedBeatOptionsFromScene(
  scene: Record<string, unknown> | null | undefined,
  sceneNumber: number
): DirectedLocationBeatOption[] {
  if (!scene) return []
  return getSceneBeats(scene).map((beat, beatIndex) => {
    const text = (beat.line || beat.actionDescription || beat.kind || '').trim()
    const short = text.length > 52 ? `${text.slice(0, 49)}…` : text
    return {
      sceneNumber,
      beatIndex,
      beatId: beat.beatId,
      label: short ? `Beat ${beatIndex + 1} — ${short}` : `Beat ${beatIndex + 1}`,
    }
  })
}

function beatKey(beat: DirectedLocationBeatOption): string {
  return `${beat.sceneNumber}:${beat.beatIndex}:${beat.beatId ?? ''}`
}

export function DirectedLocationVersionDialog({
  open,
  onOpenChange,
  locations,
  beats,
  defaultLocationId,
  isSubmitting = false,
  onConfirm,
}: DirectedLocationVersionDialogProps) {
  const t = useTranslations('production.direction.locationLibrary')
  const tCommon = useTranslations('common')
  const [locationId, setLocationId] = useState(defaultLocationId || locations[0]?.id || '')
  const [name, setName] = useState('')
  const [stateNotes, setStateNotes] = useState('')
  const [selectedBeatKey, setSelectedBeatKey] = useState('')

  useEffect(() => {
    if (!open) return
    const nextLocation = defaultLocationId || locations[0]?.id || ''
    setLocationId(nextLocation)
    setName('')
    setStateNotes('')
    const last = beats[beats.length - 1]
    setSelectedBeatKey(last ? beatKey(last) : '')
  }, [open, defaultLocationId, locations, beats])

  const selectedBeat = useMemo(
    () => beats.find((beat) => beatKey(beat) === selectedBeatKey) ?? beats[beats.length - 1],
    [beats, selectedBeatKey]
  )

  const canSubmit =
    !!locationId &&
    name.trim().length > 0 &&
    stateNotes.trim().length > 0 &&
    !!selectedBeat &&
    !isSubmitting

  const handleConfirm = () => {
    if (!selectedBeat || !locationId) return
    const appliesFrom: LocationVersionAppliesFrom = {
      sceneNumber: selectedBeat.sceneNumber,
      beatIndex: selectedBeat.beatIndex,
      beatId: selectedBeat.beatId,
    }
    void onConfirm({
      locationId,
      name: name.trim(),
      stateNotes: stateNotes.trim(),
      appliesFrom,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle>{t('directedVersionTitle')}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('directedVersionHint')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {locations.length > 1 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-slate-300">{t('directedVersionLocation')}</p>
              <Select value={locationId} onValueChange={setLocationId} disabled={isSubmitting}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-slate-300">{t('directedVersionName')}</p>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('directedVersionNamePlaceholder')}
              disabled={isSubmitting}
              className="h-8 text-xs bg-slate-800 border-slate-600"
            />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-slate-300">{t('stateNotes')}</p>
            <Textarea
              value={stateNotes}
              onChange={(event) => setStateNotes(event.target.value)}
              placeholder={t('directedVersionNotesPlaceholder')}
              disabled={isSubmitting}
              className="min-h-[72px] text-xs bg-slate-800 border-slate-600"
            />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium text-slate-300">{t('directedVersionStartBeat')}</p>
            {beats.length === 0 ? (
              <p className="text-[11px] text-amber-300/80">{t('directedVersionNoBeats')}</p>
            ) : (
              <Select
                value={selectedBeat ? beatKey(selectedBeat) : undefined}
                onValueChange={setSelectedBeatKey}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {beats.map((beat) => (
                    <SelectItem key={beatKey(beat)} value={beatKey(beat)}>
                      {beat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canSubmit}>
            {t('directedVersionCreate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

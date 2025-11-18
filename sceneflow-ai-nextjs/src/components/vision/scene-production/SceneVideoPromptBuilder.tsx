'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { GenerationType } from './SegmentStudio'
import { SceneProductionReferences, SceneSegment } from './types'
import { Sparkles, Users, Image as ImageIcon, PackageOpen } from 'lucide-react'

const VIDEO_PLATFORMS = [
  { id: 'runway', name: 'Runway Gen-3', description: 'Balanced cinematic output' },
  { id: 'pika', name: 'Pika Labs', description: 'Expressive motion & stylized looks' },
  { id: 'luma', name: 'Luma Dream Machine', description: 'Sharp detail with realistic motion' },
  { id: 'heygen', name: 'Heygen', description: 'Avatar-first storytelling' },
]

const PROMPT_MODES: Array<{ id: GenerationType; label: string; description: string }> = [
  { id: 'T2V', label: 'Text → Video', description: 'Fresh shot from structured prompt' },
  { id: 'I2V', label: 'Image → Video', description: 'Uses previous frame for continuity' },
  { id: 'T2I', label: 'Text → Image', description: 'High-resolution still frame' },
]

export interface VideoPromptConfig {
  prompt: string
  platform: string
  promptType: GenerationType
  characters: string[]
  sceneRefs: string[]
  objects: string[]
}

interface SceneVideoPromptBuilderProps {
  open: boolean
  onClose: () => void
  segment: SceneSegment | null
  references: SceneProductionReferences
  config?: VideoPromptConfig
  onSave: (config: VideoPromptConfig) => void
}

const getReferenceId = (item: any) => item?.id || item?.referenceId || item?.characterId || item?.name
const getReferenceLabel = (item: any) => item?.name || item?.title || item?.label || item?.id || 'Untitled'

export function SceneVideoPromptBuilder({
  open,
  onClose,
  segment,
  references,
  config,
  onSave,
}: SceneVideoPromptBuilderProps) {
  const [prompt, setPrompt] = useState('')
  const [platform, setPlatform] = useState(VIDEO_PLATFORMS[0].id)
  const [promptType, setPromptType] = useState<GenerationType>('T2V')
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([])
  const [selectedSceneRefs, setSelectedSceneRefs] = useState<string[]>([])
  const [selectedObjects, setSelectedObjects] = useState<string[]>([])

  useEffect(() => {
    if (!open || !segment) return
    setPrompt(config?.prompt ?? segment.userEditedPrompt ?? segment.generatedPrompt ?? '')
    setPlatform(config?.platform ?? VIDEO_PLATFORMS[0].id)
    setPromptType(config?.promptType ?? 'T2V')
    setSelectedCharacters(config?.characters ?? segment.references.characterIds ?? [])
    setSelectedSceneRefs(config?.sceneRefs ?? segment.references.sceneRefIds ?? [])
    setSelectedObjects(config?.objects ?? segment.references.objectRefIds ?? [])
  }, [open, segment?.segmentId, config])

  const characterOptions = useMemo(() => {
    return references.characters?.map((character: any) => ({
      id: getReferenceId(character),
      label: getReferenceLabel(character),
      avatar: character?.referenceImage,
    })) ?? []
  }, [references.characters])

  const sceneReferenceOptions = useMemo(() => {
    return references.sceneReferences?.map((ref) => ({
      id: getReferenceId(ref),
      label: getReferenceLabel(ref),
      thumbnail: ref?.imageUrl,
    })) ?? []
  }, [references.sceneReferences])

  const objectReferenceOptions = useMemo(() => {
    return references.objectReferences?.map((ref) => ({
      id: getReferenceId(ref),
      label: getReferenceLabel(ref),
      thumbnail: ref?.imageUrl,
    })) ?? []
  }, [references.objectReferences])

  const toggleSelection = (type: 'characters' | 'sceneRefs' | 'objects', id: string) => {
    const updater = (current: string[]) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]

    if (type === 'characters') {
      setSelectedCharacters(updater)
    } else if (type === 'sceneRefs') {
      setSelectedSceneRefs(updater)
    } else {
      setSelectedObjects(updater)
    }
  }

  const handleSave = () => {
    if (!segment) return
    onSave({
      prompt: prompt.trim(),
      platform,
      promptType,
      characters: selectedCharacters,
      sceneRefs: selectedSceneRefs,
      objects: selectedObjects,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-950 text-white border-slate-800">
            <DialogHeader>
              <DialogTitle>Scene Segment Description · Segment {segment?.sequenceIndex !== undefined ? segment.sequenceIndex + 1 : ''}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Edit the scene segment description, assign references, and choose a generation platform. This description is used to generate video and image prompts.
              </DialogDescription>
            </DialogHeader>

        {segment ? (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Video Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-slate-900 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_PLATFORMS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium">{option.name}</span>
                          <span className="text-xs text-slate-400">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-400">Prompt Mode</label>
                <Select value={promptType} onValueChange={(value) => setPromptType(value as GenerationType)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_MODES.map((mode) => (
                      <SelectItem key={mode.id} value={mode.id}>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium">{mode.label}</span>
                          <span className="text-xs text-slate-400">{mode.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Users className="w-4 h-4 text-sf-primary" />
                Characters in this beat
              </div>
              <div className="flex flex-wrap gap-2">
                {characterOptions.length === 0 && (
                  <p className="text-xs text-slate-500">No character references available.</p>
                )}
                {characterOptions.map((character) => {
                  const selected = selectedCharacters.includes(character.id)
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() => toggleSelection('characters', character.id)}
                      className={`px-3 py-1 rounded-full border text-xs transition ${
                        selected
                          ? 'border-sf-primary text-white bg-sf-primary/20'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {character.label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <ImageIcon className="w-4 h-4 text-amber-300" />
                  Scene references
                </div>
                <div className="flex flex-wrap gap-2">
                  {sceneReferenceOptions.length === 0 && (
                    <p className="text-xs text-slate-500">No scene references yet.</p>
                  )}
                  {sceneReferenceOptions.map((ref) => {
                    const selected = selectedSceneRefs.includes(ref.id)
                    return (
                      <button
                        key={ref.id}
                        type="button"
                        onClick={() => toggleSelection('sceneRefs', ref.id)}
                        className={`px-3 py-1 rounded border text-xs transition ${
                          selected
                            ? 'border-amber-400 text-white bg-amber-400/20'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {ref.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <PackageOpen className="w-4 h-4 text-emerald-300" />
                  Objects & props
                </div>
                <div className="flex flex-wrap gap-2">
                  {objectReferenceOptions.length === 0 && (
                    <p className="text-xs text-slate-500">No object references yet.</p>
                  )}
                  {objectReferenceOptions.map((ref) => {
                    const selected = selectedObjects.includes(ref.id)
                    return (
                      <button
                        key={ref.id}
                        type="button"
                        onClick={() => toggleSelection('objects', ref.id)}
                        className={`px-3 py-1 rounded border text-xs transition ${
                          selected
                            ? 'border-emerald-400 text-white bg-emerald-400/20'
                            : 'border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        {ref.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Sparkles className="w-4 h-4 text-sky-300" />
                Scene Segment Description
              </div>
              <p className="text-xs text-slate-500 mb-2">
                This description is used to generate video and image prompts. Describe motion, framing, pacing, and the emotional beat for this segment.
              </p>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={8}
                className="bg-slate-900 border-slate-800 placeholder:text-slate-600"
                placeholder="Describe motion, framing, pacing, and the emotional beat for this segment..."
              />
            </section>
          </div>
        ) : (
          <div className="text-sm text-slate-400 py-6">Select a segment to configure its scene segment description.</div>
        )}

        <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-4">
          <div className="text-xs text-slate-500">
            Segment duration · {segment ? `${segment.startTime.toFixed(1)}s – ${segment.endTime.toFixed(1)}s` : '--'}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-slate-300 hover:text-white">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!segment || !prompt.trim()}>
              Save Description
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


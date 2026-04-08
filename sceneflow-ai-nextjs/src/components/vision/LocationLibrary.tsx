'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  MapPin,
  Sparkles,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Check,
  X,
  Image as ImageIcon,
  Maximize2,
  Wand2,
  Sun,
  Moon,
  Sunrise,
  Camera
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { LocationReference } from '@/types/visionReferences'
import { extractLocation } from '@/lib/script/formatSceneHeading'
import { LocationPromptBuilder, LocationPromptPayload } from './LocationPromptBuilder'

// Scene heading regex for INT/EXT extraction
const SCENE_CODE_REGEX = /^(INT\.\/EXT\.|EXT\.\/INT\.|INT\.\/EXT|EXT\.\/INT|INT\. |EXT\. |INT\/EXT|EXT\/INT|INT\.|EXT\.|INT|EXT)\s*(.*)$/i

interface LocationLibraryProps {
  /** Current location references */
  locationReferences: LocationReference[]
  /** All scenes from the script */
  scenes: Array<{
    heading?: string | { text?: string }
    sceneDirection?: {
      scene?: {
        location?: string
        atmosphere?: string
        keyProps?: string[]
      }
      lighting?: {
        overallMood?: string
        timeOfDay?: string
      }
    }
  }>
  /** Callback to update location references */
  onUpdateLocations: (locations: LocationReference[]) => void
  /** Callback to remove a location reference */
  onRemoveLocation: (locationId: string) => void
  /** Callback to generate location reference image (legacy — simple) */
  onGenerateLocationImage?: (location: LocationReference) => void
  /** Callback to generate location reference image with prompt builder payload */
  onGenerateLocationImageWithPrompt?: (payload: LocationPromptPayload) => void
  /** Callback to open edit modal for existing location image */
  onEditLocationImage?: (locationId: string, imageUrl: string) => void
  /** Callback to upload location reference image */
  onUploadLocationImage?: (locationId: string, file: File) => void
  /** Whether a location image is currently generating */
  generatingLocationId?: string | null
  /** Screenplay context for prompt builder enrichment */
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    visualStyle?: string
  }
}

/**
 * Extract INT/EXT and time of day from a scene heading
 */
function parseSceneHeadingMeta(heading: string): { intExt?: 'INT' | 'EXT' | 'INT/EXT' | 'EXT/INT'; timeOfDay?: string } {
  const match = heading.trim().toUpperCase().match(SCENE_CODE_REGEX)
  if (!match) return {}

  const codeRaw = match[1]?.toUpperCase().replace(/[\.\s]/g, '') || ''
  const intExt = (['INT', 'EXT', 'INTEXT', 'EXTINT'].includes(codeRaw.replace('/', ''))
    ? codeRaw.replace(/\./g, '').replace('INTEXT', 'INT/EXT').replace('EXTINT', 'EXT/INT') as 'INT' | 'EXT' | 'INT/EXT' | 'EXT/INT'
    : undefined)

  const remainder = match[2]?.trim() || ''
  const parts = remainder.split(/\s+-\s+/)
  let timeOfDay: string | undefined
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1]?.trim()
    if (lastPart) {
      const isModifier = 
        /^(DAY|NIGHT|MORNING|EVENING|SUNSET|SUNRISE|DUSK|DAWN|CONTINUOUS|LATER|SAME|MOMENTS LATER)$/.test(lastPart) ||
        /\bTO\b/.test(lastPart) || // e.g. DAY TO NIGHT
        /LATER$/.test(lastPart) || // e.g. MONTHS LATER, YEARS LATER
        /^(FLASHBACK|DREAM|MONTAGE)/.test(lastPart) || // sequence types
        /^(19|20)\d{2}$/.test(lastPart); // Years like 1999, 2024
      
      if (isModifier) {
        timeOfDay = lastPart
      }
    }
  }

  return { intExt, timeOfDay }
}

/**
 * Get time of day icon
 */
function TimeIcon({ time }: { time?: string }) {
  if (!time) return null
  const t = time.toUpperCase()
  if (t.includes('NIGHT') || t.includes('DUSK')) return <Moon className="w-3 h-3 text-indigo-400" />
  if (t.includes('SUNRISE') || t.includes('DAWN') || t.includes('MORNING')) return <Sunrise className="w-3 h-3 text-amber-400" />
  if (t.includes('SUNSET') || t.includes('EVENING')) return <Sunrise className="w-3 h-3 text-orange-400" />
  return <Sun className="w-3 h-3 text-yellow-400" />
}

/**
 * LocationLibrary - Intelligent location management for Production Bible
 * 
 * Auto-extracts unique locations from script scene headings, showing INT/EXT,
 * time of day, scene count, and reference images with generate/upload/edit controls.
 */
export function LocationLibrary({
  locationReferences,
  scenes,
  onUpdateLocations,
  onRemoveLocation,
  onGenerateLocationImage,
  onGenerateLocationImageWithPrompt,
  onEditLocationImage,
  onUploadLocationImage,
  generatingLocationId,
  screenplayContext
}: LocationLibraryProps) {
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null)
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null)
  const [descriptionText, setDescriptionText] = useState('')
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null)
  const [expandedImageName, setExpandedImageName] = useState<string>('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [uploadingForId, setUploadingForId] = useState<string | null>(null)
  const [promptBuilderOpenFor, setPromptBuilderOpenFor] = useState<string | null>(null)

  /**
   * Extract unique locations from all scene headings.
   * Deduplicates by normalized location name and tracks scene numbers.
   */
  const extractedLocations = useMemo(() => {
    const locationMap = new Map<string, {
      location: string
      intExt?: 'INT' | 'EXT' | 'INT/EXT' | 'EXT/INT'
      timeOfDay?: string
      headings: string[]
      sceneNumbers: number[]
      description?: string
    }>()

    scenes.forEach((scene, idx) => {
      const headingText = typeof scene.heading === 'string' ? scene.heading : scene.heading?.text
      if (!headingText) return

      const location = extractLocation(headingText)
      if (!location) return

      const existing = locationMap.get(location)
      if (existing) {
        existing.sceneNumbers.push(idx + 1)
        if (!existing.headings.includes(headingText)) {
          existing.headings.push(headingText)
        }
      } else {
        const meta = parseSceneHeadingMeta(headingText)
        // Try to build a description from scene direction
        let description: string | undefined
        if (scene.sceneDirection?.scene?.location) {
          description = scene.sceneDirection.scene.location
          if (scene.sceneDirection.scene.atmosphere) {
            description += `. ${scene.sceneDirection.scene.atmosphere}`
          }
        }

        locationMap.set(location, {
          location,
          intExt: meta.intExt,
          timeOfDay: meta.timeOfDay,
          headings: [headingText],
          sceneNumbers: [idx + 1],
          description
        })
      }
    })

    return Array.from(locationMap.values())
  }, [scenes])

  /**
   * Auto-extract locations from script and create LocationReference entries
   * for any new locations not already in the references list.
   * Implements "Automate" from "Automate, Guide, Control" — runs on button click.
   */
  const handleExtractLocations = useCallback(async () => {
    if (extractedLocations.length === 0) {
      toast.info('No locations found in script scene headings')
      return
    }

    setIsExtracting(true)

    try {
      const existingLocations = new Set(locationReferences.map(r => r.location))
      const newLocations: LocationReference[] = []

      for (const loc of extractedLocations) {
        if (existingLocations.has(loc.location)) continue

        newLocations.push({
          id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          location: loc.location,
          locationDisplay: loc.headings[0] || loc.location,
          imageUrl: '', // No image yet — user can generate or upload
          sourceSceneIndex: loc.sceneNumbers[0] - 1,
          sourceSceneHeading: loc.headings[0] || loc.location,
          pinnedAt: new Date().toISOString(),
          intExt: loc.intExt,
          timeOfDay: loc.timeOfDay,
          description: loc.description,
          sceneNumbers: loc.sceneNumbers,
          autoExtracted: true
        })
      }

      if (newLocations.length === 0) {
        toast.info('All locations already extracted')
      } else {
        const updated = [...locationReferences, ...newLocations]
        onUpdateLocations(updated)
        toast.success(`Extracted ${newLocations.length} location(s) from script`)
      }
    } finally {
      setIsExtracting(false)
    }
  }, [extractedLocations, locationReferences, onUpdateLocations])

  /**
   * Merge: update existing refs with latest scene numbers from extraction
   */
  const mergedLocations = useMemo(() => {
    // Merge extracted scene info into existing location references
    const extractedMap = new Map(extractedLocations.map(e => [e.location, e]))

    return locationReferences.map(ref => {
      const extracted = extractedMap.get(ref.location)
      if (extracted) {
        return {
          ...ref,
          sceneNumbers: extracted.sceneNumbers,
          intExt: ref.intExt || extracted.intExt,
          timeOfDay: ref.timeOfDay || extracted.timeOfDay,
          description: ref.description || extracted.description
        }
      }
      return ref
    })
  }, [locationReferences, extractedLocations])

  // Count of locations in script but not yet in references
  const unextractedCount = useMemo(() => {
    const existing = new Set(locationReferences.map(r => r.location))
    return extractedLocations.filter(e => !existing.has(e.location)).length
  }, [extractedLocations, locationReferences])

  const handleSaveDescription = (locationId: string) => {
    const updated = mergedLocations.map(loc =>
      loc.id === locationId ? { ...loc, description: descriptionText.trim() } : loc
    )
    onUpdateLocations(updated)
    setEditingDescriptionId(null)
    setDescriptionText('')
    toast.success('Location description updated')
  }

  const handleFileUpload = async (locationId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (onUploadLocationImage) {
      setUploadingForId(locationId)
      try {
        await onUploadLocationImage(locationId, file)
      } finally {
        setUploadingForId(null)
      }
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Extract Locations CTA */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleExtractLocations}
          disabled={isExtracting || scenes.length === 0}
          size="sm"
          className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white border-0"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {unextractedCount > 0
                ? `Extract Locations (${unextractedCount} new)`
                : mergedLocations.length > 0
                  ? 'Re-scan Script'
                  : `Scan Script (${scenes.length} scenes)`
              }
            </>
          )}
        </Button>
      </div>

      {/* Location Cards */}
      {mergedLocations.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg py-6 text-center">
          <MapPin className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="font-medium">No locations yet</p>
          <p className="text-xs mt-1">Click "Scan Script" to extract locations from scene headings</p>
          <p className="text-xs text-gray-400 mt-2">Location references ensure visual consistency<br />across scenes at the same location</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mergedLocations.map((loc) => {
            const isExpanded = expandedLocationId === loc.id
            const isGenerating = generatingLocationId === loc.id
            const isUploading = uploadingForId === loc.id
            const hasImage = !!loc.imageUrl

            return (
              <div
                key={loc.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden group"
              >
                {/* Header - always visible */}
                <button
                  onClick={() => setExpandedLocationId(isExpanded ? null : loc.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* INT/EXT badge */}
                    {loc.intExt && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        loc.intExt === 'INT' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        loc.intExt === 'EXT' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}>
                        {loc.intExt}
                      </span>
                    )}
                    {/* Location name */}
                    <span className="font-medium text-sm text-white truncate">{loc.location}</span>
                    {/* Time of day */}
                    <TimeIcon time={loc.timeOfDay} />
                    {/* Scene count */}
                    {loc.sceneNumbers && loc.sceneNumbers.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded flex-shrink-0">
                        {loc.sceneNumbers.length} scene{loc.sceneNumbers.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Image status indicator */}
                    {hasImage ? (
                      <Camera className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                    {/* Scene numbers */}
                    {loc.sceneNumbers && loc.sceneNumbers.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {loc.sceneNumbers.map(n => (
                          <span key={n} className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded">
                            Scene {n}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Description - editable */}
                    <div className="pt-1">
                      {editingDescriptionId === loc.id ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <textarea
                            value={descriptionText}
                            onChange={(e) => setDescriptionText(e.target.value)}
                            placeholder="Describe this location (e.g., Modern podcast studio with acoustic panels, professional lighting rig...)"
                            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setEditingDescriptionId(null); setDescriptionText('') }}
                              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveDescription(loc.id)}
                              className="px-2 py-1 text-xs bg-cyan-500 hover:bg-cyan-600 text-white rounded flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="text-xs text-gray-400 italic flex-1">
                            {loc.description || 'No description — click edit to add'}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingDescriptionId(loc.id)
                              setDescriptionText(loc.description || '')
                            }}
                            className="p-1 text-gray-400 hover:text-cyan-400 transition-colors flex-shrink-0"
                            title="Edit description"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Image Section */}
                    {hasImage ? (
                      <div className="relative aspect-video rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <img
                          src={loc.imageUrl}
                          alt={loc.location}
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay controls */}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all opacity-0 hover:opacity-100 flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedImageUrl(loc.imageUrl)
                              setExpandedImageName(loc.location)
                            }}
                            className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white transition-colors shadow-sm"
                            title="View full size"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          {onEditLocationImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditLocationImage(loc.id, loc.imageUrl)
                              }}
                              className="p-2 rounded-lg bg-purple-500/90 text-white hover:bg-purple-600 transition-colors shadow-sm"
                              title="Edit image"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPromptBuilderOpenFor(loc.id)
                            }}
                            disabled={isGenerating}
                            className="p-2 rounded-lg bg-cyan-500/90 text-white hover:bg-cyan-600 transition-colors shadow-sm disabled:opacity-50"
                            title="Regenerate with Prompt Builder"
                          >
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          </button>
                          <label className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white transition-colors shadow-sm cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(loc.id, e)}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-md bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center gap-2">
                        {isGenerating || isUploading ? (
                          <>
                            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                            <span className="text-xs text-gray-400">{isUploading ? 'Uploading...' : 'Generating...'}</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPromptBuilderOpenFor(loc.id)
                                }}
                                className="bg-cyan-600 hover:bg-cyan-700 text-white border-0 text-xs"
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Generate
                              </Button>
                              <label>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs cursor-pointer"
                                  asChild
                                >
                                  <span>
                                    <Upload className="w-3 h-3 mr-1" />
                                    Upload
                                  </span>
                                </Button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(loc.id, e)}
                                />
                              </label>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Remove button */}
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveLocation(loc.id)
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Location Prompt Builder Dialog */}
      {promptBuilderOpenFor && (
        <LocationPromptBuilder
          open={!!promptBuilderOpenFor}
          onClose={() => setPromptBuilderOpenFor(null)}
          location={mergedLocations.find(l => l.id === promptBuilderOpenFor) || null}
          isGenerating={generatingLocationId === promptBuilderOpenFor}
          screenplayContext={screenplayContext}
          onGenerateImage={(payload) => {
            setPromptBuilderOpenFor(null)
            if (onGenerateLocationImageWithPrompt) {
              onGenerateLocationImageWithPrompt(payload)
            } else if (onGenerateLocationImage) {
              // Fallback to legacy handler
              onGenerateLocationImage(payload.location)
            }
          }}
        />
      )}

      {/* Expanded Image Dialog */}
      <Dialog open={!!expandedImageUrl} onOpenChange={() => { setExpandedImageUrl(null); setExpandedImageName('') }}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black border-none">
          <DialogHeader className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10">
            <DialogTitle className="text-white">{expandedImageName}</DialogTitle>
            <DialogDescription className="text-gray-300">
              Location reference image
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center w-full h-full p-4">
            {expandedImageUrl && (
              <img
                src={expandedImageUrl}
                alt={expandedImageName}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

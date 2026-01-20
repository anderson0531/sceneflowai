'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { 
  Film, 
  Users, 
  MapPin, 
  Palette, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Target,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilmTreatmentVariant {
  title?: string
  genre?: string
  tone?: string
  tone_description?: string
  setting?: string
  visual_style?: string
  style?: string
  character_descriptions?: Array<{
    name: string
    role?: string
    description?: string
  }>
  logline?: string
  synopsis?: string
  narrative_style?: string
  key_themes?: string[]
  audience?: string
  beats?: Array<{
    title?: string
    beat_title?: string
    intent?: string
    minutes?: number
    description?: string
    emotional_arc?: string
  }>
  act_breakdown?: Array<{
    title?: string
    beat_title?: string
    intent?: string
    minutes?: number
    description?: string
    emotional_arc?: string
  }>
}

interface FilmTreatmentReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filmTreatmentVariant?: FilmTreatmentVariant | null
  filmTreatmentHtml?: string | null
  script?: {
    logline?: string
    scenes?: Array<{
      heading?: string | { text: string }
      description?: string
    }>
  } | null
  characters?: Array<{
    name: string
    role?: string
    description?: string
    appearance?: string
  }>
}

export function FilmTreatmentReviewModal({
  open,
  onOpenChange,
  filmTreatmentVariant,
  filmTreatmentHtml,
  script,
  characters = [],
}: FilmTreatmentReviewModalProps) {
  const [showFullTreatment, setShowFullTreatment] = useState(false)

  if (!filmTreatmentVariant) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-sf-primary" />
              Film Treatment Review
            </DialogTitle>
            <DialogDescription>
              No film treatment found for this project
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>Generate a film treatment in the Blueprint phase first.</p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const treatmentCharacters = filmTreatmentVariant.character_descriptions || []
  const sceneCount = script?.scenes?.length || 0
  const scriptLogline = script?.logline || ''
  
  // Compare treatment characters with Production Bible characters
  const characterMatches = treatmentCharacters.map(tc => {
    const match = characters.find(c => 
      c.name.toLowerCase().includes(tc.name.toLowerCase()) ||
      tc.name.toLowerCase().includes(c.name.toLowerCase())
    )
    return { ...tc, hasProductionMatch: !!match }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-sf-primary" />
            Film Treatment Review
          </DialogTitle>
          <DialogDescription>
            Verify your script aligns with the approved treatment
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Title & Logline */}
          {(filmTreatmentVariant.title || filmTreatmentVariant.logline) && (
            <div className="bg-gradient-to-br from-sf-primary/10 to-purple-500/5 border border-sf-primary/20 rounded-lg p-4">
              {filmTreatmentVariant.title && (
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                  {filmTreatmentVariant.title}
                </h3>
              )}
              {filmTreatmentVariant.logline && (
                <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                  "{filmTreatmentVariant.logline}"
                </p>
              )}
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <Palette className="w-4 h-4 mx-auto mb-1 text-purple-500" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Genre</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {filmTreatmentVariant.genre || '—'}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <Target className="w-4 h-4 mx-auto mb-1 text-blue-500" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Tone</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {filmTreatmentVariant.tone || filmTreatmentVariant.tone_description || '—'}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-amber-500" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Characters</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {treatmentCharacters.length}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
              <FileText className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Scenes</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {sceneCount}
              </div>
            </div>
          </div>

          {/* Setting & Visual Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(filmTreatmentVariant.setting) && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Setting</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {filmTreatmentVariant.setting}
                </p>
              </div>
            )}
            {(filmTreatmentVariant.visual_style || filmTreatmentVariant.style) && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Visual Style</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {filmTreatmentVariant.visual_style || filmTreatmentVariant.style}
                </p>
              </div>
            )}
          </div>

          {/* Characters Comparison */}
          {treatmentCharacters.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  Treatment Characters
                </h4>
              </div>
              <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                {characterMatches.map((char, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md",
                      char.hasProductionMatch 
                        ? "bg-emerald-50 dark:bg-emerald-900/20" 
                        : "bg-amber-50 dark:bg-amber-900/20"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {char.name}
                        </span>
                        {char.role && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({char.role})
                          </span>
                        )}
                      </div>
                      {char.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {char.description}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {char.hasProductionMatch ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500">
                <CheckCircle2 className="w-3 h-3 inline text-emerald-500 mr-1" /> In Production Bible
                <AlertCircle className="w-3 h-3 inline text-amber-500 ml-3 mr-1" /> Not yet in Production Bible
              </div>
            </div>
          )}

          {/* Key Themes */}
          {filmTreatmentVariant.key_themes && filmTreatmentVariant.key_themes.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Key Themes</div>
              <div className="flex flex-wrap gap-2">
                {filmTreatmentVariant.key_themes.map((theme, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Synopsis */}
          {filmTreatmentVariant.synopsis && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Synopsis</div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {filmTreatmentVariant.synopsis}
              </p>
            </div>
          )}

          {/* Story Beats */}
          {(() => {
            const beats = filmTreatmentVariant.beats || filmTreatmentVariant.act_breakdown
            if (!beats || beats.length === 0) return null
            return (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                  <ListOrdered className="w-4 h-4" />
                  Story Beats ({beats.length})
                </div>
                <div className="space-y-3">
                  {beats.map((beat, idx) => (
                    <div key={idx} className="flex gap-3 p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {beat.title || beat.beat_title || `Beat ${idx + 1}`}
                          </span>
                          {beat.minutes && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Clock className="w-3 h-3" />
                              {beat.minutes} min
                            </span>
                          )}
                        </div>
                        {(beat.intent || beat.description) && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {beat.intent || beat.description}
                          </p>
                        )}
                        {beat.emotional_arc && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 italic">
                            {beat.emotional_arc}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Full Treatment HTML (collapsible) */}
          {filmTreatmentHtml && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowFullTreatment(!showFullTreatment)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Full Treatment Document
                </span>
                {showFullTreatment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFullTreatment && (
                <div 
                  className="p-4 prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: filmTreatmentHtml }}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

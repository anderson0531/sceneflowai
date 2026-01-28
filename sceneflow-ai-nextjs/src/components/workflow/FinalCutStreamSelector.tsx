'use client'

import React, { useMemo, useCallback } from 'react'
import { 
  Clapperboard, 
  Video, 
  AlertCircle, 
  CheckCircle2,
  Film,
  ChevronDown,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { 
  SceneStreamSelection, 
  FinalCutConfig,
  FinalCutExportSettings,
  DEFAULT_FINAL_CUT_SETTINGS 
} from '@/types/productionStreams'
import type { ProductionStream, ProductionStreamType } from '@/components/vision/scene-production/types'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'

// ============================================================================
// Types
// ============================================================================

export interface SceneInfo {
  id: string
  number: number
  title: string
  thumbnailUrl?: string
  productionStreams: ProductionStream[]
}

interface FinalCutStreamSelectorProps {
  /** All scenes with their production streams */
  scenes: SceneInfo[]
  /** Current selections for each scene */
  selections: SceneStreamSelection[]
  /** Primary language for the export */
  primaryLanguage: string
  /** Callback when selection changes */
  onSelectionChange: (selections: SceneStreamSelection[]) => void
  /** Callback when primary language changes */
  onLanguageChange: (language: string) => void
  /** Disabled state */
  disabled?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const FLAG_EMOJIS: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇧🇷',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  th: '🇹🇭',
  hi: '🇮🇳',
  ar: '🇸🇦',
  ru: '🇷🇺'
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find the best available stream for a scene matching the criteria
 */
function findBestStream(
  streams: ProductionStream[],
  preferredType: ProductionStreamType,
  preferredLanguage: string
): ProductionStream | null {
  // First try exact match: type + language
  const exactMatch = streams.find(
    s => s.streamType === preferredType && 
         s.language === preferredLanguage && 
         s.status === 'complete'
  )
  if (exactMatch) return exactMatch
  
  // Try same type, any language
  const sameType = streams.find(
    s => s.streamType === preferredType && s.status === 'complete'
  )
  if (sameType) return sameType
  
  // Try same language, any type
  const sameLanguage = streams.find(
    s => s.language === preferredLanguage && s.status === 'complete'
  )
  if (sameLanguage) return sameLanguage
  
  // Any complete stream
  const anyComplete = streams.find(s => s.status === 'complete')
  return anyComplete || null
}

/**
 * Get available languages from all scenes
 */
function getAvailableLanguages(scenes: SceneInfo[]): string[] {
  const languageSet = new Set<string>()
  scenes.forEach(scene => {
    scene.productionStreams.forEach(stream => {
      if (stream.status === 'complete') {
        languageSet.add(stream.language)
      }
    })
  })
  return Array.from(languageSet)
}

// ============================================================================
// Scene Row Component
// ============================================================================

interface SceneRowProps {
  scene: SceneInfo
  selection: SceneStreamSelection
  onSelectionChange: (selection: SceneStreamSelection) => void
  primaryLanguage: string
  disabled?: boolean
}

function SceneRow({
  scene,
  selection,
  onSelectionChange,
  primaryLanguage,
  disabled = false
}: SceneRowProps) {
  // Get available stream options for this scene
  const animaticStreams = scene.productionStreams.filter(
    s => (!s.streamType || s.streamType === 'animatic') && s.status === 'complete'
  )
  const videoStreams = scene.productionStreams.filter(
    s => s.streamType === 'video' && s.status === 'complete'
  )
  
  const hasAnimatic = animaticStreams.length > 0
  const hasVideo = videoStreams.length > 0
  const hasAny = hasAnimatic || hasVideo
  
  // Get current stream details
  const currentStreams = selection.streamType === 'video' ? videoStreams : animaticStreams
  const selectedStream = currentStreams.find(s => s.id === selection.streamId)
  
  // Available languages for current stream type
  const availableLanguages = currentStreams.map(s => s.language)
  
  const handleTypeChange = (type: ProductionStreamType) => {
    const streams = type === 'video' ? videoStreams : animaticStreams
    const bestStream = findBestStream(streams, type, primaryLanguage)
    
    onSelectionChange({
      ...selection,
      streamType: type,
      language: bestStream?.language || primaryLanguage,
      streamId: bestStream?.id,
      isValid: !!bestStream
    })
  }
  
  const handleLanguageChange = (language: string) => {
    const streams = selection.streamType === 'video' ? videoStreams : animaticStreams
    const matchingStream = streams.find(s => s.language === language)
    
    onSelectionChange({
      ...selection,
      language,
      streamId: matchingStream?.id,
      isValid: !!matchingStream
    })
  }
  
  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border ${
      selection.isValid 
        ? 'bg-gray-800/50 border-gray-700/50' 
        : 'bg-red-900/10 border-red-700/30'
    }`}>
      {/* Scene thumbnail and info */}
      <div className="flex items-center gap-3 min-w-[180px]">
        {scene.thumbnailUrl ? (
          <img 
            src={scene.thumbnailUrl} 
            alt={`Scene ${scene.number}`}
            className="w-16 h-9 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-9 bg-gray-700 rounded flex items-center justify-center">
            <Film className="w-4 h-4 text-gray-500" />
          </div>
        )}
        <div>
          <span className="font-medium text-gray-200">Scene {scene.number}</span>
          {scene.title && (
            <p className="text-xs text-gray-500 truncate max-w-[100px]">{scene.title}</p>
          )}
        </div>
      </div>
      
      {/* Stream type selection */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleTypeChange('animatic')}
          disabled={disabled || !hasAnimatic}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
            selection.streamType === 'animatic'
              ? 'bg-purple-600 text-white'
              : hasAnimatic
              ? 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Clapperboard className="w-4 h-4" />
          Animatic
          {hasAnimatic && (
            <span className="text-xs opacity-70">({animaticStreams.length})</span>
          )}
        </button>
        
        <button
          onClick={() => handleTypeChange('video')}
          disabled={disabled || !hasVideo}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
            selection.streamType === 'video'
              ? 'bg-indigo-600 text-white'
              : hasVideo
              ? 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Video className="w-4 h-4" />
          Video
          {hasVideo && (
            <span className="text-xs opacity-70">({videoStreams.length})</span>
          )}
        </button>
      </div>
      
      {/* Language selection */}
      <div className="flex-1">
        {hasAny && availableLanguages.length > 0 ? (
          <Select
            value={selection.language}
            onValueChange={handleLanguageChange}
            disabled={disabled || availableLanguages.length <= 1}
          >
            <SelectTrigger className="w-[140px] h-8 bg-gray-800 border-gray-600 text-sm">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              {availableLanguages.map(lang => {
                const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang)
                return (
                  <SelectItem key={lang} value={lang} className="text-gray-200">
                    {FLAG_EMOJIS[lang] || '🌐'} {langInfo?.name || lang}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-gray-500">No streams</span>
        )}
      </div>
      
      {/* Status indicator */}
      <div className="w-6">
        {selection.isValid ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-500" title="No stream available" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function FinalCutStreamSelector({
  scenes,
  selections,
  primaryLanguage,
  onSelectionChange,
  onLanguageChange,
  disabled = false
}: FinalCutStreamSelectorProps) {
  // Get all available languages across all scenes
  const availableLanguages = useMemo(() => getAvailableLanguages(scenes), [scenes])
  
  // Count valid selections
  const validCount = useMemo(
    () => selections.filter(s => s.isValid).length,
    [selections]
  )
  
  // Check if all scenes have valid selections
  const allValid = validCount === scenes.length
  
  // Handle individual scene selection change
  const handleSceneSelectionChange = useCallback((updatedSelection: SceneStreamSelection) => {
    const newSelections = selections.map(sel =>
      sel.sceneId === updatedSelection.sceneId ? updatedSelection : sel
    )
    onSelectionChange(newSelections)
  }, [selections, onSelectionChange])
  
  // Set all scenes to animatic or video
  const handleSetAllType = useCallback((type: ProductionStreamType) => {
    const newSelections = selections.map(sel => {
      const scene = scenes.find(s => s.id === sel.sceneId)
      if (!scene) return sel
      
      const streams = type === 'video' 
        ? scene.productionStreams.filter(s => s.streamType === 'video' && s.status === 'complete')
        : scene.productionStreams.filter(s => (!s.streamType || s.streamType === 'animatic') && s.status === 'complete')
      
      const bestStream = findBestStream(streams, type, primaryLanguage)
      
      return {
        ...sel,
        streamType: type,
        language: bestStream?.language || primaryLanguage,
        streamId: bestStream?.id,
        isValid: !!bestStream
      }
    })
    onSelectionChange(newSelections)
  }, [selections, scenes, primaryLanguage, onSelectionChange])
  
  return (
    <div className="space-y-4">
      {/* Header with global controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-medium text-gray-200">Stream Selection</h3>
          <span className={`px-2 py-0.5 text-xs rounded ${
            allValid ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {validCount}/{scenes.length} ready
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Primary language selector */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-500" />
            <Select
              value={primaryLanguage}
              onValueChange={onLanguageChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-[140px] h-8 bg-gray-800 border-gray-600 text-sm">
                <SelectValue placeholder="Primary language" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <SelectItem key={lang.code} value={lang.code} className="text-gray-200">
                    {FLAG_EMOJIS[lang.code] || '🌐'} {lang.name}
                    {availableLanguages.includes(lang.code) && ' ✓'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Set all buttons */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSetAllType('animatic')}
            disabled={disabled}
            className="h-8 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          >
            <Clapperboard className="w-4 h-4 mr-1" />
            All Animatic
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSetAllType('video')}
            disabled={disabled}
            className="h-8 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
          >
            <Video className="w-4 h-4 mr-1" />
            All Video
          </Button>
        </div>
      </div>
      
      {/* Scene list */}
      <div className="space-y-2">
        {scenes.map(scene => {
          const selection = selections.find(s => s.sceneId === scene.id) || {
            sceneId: scene.id,
            streamType: 'animatic' as ProductionStreamType,
            language: primaryLanguage,
            isValid: false
          }
          
          return (
            <SceneRow
              key={scene.id}
              scene={scene}
              selection={selection}
              onSelectionChange={handleSceneSelectionChange}
              primaryLanguage={primaryLanguage}
              disabled={disabled}
            />
          )
        })}
      </div>
      
      {/* Warning if not all valid */}
      {!allValid && (
        <div className="flex items-center gap-2 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <p className="text-sm text-amber-300">
            {scenes.length - validCount} scene(s) missing production streams. 
            Render streams in the Production phase before exporting.
          </p>
        </div>
      )}
    </div>
  )
}

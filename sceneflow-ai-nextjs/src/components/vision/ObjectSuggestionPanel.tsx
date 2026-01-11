'use client'

import React, { useState, useCallback } from 'react'
import { 
  Sparkles, 
  Check, 
  X, 
  Edit3, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Image as ImageIcon,
  AlertCircle,
  Package,
  Wand2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import { ObjectSuggestion, ObjectCategory, ObjectImportance, VisualReference } from '@/types/visionReferences'
import { cn } from '@/lib/utils'

interface ObjectSuggestionPanelProps {
  /** Script scenes for analysis */
  scenes: Array<{
    sceneNumber: number
    heading?: string
    action?: string
    visualDescription?: string
    description?: string
  }>
  /** Already added objects to exclude from suggestions */
  existingObjects: VisualReference[]
  /** Callback when an object is generated and should be added to the library */
  onObjectGenerated: (object: {
    name: string
    description: string
    imageUrl: string
    category: ObjectCategory
    importance: ObjectImportance
    generationPrompt: string
    aiGenerated: boolean
  }) => void
  /** Compact mode for sidebar */
  compact?: boolean
}

const CATEGORY_COLORS: Record<ObjectCategory, string> = {
  'prop': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  'vehicle': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  'set-piece': 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  'costume': 'bg-pink-500/20 text-pink-400 border-pink-500/40',
  'technology': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  'other': 'bg-gray-500/20 text-gray-400 border-gray-500/40'
}

const IMPORTANCE_COLORS: Record<ObjectImportance, string> = {
  'critical': 'bg-red-500/20 text-red-400',
  'important': 'bg-orange-500/20 text-orange-400',
  'background': 'bg-slate-500/20 text-slate-400'
}

interface SuggestionCardProps {
  suggestion: ObjectSuggestion
  isGenerating: boolean
  onGenerate: (suggestion: ObjectSuggestion, editedPrompt: string) => void
  onDismiss: (id: string) => void
}

function SuggestionCard({ suggestion, isGenerating, onGenerate, onDismiss }: SuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState(suggestion.suggestedPrompt)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 space-y-2">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-white truncate">{suggestion.name}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', CATEGORY_COLORS[suggestion.category])}>
              {suggestion.category}
            </span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', IMPORTANCE_COLORS[suggestion.importance])}>
              {suggestion.importance}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{suggestion.description}</p>
          {suggestion.sceneNumbers.length > 0 && (
            <p className="text-[10px] text-slate-500 mt-1">
              Scenes: {suggestion.sceneNumbers.join(', ')}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          title="Dismiss suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Prompt Section */}
      <div className="space-y-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isEditing ? 'Editing prompt...' : 'View/Edit prompt'}
        </button>
        
        {expanded && (
          <div className="space-y-2">
            {isEditing ? (
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="text-xs min-h-[80px] bg-slate-900/50 border-slate-600"
                placeholder="Image generation prompt..."
              />
            ) : (
              <p className="text-xs text-slate-400 bg-slate-900/50 rounded p-2 border border-slate-700">
                {editedPrompt}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs h-7"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                {isEditing ? 'Done' : 'Edit'}
              </Button>
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditedPrompt(suggestion.suggestedPrompt)
                    setIsEditing(false)
                  }}
                  className="text-xs h-7 text-slate-500"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => onGenerate(suggestion, editedPrompt)}
          disabled={isGenerating}
          className="flex-1 bg-sf-primary/20 hover:bg-sf-primary/30 text-sf-primary border border-sf-primary/40"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-3 h-3 mr-1" />
              Generate Reference
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function ObjectSuggestionPanel({ 
  scenes, 
  existingObjects, 
  onObjectGenerated,
  compact = false 
}: ObjectSuggestionPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<ObjectSuggestion[]>([])
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const analyzeScenesForObjects = useCallback(async () => {
    if (scenes.length === 0) return
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/vision/suggest-objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            heading: s.heading,
            action: s.action,
            visualDescription: s.visualDescription,
            description: s.description
          })),
          existingObjects: existingObjects.map(o => o.name)
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to analyze script')
      }

      const data = await response.json()
      setSuggestions(data.suggestions || [])
      setHasAnalyzed(true)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze script for objects')
    } finally {
      setIsAnalyzing(false)
    }
  }, [scenes, existingObjects])

  const handleGenerate = useCallback(async (suggestion: ObjectSuggestion, prompt: string) => {
    setGeneratingIds(prev => new Set(prev).add(suggestion.id))
    
    try {
      const response = await fetch('/api/vision/generate-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestion.name,
          description: suggestion.description,
          prompt,
          category: suggestion.category
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate object image')
      }

      const data = await response.json()
      
      // Add to library
      onObjectGenerated({
        name: suggestion.name,
        description: suggestion.description,
        imageUrl: data.imageUrl,
        category: suggestion.category,
        importance: suggestion.importance,
        generationPrompt: prompt,
        aiGenerated: true
      })

      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    } catch (err: any) {
      setError(err.message || 'Failed to generate object')
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev)
        next.delete(suggestion.id)
        return next
      })
    }
  }, [onObjectGenerated])

  const handleDismiss = useCallback((id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }, [])

  // Don't show if no scenes
  if (scenes.length === 0) return null

  return (
    <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">AI Object Suggestions</span>
          {suggestions.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
              {suggestions.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Analysis Button or Results */}
          {!hasAnalyzed ? (
            <div className="text-center py-4">
              <p className="text-xs text-slate-400 mb-3">
                Analyze your script to discover props, vehicles, and set pieces that need visual references.
              </p>
              <Button
                onClick={analyzeScenesForObjects}
                disabled={isAnalyzing}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing {scenes.length} scenes...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Suggest Objects from Script
                  </>
                )}
              </Button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-4">
              <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                No additional objects suggested. Your script analysis is complete!
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={analyzeScenesForObjects}
                disabled={isAnalyzing}
                className="mt-2 text-xs"
              >
                Re-analyze
              </Button>
            </div>
          ) : (
            <>
              {/* Suggestion Cards */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {suggestions.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    isGenerating={generatingIds.has(suggestion.id)}
                    onGenerate={handleGenerate}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
              
              {/* Re-analyze button */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={analyzeScenesForObjects}
                  disabled={isAnalyzing}
                  className="text-xs text-slate-500"
                >
                  {isAnalyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Re-analyze Script
                </Button>
              </div>
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

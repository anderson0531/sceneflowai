'use client'

import React, { useState } from 'react'
import { Users, Plus, RefreshCw, Loader, Wand2, Upload, Scan, X, ChevronDown, Check, Settings, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CharacterPromptBuilder } from '@/components/blueprint/CharacterPromptBuilder'

interface CharacterLibraryProps {
  characters: any[]
  onRegenerateCharacter: (characterId: string) => void
  onGenerateCharacter: (characterId: string, prompt: string) => void
  onUploadCharacter: (characterId: string, file: File) => void
  onApproveCharacter: (characterId: string) => void
  onUpdateCharacterAttributes?: (characterId: string, attributes: any) => void
  compact?: boolean
}

export function CharacterLibrary({ characters, onRegenerateCharacter, onGenerateCharacter, onUploadCharacter, onApproveCharacter, onUpdateCharacterAttributes, compact = false }: CharacterLibraryProps) {
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [charPrompts, setCharPrompts] = useState<Record<string, string>>({})
  const [generatingChars, setGeneratingChars] = useState<Set<string>>(new Set())
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderCharId, setBuilderCharId] = useState<string | null>(null)
  const [analyzingImage, setAnalyzingImage] = useState<Record<string, boolean>>({})
  const [uploadingRef, setUploadingRef] = useState<Record<string, boolean>>({})
  const [zoomedImage, setZoomedImage] = useState<{url: string; name: string} | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, string | null>>({})
  
  const handleToggleSection = (charId: string, section: 'coreIdentity' | 'appearance') => {
    const key = `${charId}-${section === 'coreIdentity' ? 'core' : 'appear'}`
    setExpandedSections(prev => ({
      ...prev,
      [charId]: prev[charId] === key ? null : key
    }))
  }
  
  const handleUploadReference = async (characterId: string, file: File, characterName: string) => {
    setUploadingRef(prev => ({ ...prev, [characterId]: true }))
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', 'vision-project') // TODO: Get from context
      formData.append('characterName', characterName)
      
      const res = await fetch('/api/character/upload-reference', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      if (data.success) {
        // Call parent handler to update character
        onUploadCharacter(characterId, file)
        try { const { toast } = require('sonner'); toast('Reference image uploaded') } catch {}
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('[Upload Reference] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload'
      try { const { toast } = require('sonner'); toast(errorMessage) } catch {}
    } finally {
      setUploadingRef(prev => ({ ...prev, [characterId]: false }))
    }
  }
  
  const handleAnalyzeImage = async (characterId: string, imageUrl: string, characterName: string) => {
    setAnalyzingImage(prev => ({ ...prev, [characterId]: true }))
    
    try {
      const res = await fetch('/api/character/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, characterName })
      })
      
      const data = await res.json()
      if (data.success && data.attributes) {
        console.log('[Analyze Image] Extracted attributes:', data.attributes)
        
        // Update character attributes via parent callback
        if (onUpdateCharacterAttributes) {
          onUpdateCharacterAttributes(characterId, data.attributes)
        }
        
        try { 
          const { toast } = require('sonner')
          toast.success('Character attributes extracted and updated!')
        } catch {}
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
    } catch (error) {
      console.error('[Analyze Image] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze'
      try { 
        const { toast } = require('sonner')
        toast.error(errorMessage)
      } catch {}
    } finally {
      setAnalyzingImage(prev => ({ ...prev, [characterId]: false }))
    }
  }
  
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${compact ? 'p-4' : 'p-6'} h-full overflow-y-auto`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-4' : 'mb-6'}`}>
        <div className="flex items-center gap-2">
          <Users className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-sf-primary`} />
          <h3 className={`${compact ? 'text-sm font-medium' : 'font-semibold'} text-gray-900 dark:text-gray-100`}>
            {compact ? 'Characters' : 'Character Library'}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {characters.length}
          </span>
        </div>
        
        {!compact && (
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Character</span>
          </Button>
        )}
      </div>
      
      {characters.length === 0 ? (
        <div className={`text-center ${compact ? 'py-8' : 'py-12'} text-gray-500 dark:text-gray-400`}>
          <Users className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} mx-auto mb-2 text-gray-300 dark:text-gray-600`} />
          <p className={compact ? 'text-sm' : ''}>No characters yet</p>
        </div>
      ) : (
        <div className={`${compact ? 'space-y-3' : 'grid grid-cols-2 lg:grid-cols-3 gap-4'}`}>
          {characters.map((char, idx) => {
            const charId = char.id || idx.toString()
            // Use saved imagePrompt if available, otherwise generate default
            const savedPrompt = char.imagePrompt
            const defaultPrompt = `Professional character portrait of ${char.name}: ${char.description || char.role || 'character'}`
            return (
              <CharacterCard
                key={charId}
                character={char}
                characterId={charId}
                isSelected={selectedChar === charId}
                onClick={() => setSelectedChar(charId)}
                onRegenerate={() => onRegenerateCharacter(charId)}
                onGenerate={async (prompt) => {
                  setGeneratingChars(prev => new Set(prev).add(charId))
                  try {
                    await onGenerateCharacter(charId, prompt)
                  } finally {
                    // Clear loading state after generation completes
                    setGeneratingChars(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(charId)
                      return newSet
                    })
                  }
                }}
                onUpload={(file) => onUploadCharacter(charId, file)}
                onApprove={() => onApproveCharacter(charId)}
                onOpenBuilder={() => {
                  setBuilderCharId(charId)
                  setBuilderOpen(true)
                }}
                onAnalyze={handleAnalyzeImage}
                analyzingImage={analyzingImage[charId]}
                prompt={charPrompts[charId] || savedPrompt || defaultPrompt}
                onPromptChange={(prompt) => setCharPrompts(prev => ({ ...prev, [charId]: prompt }))}
                isGenerating={generatingChars.has(charId)}
                expandedCharId={expandedSections[charId]}
                onToggleExpand={handleToggleSection}
              />
            )
          })}
        </div>
      )}
      
      {/* Prompt Builder Modal */}
      {builderCharId && (() => {
        const character = characters.find((c, idx) => (c.id || idx.toString()) === builderCharId)
        const initialStructure = character ? {
          subject: character.subject || character.name || '',
          ethnicity: character.ethnicity || '',
          keyFeature: character.keyFeature || '',
          hairStyle: character.hairStyle || '',
          hairColor: character.hairColor || '',
          eyeColor: character.eyeColor || '',
          eyeExpression: character.expression || '',
          build: character.build || '',
        } : undefined
        
        return (
          <CharacterPromptBuilder
            open={builderOpen}
            onClose={() => setBuilderOpen(false)}
            initialPrompt={charPrompts[builderCharId] || character?.imagePrompt || ''}
            initialStructure={initialStructure}
            characterName={character?.name || 'Character'}
            onApply={(prompt, structure) => {
              setCharPrompts(prev => ({ ...prev, [builderCharId]: prompt }))
              setBuilderOpen(false)
            }}
          />
        )
      })()}
      
      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={zoomedImage.url} 
              alt={zoomedImage.name}
              className="max-w-full max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="text-white font-medium">{zoomedImage.name}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface CharacterCardProps {
  character: any
  characterId: string
  isSelected: boolean
  onClick: () => void
  onRegenerate: () => void
  onGenerate: (prompt: string) => void
  onUpload: (file: File) => void
  onApprove: () => void
  onOpenBuilder: () => void
  onAnalyze?: (characterId: string, imageUrl: string, characterName: string) => void
  analyzingImage?: boolean
  prompt: string
  onPromptChange: (prompt: string) => void
  isGenerating: boolean
  expandedCharId?: string | null
  onToggleExpand?: (charId: string, section: 'coreIdentity' | 'appearance') => void
}

function CharacterCard({ character, characterId, isSelected, onClick, onRegenerate, onGenerate, onUpload, onApprove, onOpenBuilder, onAnalyze, analyzingImage, prompt, onPromptChange, isGenerating, expandedCharId, onToggleExpand }: CharacterCardProps) {
  const hasImage = !!character.referenceImage
  const isApproved = character.imageApproved === true
  const isCoreExpanded = expandedCharId === `${characterId}-core`
  const isAppearanceExpanded = expandedCharId === `${characterId}-appear`
  return (
    <div 
      onClick={onClick}
      className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
        isSelected 
          ? 'border-sf-primary ring-2 ring-sf-primary' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Character Image */}
      <div 
        className="aspect-square bg-gray-100 dark:bg-gray-800 relative cursor-pointer hover:opacity-90 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          if (character.referenceImage) {
            // TODO: Pass setZoomedImage from parent
            console.log('Zoom image:', character.referenceImage)
          }
        }}
        title={character.referenceImage ? "Click to enlarge" : undefined}
      >
        {character.referenceImage ? (
          <img 
            src={character.referenceImage} 
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl text-gray-400 dark:text-gray-500 mb-2">
              {character.name?.[0] || '?'}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">No image</span>
          </div>
        )}
        
        {/* Prominent loading overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-10">
            <Loader className="w-12 h-12 animate-spin text-blue-400 mb-3" />
            <span className="text-sm text-white font-medium">Generating Image...</span>
            <span className="text-xs text-gray-300 mt-1">Please wait</span>
          </div>
        )}
      </div>
      
      {/* Character Info */}
      <div className="p-3 bg-white dark:bg-gray-800 space-y-2">
        <div>
          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{character.name || 'Unnamed'}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{character.role || 'Character'}</div>
        </div>
        
        {/* Character Attributes */}
        {(character.subject || character.ethnicity || character.keyFeature) && (
          <div className="space-y-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand?.(characterId, 'coreIdentity')
              }}
              className="flex items-center justify-between w-full text-xs font-semibold text-purple-400 dark:text-purple-300 hover:text-purple-300 dark:hover:text-purple-200 transition-colors"
            >
              <span>Core Identity</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isCoreExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isCoreExpanded && (
              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                {character.subject && (
                  <div><span className="text-gray-400">Subject:</span> {character.subject}</div>
                )}
                {character.ethnicity && (
                  <div><span className="text-gray-400">Ethnicity:</span> {character.ethnicity}</div>
                )}
                {character.keyFeature && (
                  <div><span className="text-gray-400">Key Feature:</span> {character.keyFeature}</div>
                )}
              </div>
            )}
          </div>
        )}
        
        {(character.hairStyle || character.hairColor || character.eyeColor || character.expression || character.build) && (
          <div className="space-y-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand?.(characterId, 'appearance')
              }}
              className="flex items-center justify-between w-full text-xs font-semibold text-blue-400 dark:text-blue-300 hover:text-blue-300 dark:hover:text-blue-200 transition-colors"
            >
              <span>Appearance</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isAppearanceExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isAppearanceExpanded && (
              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
                {character.hairStyle && (
                  <div><span className="text-gray-400">Hair Style:</span> {character.hairStyle}</div>
                )}
                {character.hairColor && (
                  <div><span className="text-gray-400">Hair Color:</span> {character.hairColor}</div>
                )}
                {character.eyeColor && (
                  <div><span className="text-gray-400">Eyes:</span> {character.eyeColor}</div>
                )}
                {character.expression && (
                  <div><span className="text-gray-400">Expression:</span> {character.expression}</div>
                )}
                {character.build && (
                  <div><span className="text-gray-400">Build:</span> {character.build}</div>
                )}
              </div>
            )}
          </div>
        )}
        
        {character.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-1.5">
            {character.description}
          </div>
        )}
      </div>
      
      {/* Controls Section - Below character info, NOT overlaying */}
      <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
        {/* Status indicator */}
        {hasImage && !isApproved && (
          <div className="text-[10px] text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            Pending approval
          </div>
        )}
        
        {/* Icon-based action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenBuilder()
            }}
            disabled={isGenerating}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            title="Edit Character Prompt"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); onGenerate(prompt); }}
            disabled={isGenerating || !prompt.trim()}
            className="p-2 rounded-lg bg-purple-600 border border-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            title={hasImage ? "Regenerate character image" : "Generate character image"}
          >
            {isGenerating ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </button>
          
          <label 
            className={`p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all shadow-sm ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title="Upload reference image"
          >
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isGenerating}
              onChange={(e) => {
                e.stopPropagation()
                const file = e.target.files?.[0]
                if (file) onUpload(file)
              }}
            />
          </label>
          
          {hasImage && (
            <>
              <button
                onClick={(e) => { 
                  e.stopPropagation()
                  if (onAnalyze && character.referenceImage) {
                    onAnalyze(characterId, character.referenceImage, character.name)
                  }
                }}
                disabled={isGenerating || analyzingImage}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                title="Analyze image to extract attributes"
              >
                {analyzingImage ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Scan className="w-4 h-4" />
                )}
              </button>
              
              {!isApproved && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation()
                    onApprove()
                  }}
                  disabled={isGenerating}
                  className="p-2 rounded-lg bg-green-600 border border-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  title="Approve character image"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Regenerate button for approved images - top-right corner */}
      {isApproved && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Regenerate character"
          >
            <RefreshCw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      )}
    </div>
  )
}


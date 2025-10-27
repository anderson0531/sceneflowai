'use client'

import React, { useState, useEffect } from 'react'
import { Users, Plus, RefreshCw, Loader, Wand2, Upload, Scan, X, ChevronDown, Check, Settings, Sparkles, Lightbulb, AlertTriangle, Info, Volume2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CharacterPromptBuilder } from '@/components/blueprint/CharacterPromptBuilder'
import { VoiceSelector } from '@/components/tts/VoiceSelector'
import { toast } from 'sonner'

interface CharacterLibraryProps {
  characters: any[]
  onRegenerateCharacter: (characterId: string) => void
  onGenerateCharacter: (characterId: string, prompt: string) => void
  onUploadCharacter: (characterId: string, file: File) => void
  onApproveCharacter: (characterId: string) => void
  onUpdateCharacterAttributes?: (characterId: string, attributes: any) => void
  onUpdateCharacterVoice?: (characterId: string, voiceConfig: any) => void
  ttsProvider: 'google' | 'elevenlabs'  // ADD THIS
  compact?: boolean
}

export function CharacterLibrary({ characters, onRegenerateCharacter, onGenerateCharacter, onUploadCharacter, onApproveCharacter, onUpdateCharacterAttributes, onUpdateCharacterVoice, ttsProvider, compact = false }: CharacterLibraryProps) {
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [charPrompts, setCharPrompts] = useState<Record<string, string>>({})
  const [generatingChars, setGeneratingChars] = useState<Set<string>>(new Set())
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderCharId, setBuilderCharId] = useState<string | null>(null)
  const [analyzingImage, setAnalyzingImage] = useState<Record<string, boolean>>({})
  const [uploadingRef, setUploadingRef] = useState<Record<string, boolean>>({})
  const [zoomedImage, setZoomedImage] = useState<{url: string; name: string} | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, string | null>>({})
  const [needsReupload, setNeedsReupload] = useState<Record<string, boolean>>({})
  const [showProTips, setShowProTips] = useState(false)
  const [voiceSectionExpanded, setVoiceSectionExpanded] = useState<Record<string, boolean>>({})
  
  // Detect low-resolution images that need re-upload
  useEffect(() => {
    const warnings: Record<string, boolean> = {}
    characters.forEach(char => {
      const charId = char.id || characters.indexOf(char).toString()
      if (char.referenceImage) {
        // Detect data URL (old method)
        if (char.referenceImage.startsWith('data:')) {
          // Estimate size from data URL length
          const base64Length = char.referenceImage.split(',')[1]?.length || 0
          const estimatedKB = (base64Length * 0.75) / 1024
          
          if (estimatedKB < 50) {
            warnings[charId] = true
          }
        }
      }
    })
    setNeedsReupload(warnings)
  }, [characters])
  
  const handleToggleSection = (charId: string, section: 'coreIdentity' | 'appearance') => {
    const key = `${charId}-${section === 'coreIdentity' ? 'core' : 'appear'}`
    setExpandedSections(prev => ({
      ...prev,
      [charId]: prev[charId] === key ? null : key
    }))
  }
  
  const handleToggleVoiceSection = (charId: string) => {
    setVoiceSectionExpanded(prev => ({
      ...prev,
      [charId]: !prev[charId]
    }))
  }
  
  const handleUploadReference = async (characterId: string, file: File, characterName: string) => {
    // Validate file size (warn if > 5MB, block if > 10MB)
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > 10) {
      toast.error('Image too large. Please use images under 10MB.')
      return
    }
    
    if (sizeMB > 5) {
      toast.warning(`Large image (${sizeMB.toFixed(1)}MB). Consider using smaller images for better performance.`)
    }
    
    // Validate image dimensions
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl)
      
      if (img.width < 256 || img.height < 256) {
        toast.warning('Image resolution is low. Use at least 512x512 for best facial recognition.')
      }
      
      // Proceed with upload
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
          toast.success('Reference image uploaded successfully!')
        } else {
          throw new Error(data.error || 'Upload failed')
        }
      } catch (error) {
        console.error('[Upload Reference] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload'
        toast.error(errorMessage)
      } finally {
        setUploadingRef(prev => ({ ...prev, [characterId]: false }))
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      toast.error('Invalid image file')
    }
    
    img.src = objectUrl
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
      if (data.success) {
        // Extract attributes (API returns them at top level, not nested)
        const { success, ...attributes } = data
        console.log('[Analyze Image] Extracted attributes:', attributes)
        
        // Update character attributes via parent callback
        if (onUpdateCharacterAttributes) {
          await onUpdateCharacterAttributes(characterName, attributes)
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
          
          {/* Pro Tips Toggle Button */}
          <button
            onClick={() => setShowProTips(prev => !prev)}
            className="ml-2 p-1.5 rounded-full hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors"
            title={showProTips ? "Hide Pro Tips" : "Show Pro Tips"}
          >
            <Info className="w-4 h-4" />
          </button>
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
          {/* Narrator Character Card - Always show first */}
          {characters.find(char => char.type === 'narrator') && (
            <NarratorCharacterCard
              character={characters.find(char => char.type === 'narrator')!}
              onUpdateCharacterVoice={onUpdateCharacterVoice}
              ttsProvider={ttsProvider}
            />
          )}
          
          {/* Regular Character Cards */}
          {characters.filter(char => char.type !== 'narrator').map((char, idx) => {
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
                onUpdateCharacterVoice={onUpdateCharacterVoice}
                ttsProvider={ttsProvider}
                voiceSectionExpanded={voiceSectionExpanded[charId] || false}
                onToggleVoiceSection={() => handleToggleVoiceSection(charId)}
              />
            )
          })}
        </div>
      )}
      
      {/* Image Upload Pro Tips - Collapsible */}
      {showProTips && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg transition-all duration-300 ease-in-out">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-300 mb-2">
                Pro Tips: Character Reference Images
              </h4>
              <ul className="text-xs text-blue-400/80 space-y-1.5">
                <li>• <span className="font-medium">Resolution:</span> Use high-quality images (at least 512x512 pixels)</li>
                <li>• <span className="font-medium">Composition:</span> Clear, well-lit headshots work best for facial recognition</li>
                <li>• <span className="font-medium">File Size:</span> Keep images under 5MB for optimal performance</li>
                <li>• <span className="font-medium">Lighting:</span> Avoid harsh shadows or extreme lighting that obscures facial features</li>
                <li>• <span className="font-medium">Expression:</span> Neutral or calm expressions provide the most consistent results</li>
              </ul>
            </div>
          </div>
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
              // Reset builder state for next use
              setTimeout(() => setBuilderCharId(null), 300)
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
  onUpdateCharacterVoice?: (characterId: string, voiceConfig: any) => void
  ttsProvider: 'google' | 'elevenlabs'  // ADD THIS
  voiceSectionExpanded?: boolean
  onToggleVoiceSection?: () => void
}

function CharacterCard({ character, characterId, isSelected, onClick, onRegenerate, onGenerate, onUpload, onApprove, onOpenBuilder, onAnalyze, analyzingImage, prompt, onPromptChange, isGenerating, expandedCharId, onToggleExpand, onUpdateCharacterVoice, ttsProvider, voiceSectionExpanded, onToggleVoiceSection }: CharacterCardProps) {
  const hasImage = !!character.referenceImage
  const isApproved = character.imageApproved === true
  const isCoreExpanded = expandedCharId === `${characterId}-core`
  const isAppearanceExpanded = expandedCharId === `${characterId}-appear`
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden">
      {/* Image Section */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        {character.referenceImage ? (
          <>
            <img 
              src={character.referenceImage} 
              alt={character.name}
              className="w-full h-full object-cover"
            />
            {/* Overlay controls - only show on hover */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all opacity-0 hover:opacity-100 flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRegenerate()
                }}
                className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                title="Regenerate image"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <label className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm cursor-pointer">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    e.stopPropagation()
                    const file = e.target.files?.[0]
                    if (file) onUpload(file)
                  }}
                />
              </label>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
            <ImageIcon className="w-12 h-12 text-gray-400" />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation()
                  onGenerate(prompt)
                }} 
                disabled={isGenerating}
              >
                {isGenerating ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Generate
              </Button>
              <label className="cursor-pointer">
                <Button size="sm" variant="outline">
                  <Upload className="w-4 h-4" />
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    e.stopPropagation()
                    const file = e.target.files?.[0]
                    if (file) onUpload(file)
                  }}
                />
              </label>
            </div>
          </div>
        )}
        
        {/* Status Badge - Top Right */}
        {character.voiceConfig && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            Ready
          </div>
        )}
        
        {/* Loading overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
            <Loader className="w-8 h-8 animate-spin text-white mb-2" />
            <span className="text-sm text-white font-medium">Generating...</span>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {character.name || 'Unnamed'}
          </h3>
          {character.role && (
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {character.role}
            </span>
          )}
          {character.aliases && Array.isArray(character.aliases) && character.aliases.length > 1 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
              Also matches: {character.aliases.filter((a: string) => a !== character.name).join(', ')}
            </p>
          )}
        </div>
        
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {character.description}
        </p>
        
        {/* Voice Section - Collapsible */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleVoiceSection?.()
            }}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Voice
              {!character.voiceConfig && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                  Required
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${voiceSectionExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {voiceSectionExpanded && (
            <div className="mt-3 space-y-2">
              <VoiceSelector
                provider={ttsProvider}
                selectedVoiceId={character.voiceConfig?.voiceId || ''}
                onSelectVoice={(voiceId, voiceName) => {
                  onUpdateCharacterVoice?.(characterId, {
                    provider: ttsProvider,
                    voiceId,
                    voiceName
                  })
                }}
                compact={true}
              />
              {character.voiceConfig && (
                <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {character.voiceConfig.voiceName}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Advanced Options - Collapsible */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowAdvanced(!showAdvanced)
          }}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
        >
          <Settings className="w-3 h-3" />
          Advanced Options
          <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
        
        {showAdvanced && (
          <div className="space-y-2 pt-2">
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
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenBuilder()
                }}
                disabled={isGenerating}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Settings className="w-3 h-3 inline mr-1" />
                Edit Prompt
              </button>
              
              {hasImage && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation()
                    if (onAnalyze && character.referenceImage) {
                      onAnalyze(characterId, character.referenceImage, character.name)
                    }
                  }}
                  disabled={isGenerating || analyzingImage}
                  className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {analyzingImage ? (
                    <Loader className="w-3 h-3 inline mr-1 animate-spin" />
                  ) : (
                    <Scan className="w-3 h-3 inline mr-1" />
                  )}
                  Analyze
                </button>
              )}
              
              {hasImage && !isApproved && (
                <button
                  onClick={(e) => { 
                    e.stopPropagation()
                    onApprove()
                  }}
                  disabled={isGenerating}
                  className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check className="w-3 h-3 inline mr-1" />
                  Approve
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Narrator Character Card Component
interface NarratorCharacterCardProps {
  character: any
  onUpdateCharacterVoice?: (characterId: string, voiceConfig: any) => void
  ttsProvider: 'google' | 'elevenlabs'
}

function NarratorCharacterCard({ character, onUpdateCharacterVoice, ttsProvider }: NarratorCharacterCardProps) {
  const [voiceSectionExpanded, setVoiceSectionExpanded] = useState(false)
  
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 overflow-hidden">
      <div className="p-4">
        {/* Header with badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {character.name}
            </h3>
          </div>
          <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full">
            Narration
          </span>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {character.description}
        </p>
        
        {/* Voice Selection */}
        <div className="space-y-2">
          <button
            onClick={() => setVoiceSectionExpanded(!voiceSectionExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Voice Settings
              {!character.voiceConfig && (
                <span className="ml-1 text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                  Required
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${voiceSectionExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {voiceSectionExpanded && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2">
              <VoiceSelector
                provider={ttsProvider}
                selectedVoiceId={character.voiceConfig?.voiceId || ''}
                onSelectVoice={(voiceId, voiceName) => {
                  console.log('[Narrator Voice] Selected:', { voiceId, voiceName, characterId: character.id })
                  onUpdateCharacterVoice?.(character.id, {
                    provider: ttsProvider,
                    voiceId,
                    voiceName
                  })
                }}
                compact={true}
              />
              {character.voiceConfig && (
                <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {character.voiceConfig.voiceName}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


'use client'

import React, { useState } from 'react'
import { Users, Plus, RefreshCw, Loader, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CharacterPromptBuilder } from '@/components/blueprint/CharacterPromptBuilder'

interface CharacterLibraryProps {
  characters: any[]
  onRegenerateCharacter: (characterId: string) => void
  onGenerateCharacter: (characterId: string, prompt: string) => void
  onUploadCharacter: (characterId: string, file: File) => void
  onApproveCharacter: (characterId: string) => void
  compact?: boolean
}

export function CharacterLibrary({ characters, onRegenerateCharacter, onGenerateCharacter, onUploadCharacter, onApproveCharacter, compact = false }: CharacterLibraryProps) {
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [charPrompts, setCharPrompts] = useState<Record<string, string>>({})
  const [generatingChars, setGeneratingChars] = useState<Set<string>>(new Set())
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderCharId, setBuilderCharId] = useState<string | null>(null)
  
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
                prompt={charPrompts[charId] || savedPrompt || defaultPrompt}
                onPromptChange={(prompt) => setCharPrompts(prev => ({ ...prev, [charId]: prompt }))}
                isGenerating={generatingChars.has(charId)}
              />
            )
          })}
        </div>
      )}
      
      {/* Prompt Builder Modal */}
      {builderCharId && (
        <CharacterPromptBuilder
          open={builderOpen}
          onClose={() => setBuilderOpen(false)}
          initialPrompt={charPrompts[builderCharId] || characters.find((c, idx) => (c.id || idx.toString()) === builderCharId)?.imagePrompt || ''}
          characterName={characters.find((c, idx) => (c.id || idx.toString()) === builderCharId)?.name || 'Character'}
          onApply={(prompt, structure) => {
            setCharPrompts(prev => ({ ...prev, [builderCharId]: prompt }))
            setBuilderOpen(false)
          }}
        />
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
  prompt: string
  onPromptChange: (prompt: string) => void
  isGenerating: boolean
}

function CharacterCard({ character, characterId, isSelected, onClick, onRegenerate, onGenerate, onUpload, onApprove, onOpenBuilder, prompt, onPromptChange, isGenerating }: CharacterCardProps) {
  const hasImage = !!character.referenceImage
  const isApproved = character.imageApproved === true
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
      <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
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
      <div className="p-3 bg-white dark:bg-gray-800">
        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{character.name || 'Unnamed'}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{character.role || 'Character'}</div>
      </div>
      
      {/* Action buttons - show different UI based on approval status */}
      {isApproved ? (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
            className="p-1.5 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Edit image"
          >
            <RefreshCw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
            {hasImage && !isApproved && (
              <div className="text-[10px] text-yellow-300 mb-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                Pending approval
              </div>
            )}
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => {
                  onPromptChange(e.target.value)
                  // Auto-resize
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                disabled={isGenerating}
                placeholder="Enter image prompt..."
                className="w-full text-xs px-2 py-1 rounded bg-gray-900/80 border border-gray-600 text-white placeholder-gray-400 focus:border-gray-500 focus:outline-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ resize: 'vertical', minHeight: '3rem', maxHeight: '12rem' }}
                rows={3}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenBuilder()
                }}
                disabled={isGenerating}
                className="absolute top-1 right-1 p-1 rounded bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Open Prompt Builder"
              >
                <Wand2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onGenerate(prompt); }}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-3 h-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  hasImage ? 'Regenerate' : 'Generate'
                )}
              </button>
              <label className={`flex-1 text-xs px-2 py-1 rounded bg-gray-700 text-white transition-colors flex items-center justify-center gap-1 ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 cursor-pointer'}`}>
                Upload
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
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  disabled={isGenerating}
                  className="flex-1 text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Approve and lock image"
                >
                  Approve
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


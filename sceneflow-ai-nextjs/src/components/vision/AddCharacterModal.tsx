'use client'

import React, { useState, useMemo } from 'react'
import { Users, Plus, AlertTriangle, Search, UserPlus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { detectCharacterChanges, normalizeCharacterName } from '@/lib/character/detection'

interface SuggestedCharacter {
  name: string
  dialogueCount: number
  scenes: number[]
  sampleLine?: string
}

interface AddCharacterModalProps {
  open: boolean
  onClose: () => void
  characters: any[]
  scenes: any[]
  onAddCharacter: (characterData: any) => void | Promise<void>
}

/**
 * Get characters from script that are not in the cast yet
 */
function getMissingCharacters(scenes: any[], existingCharacters: any[]): SuggestedCharacter[] {
  const existingNormalized = new Set(
    existingCharacters.map(c => normalizeCharacterName(c.name))
  )
  
  // Also exclude narrator types
  existingCharacters.forEach(c => {
    if (c.type === 'narrator') {
      existingNormalized.add('NARRATOR')
    }
  })
  
  const charMap = new Map<string, SuggestedCharacter>()
  
  scenes.forEach((scene, sceneIdx) => {
    scene.dialogue?.forEach((d: any) => {
      if (!d.character) return
      
      const normalizedName = normalizeCharacterName(d.character)
      
      // Skip if already in cast
      if (existingNormalized.has(normalizedName)) return
      
      // Skip narrator/voiceover indicators
      if (normalizedName === 'NARRATOR' || normalizedName === 'V.O.' || normalizedName === 'O.S.') return
      
      const cleanName = d.character.replace(/\s*\([^)]*\)\s*/g, '').trim()
      
      if (charMap.has(normalizedName)) {
        const existing = charMap.get(normalizedName)!
        existing.dialogueCount++
        if (!existing.scenes.includes(sceneIdx + 1)) {
          existing.scenes.push(sceneIdx + 1)
        }
        // Keep first sample line
      } else {
        charMap.set(normalizedName, {
          name: cleanName,
          dialogueCount: 1,
          scenes: [sceneIdx + 1],
          sampleLine: d.line?.substring(0, 80) + (d.line?.length > 80 ? '...' : '')
        })
      }
    })
  })
  
  // Sort by dialogue count (most lines first)
  return Array.from(charMap.values()).sort((a, b) => b.dialogueCount - a.dialogueCount)
}

/**
 * Count dialogue lines for existing characters
 */
function getCharacterDialogueCounts(scenes: any[], existingCharacters: any[]): Map<string, number> {
  const counts = new Map<string, number>()
  
  existingCharacters.forEach(c => {
    const normalized = normalizeCharacterName(c.name)
    counts.set(normalized, 0)
  })
  
  scenes.forEach(scene => {
    scene.dialogue?.forEach((d: any) => {
      if (!d.character) return
      const normalized = normalizeCharacterName(d.character)
      if (counts.has(normalized)) {
        counts.set(normalized, (counts.get(normalized) || 0) + 1)
      }
    })
  })
  
  return counts
}

export function AddCharacterModal({ 
  open, 
  onClose, 
  characters, 
  scenes, 
  onAddCharacter 
}: AddCharacterModalProps) {
  const [customName, setCustomName] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  
  // Get missing characters from script
  const missingCharacters = useMemo(() => {
    return getMissingCharacters(scenes, characters)
  }, [scenes, characters])
  
  // Get dialogue counts for existing characters (for orphan detection)
  const dialogueCounts = useMemo(() => {
    return getCharacterDialogueCounts(scenes, characters)
  }, [scenes, characters])
  
  // Filter suggestions by search
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return missingCharacters
    const query = searchQuery.toLowerCase()
    return missingCharacters.filter(c => 
      c.name.toLowerCase().includes(query)
    )
  }, [missingCharacters, searchQuery])
  
  const handleAddSuggested = async (char: SuggestedCharacter) => {
    setIsAdding(true)
    try {
      await onAddCharacter({
        name: char.name,
        role: 'supporting',
        appearanceDescription: '',
        description: `Character from script with ${char.dialogueCount} dialogue line${char.dialogueCount > 1 ? 's' : ''}`
      })
      onClose()
    } catch (error) {
      console.error('[AddCharacterModal] Error adding character:', error)
    } finally {
      setIsAdding(false)
    }
  }
  
  const handleAddCustom = async () => {
    if (!customName.trim()) return
    
    setIsAdding(true)
    try {
      await onAddCharacter({
        name: customName.trim(),
        role: 'supporting',
        appearanceDescription: customDescription.trim(),
        description: customDescription.trim() || 'Custom character'
      })
      
      setCustomName('')
      setCustomDescription('')
      setShowCustomForm(false)
      onClose()
    } catch (error) {
      console.error('[AddCharacterModal] Error adding custom character:', error)
    } finally {
      setIsAdding(false)
    }
  }
  
  // Check if custom name matches any script character
  const customNameMatchesSuggestion = useMemo(() => {
    if (!customName.trim()) return null
    const normalizedCustom = normalizeCharacterName(customName)
    return missingCharacters.find(c => 
      normalizeCharacterName(c.name) === normalizedCustom
    )
  }, [customName, missingCharacters])
  
  // Check if custom name conflicts with existing character
  const customNameConflict = useMemo(() => {
    if (!customName.trim()) return false
    const normalizedCustom = normalizeCharacterName(customName)
    return characters.some(c => 
      normalizeCharacterName(c.name) === normalizedCustom
    )
  }, [customName, characters])
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            Add Character
          </DialogTitle>
          <DialogDescription>
            {missingCharacters.length > 0 
              ? `Found ${missingCharacters.length} character${missingCharacters.length > 1 ? 's' : ''} in script not yet in your cast`
              : 'All script characters are in your cast. Add a custom character below.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Suggested Characters from Script */}
          {missingCharacters.length > 0 && !showCustomForm && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Characters from Script
                </h4>
              </div>
              
              {missingCharacters.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredSuggestions.map((char, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {char.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          {char.dialogueCount} line{char.dialogueCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      {char.sampleLine && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          "{char.sampleLine}"
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Scene{char.scenes.length > 1 ? 's' : ''}: {char.scenes.slice(0, 5).join(', ')}
                        {char.scenes.length > 5 && ` +${char.scenes.length - 5} more`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddSuggested(char)}
                      disabled={isAdding}
                      className="ml-3 shrink-0"
                    >
                      {isAdding ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
                      ) : (
                        <Plus className="w-4 h-4 mr-1" />
                      )}
                      Add
                    </Button>
                  </div>
                ))}
                
                {filteredSuggestions.length === 0 && searchQuery && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No characters match "{searchQuery}"
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Divider */}
          {missingCharacters.length > 0 && !showCustomForm && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">or</span>
              </div>
            </div>
          )}
          
          {/* Custom Character Form */}
          {showCustomForm ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-500" />
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Add Custom Character
                </h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Character Name *
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Detective Sarah Chen"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                {/* Match/Conflict warnings */}
                {customNameMatchesSuggestion && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      This matches "{customNameMatchesSuggestion.name}" from your script 
                      ({customNameMatchesSuggestion.dialogueCount} lines). 
                      <button 
                        onClick={() => handleAddSuggested(customNameMatchesSuggestion)}
                        className="underline ml-1"
                      >
                        Add from script instead?
                      </button>
                    </span>
                  </div>
                )}
                
                {customNameConflict && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>A character with this name already exists in your cast.</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Brief description of the character's role and appearance..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              
              {/* Warning for custom characters not in script */}
              {customName.trim() && !customNameMatchesSuggestion && !customNameConflict && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Character not in script</p>
                    <p className="mt-0.5 opacity-80">
                      This character doesn't appear in your current script. They won't have 
                      any dialogue until you add them to a scene.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCustomForm(false)
                    setCustomName('')
                    setCustomDescription('')
                  }}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddCustom}
                  disabled={!customName.trim() || customNameConflict}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Character
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomForm(true)}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Custom Character
            </Button>
          )}
        </div>
        
        <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to get orphan character info (characters with 0 dialogue lines)
 */
export function useOrphanCharacters(scenes: any[], characters: any[]): Set<string> {
  return useMemo(() => {
    const orphans = new Set<string>()
    const counts = getCharacterDialogueCounts(scenes, characters)
    
    characters.forEach(c => {
      if (c.type === 'narrator') return // Narrator doesn't need dialogue
      const normalized = normalizeCharacterName(c.name)
      if ((counts.get(normalized) || 0) === 0) {
        orphans.add(c.id || c.name)
      }
    })
    
    return orphans
  }, [scenes, characters])
}

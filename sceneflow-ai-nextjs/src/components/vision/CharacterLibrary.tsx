'use client'

import React, { useState, useEffect } from 'react'
import { Users, Plus, Loader, Wand2, Upload, X, ChevronDown, ChevronUp, Check, Sparkles, Lightbulb, Info, Volume2, ImageIcon, Edit, Trash2, Shirt, Mic, Play, AlertCircle, Maximize2, User, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { upload } from '@vercel/blob/client'
import { BrowseVoicesDialog } from '@/components/tts/BrowseVoicesDialog'
import { CreateCustomVoiceDialog } from '@/components/tts/CreateCustomVoiceDialog'
import { CharacterPromptBuilder } from '@/components/vision/CharacterPromptBuilder'
import { AddCharacterModal, useOrphanCharacters } from '@/components/vision/AddCharacterModal'
import { useOverlayStore } from '@/store/useOverlayStore'
import type { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'

export interface CharacterLibraryProps {
  characters: any[]
  /** Script scenes for character detection */
  scenes?: any[]
  onRegenerateCharacter: (characterId: string) => void
  onGenerateCharacter: (characterId: string, promptOrPayload: any) => Promise<void>
  onUploadCharacter: (characterId: string, file: File) => void
  onApproveCharacter: (characterId: string) => void
  onUpdateCharacterAttributes?: (characterId: string, attributes: any) => void
  onUpdateCharacterVoice?: (characterId: string, voiceConfig: any) => void
  onUpdateCharacterAppearance?: (characterId: string, description: string) => void
  onUpdateCharacterName?: (characterId: string, name: string) => void
  onUpdateCharacterRole?: (characterId: string, role: string) => void
  onUpdateCharacterWardrobe?: (characterId: string, wardrobe: { 
    defaultWardrobe?: string; 
    wardrobeAccessories?: string;
    wardrobeId?: string;
    wardrobeName?: string;
    previewImageUrl?: string;
    headshotUrl?: string;
    fullBodyUrl?: string;
    sceneNumbers?: number[];
    reason?: string;
    action?: 'add' | 'update' | 'delete' | 'setDefault';
  }) => void
  /** Callback to batch update wardrobes from script analysis */
  onBatchUpdateWardrobes?: (characterId: string, wardrobes: Array<{
    name: string;
    description: string;
    accessories?: string;
    sceneNumbers: number[];
    reason: string;
  }>) => void
  onAddCharacter?: (characterData: any) => void
  onRemoveCharacter?: (characterName: string) => void
  /** Callback to edit a character's reference image */
  onEditCharacterImage?: (characterId: string, imageUrl: string) => void
  ttsProvider: 'google' | 'elevenlabs'
  compact?: boolean
  uploadingRef?: Record<string, boolean>
  setUploadingRef?: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  enableDrag?: boolean
  showProTips?: boolean
  // Screenplay context for AI wardrobe recommendations
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    logline?: string
    visualStyle?: string
  }
}

// Wardrobe item in collection with scene-aware tracking
interface CharacterWardrobe {
  id: string
  name: string
  description: string
  accessories?: string
  isDefault: boolean
  createdAt: string
  previewImageUrl?: string  // Legacy: AI-generated preview of character in this outfit
  headshotUrl?: string      // Portrait headshot (1:1) showing character face with outfit context
  fullBodyUrl?: string      // Full body shot (3:4) showing complete outfit head to toe
  sceneNumbers?: number[]   // Scenes where this outfit is used (from script analysis)
  reason?: string           // AI explanation for why this outfit is needed
}

interface CharacterCardProps {
  character: any
  characterId: string
  isSelected: boolean
  onClick: () => void
  onRegenerate: () => void
  onGenerate: () => void
  onUpload: (file: File) => void
  onApprove: () => void
  prompt: string
  isGenerating: boolean
  isUploading?: boolean
  /** Character has no dialogue in script */
  isOrphan?: boolean
  expandedCharId?: string | null
  onToggleExpand?: (charId: string, section: 'coreIdentity' | 'appearance') => void                                                                             
  onUpdateCharacterVoice?: (characterId: string, voiceConfig: any) => void
  onUpdateAppearance?: (characterId: string, description: string) => void
  onUpdateCharacterName?: (characterId: string, name: string) => void
  onUpdateCharacterRole?: (characterId: string, role: string) => void
  onUpdateWardrobe?: (characterId: string, wardrobe: { 
    defaultWardrobe?: string; 
    wardrobeAccessories?: string;
    wardrobeId?: string;
    wardrobeName?: string;
    headshotUrl?: string;
    fullBodyUrl?: string;
    sceneNumbers?: number[];
    reason?: string;
    action?: 'add' | 'update' | 'delete' | 'setDefault';
  }) => void
  /** Batch update wardrobes from script analysis */
  onBatchUpdateWardrobes?: (characterId: string, wardrobes: Array<{
    name: string;
    description: string;
    accessories?: string;
    sceneNumbers: number[];
    reason: string;
  }>) => void
  /** Script scenes for wardrobe analysis */
  scenes?: any[]
  onRemove?: () => void
  /** Callback to edit the character's reference image */
  onEditImage?: () => void
  ttsProvider: 'google' | 'elevenlabs'
  voiceSectionExpanded?: boolean
  onToggleVoiceSection?: () => void
  enableDrag?: boolean
  onOpenCharacterPrompt?: () => void
  // Screenplay context for AI wardrobe recommendations
  screenplayContext?: {
    genre?: string
    tone?: string
    setting?: string
    logline?: string
    visualStyle?: string
  }
}

export function CharacterLibrary({ characters, scenes = [], onRegenerateCharacter, onGenerateCharacter, onUploadCharacter, onApproveCharacter, onUpdateCharacterAttributes, onUpdateCharacterVoice, onUpdateCharacterAppearance, onUpdateCharacterName, onUpdateCharacterRole, onUpdateCharacterWardrobe, onBatchUpdateWardrobes, onAddCharacter, onRemoveCharacter, onEditCharacterImage, ttsProvider, compact = false, uploadingRef = {}, setUploadingRef, enableDrag = false, showProTips: showProTipsProp, screenplayContext }: CharacterLibraryProps) {                                
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [generatingChars, setGeneratingChars] = useState<Set<string>>(new Set())
  const [zoomedImage, setZoomedImage] = useState<{url: string; name: string} | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, string | null>>({})
  const [needsReupload, setNeedsReupload] = useState<Record<string, boolean>>({})
  const [showProTipsInternal, setShowProTipsInternal] = useState(false)
  const [voiceSectionExpanded, setVoiceSectionExpanded] = useState<Record<string, boolean>>({})
  const [promptBuilderOpenFor, setPromptBuilderOpenFor] = useState<string | null>(null)
  const [createVoiceDialogOpen, setCreateVoiceDialogOpen] = useState(false)
  const [addCharacterModalOpen, setAddCharacterModalOpen] = useState(false)
  
  // Track orphan characters (not in script)
  const orphanCharacters = useOrphanCharacters(scenes, characters)
  
  // Use prop if provided (for compact mode), otherwise use internal state
  const showProTips = showProTipsProp !== undefined ? showProTipsProp : showProTipsInternal
  
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
      
      // Compress image if too large to avoid 413 errors
      let fileToUpload = file
      if (sizeMB > 4) {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          
          // Calculate new dimensions (max 2048px)
          const maxSize = 2048
          let width = img.width
          let height = img.height
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize
              width = maxSize
            } else {
              width = (width / height) * maxSize
              height = maxSize
            }
          }
          
          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to blob with compression
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
          })
          
          fileToUpload = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
          const newSizeMB = fileToUpload.size / 1024 / 1024
          console.log(`[Upload] Compressed from ${sizeMB.toFixed(2)}MB to ${newSizeMB.toFixed(2)}MB`)
        } catch (compressionError) {
          console.error('[Upload] Compression failed:', compressionError)
          // Continue with original file if compression fails
        }
      }
      
      // Proceed with client-side direct upload
      setUploadingRef?.(prev => ({ ...prev, [characterId]: true }))
      
      try {
        // Step 1: Upload directly to Vercel Blob (client-side)
        const newBlob = await upload(fileToUpload.name, fileToUpload, {
          access: 'public',
          handleUploadUrl: '/api/character/upload-url',
        })
        
        console.log('[Upload] Blob uploaded:', newBlob.url)
        
        // Step 2: Process upload and analyze with Gemini Vision
        const processRes = await fetch('/api/character/process-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blobUrl: newBlob.url,
            characterName,
          }),
        })
        
        const processData = await processRes.json()
        if (processData.success) {
          // Call parent handler to update character
          onUploadCharacter(characterId, file)
          toast.success('Reference image uploaded successfully!')
        } else {
          throw new Error(processData.error || 'Processing failed')
        }
      } catch (error) {
        console.error('[Upload Reference] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload'
        toast.error(errorMessage)
      } finally {
        setUploadingRef?.(prev => ({ ...prev, [characterId]: false }))
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      toast.error('Invalid image file')
    }
    
    img.src = objectUrl
  }
  
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 ${compact ? 'p-4' : 'p-6'} h-full overflow-y-auto`}>
      {!compact && (
        <div className={`flex items-center justify-between mb-6`}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sf-primary" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Character Library
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {characters.length}
            </span>
            
            {/* Pro Tips Toggle Button */}
            <button
              onClick={() => setShowProTipsInternal(prev => !prev)}
              className="ml-2 p-1.5 rounded-full hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors"
              title={showProTips ? "Hide Pro Tips" : "Show Pro Tips"}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {characters.length === 0 ? (
        <div className={`text-center ${compact ? 'py-8' : 'py-12'} text-gray-500 dark:text-gray-400`}>
          <Users className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} mx-auto mb-2 text-gray-300 dark:text-gray-600`} />
          <p className={compact ? 'text-sm' : ''}>No characters yet</p>
        </div>
      ) : (
        <div className={`${compact ? 'space-y-3' : 'grid grid-cols-2 lg:grid-cols-3 gap-4'}`}>
          {/* Action Buttons Row - Add Character & Add Voice */}
          {onAddCharacter && (
            <div className="col-span-2 lg:col-span-3 flex gap-2 mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => setAddCharacterModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span>Add Character</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900"
                onClick={() => setCreateVoiceDialogOpen(true)}
              >
                <Mic className="w-4 h-4" />
                <span>Add Voice</span>
              </Button>
            </div>
          )}
          
          {/* Add Character Modal */}
          {onAddCharacter && (
            <AddCharacterModal
              open={addCharacterModalOpen}
              onClose={() => setAddCharacterModalOpen(false)}
              characters={characters}
              scenes={scenes}
              onAddCharacter={onAddCharacter}
            />
          )}
          
          {/* Narrator Character Card - Always show first */}
          {characters.find(char => char.type === 'narrator') && (
            <NarratorCharacterCard
              character={characters.find(char => char.type === 'narrator')!}
              onUpdateCharacterVoice={onUpdateCharacterVoice}
              ttsProvider={ttsProvider}
            />
          )}
          
          {/* Regular Character Cards */}
          {characters.filter(char => char.type !== 'narrator' && char.type !== 'description').map((char, idx) => {
            const charId = char.id || idx.toString()
            // Use appearanceDescription for image generation, fallback to saved imagePrompt or default
            const appearancePrompt = char.appearanceDescription || char.imagePrompt || `${char.name || 'Character'}`
            return (
              <CharacterCard
                key={charId}
                character={char}
                characterId={charId}
                isSelected={selectedChar === charId}
                isOrphan={orphanCharacters.has(charId) || orphanCharacters.has(char.name)}
                onClick={() => setSelectedChar(charId)}
                onRegenerate={() => onRegenerateCharacter(charId)}
                onGenerate={async () => {
                  setGeneratingChars(prev => new Set(prev).add(charId))
                  try {
                    // Use appearance description as prompt for generation
                    const promptToUse = char.appearanceDescription || `${char.name || 'Character'}`
                    await onGenerateCharacter(charId, promptToUse)
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
                prompt={appearancePrompt}
                isGenerating={generatingChars.has(charId)}
                isUploading={uploadingRef[charId] || false}
                expandedCharId={expandedSections[charId]}
                onToggleExpand={handleToggleSection}
                onUpdateCharacterVoice={onUpdateCharacterVoice}
                onUpdateAppearance={onUpdateCharacterAppearance}
                onUpdateCharacterName={onUpdateCharacterName}
                onUpdateCharacterRole={onUpdateCharacterRole}
                onUpdateWardrobe={onUpdateCharacterWardrobe}
                onBatchUpdateWardrobes={onBatchUpdateWardrobes}
                scenes={scenes}
                onRemove={() => onRemoveCharacter?.(char.name)}
                onEditImage={char.referenceImage && onEditCharacterImage ? () => onEditCharacterImage(charId, char.referenceImage) : undefined}
                ttsProvider={ttsProvider}
                voiceSectionExpanded={voiceSectionExpanded[charId] || false}
                onToggleVoiceSection={() => handleToggleVoiceSection(charId)}
                enableDrag={enableDrag}
                onOpenCharacterPrompt={() => setPromptBuilderOpenFor(charId)}
                screenplayContext={screenplayContext}
              />
            )
          })}
              {/* Character Prompt Builder Modal */}
              {promptBuilderOpenFor && (
                <CharacterPromptBuilder
                  open={!!promptBuilderOpenFor}
                  onClose={() => setPromptBuilderOpenFor(null)}
                  character={characters.filter(c => c.type !== 'narrator').find((c, idx) => (c.id || idx.toString()) === promptBuilderOpenFor)}
                  isGenerating={Array.from(generatingChars).includes(promptBuilderOpenFor)}
                  onGenerateImage={(payload) => {
                    const targetId = promptBuilderOpenFor!
                    setPromptBuilderOpenFor(null)
                    setGeneratingChars(prev => new Set(prev).add(targetId))
                    onGenerateCharacter(targetId, payload)
                      .finally(() => {
                        setGeneratingChars(prev => {
                          const ns = new Set(prev)
                          ns.delete(targetId)
                          return ns
                        })
                      })
                  }}
                />
              )}
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
      
      {/* Create Custom Voice Dialog */}
      <CreateCustomVoiceDialog
        open={createVoiceDialogOpen}
        onOpenChange={setCreateVoiceDialogOpen}
        onVoiceCreated={(voiceId, voiceName) => {
          toast.success(`Voice "${voiceName}" created! Assign it to a character.`)
        }}
        screenplayContext={screenplayContext as ScreenplayContext}
      />
    </div>
  )
}

const CharacterCard = ({ character, characterId, isSelected, onClick, onRegenerate, onGenerate, onUpload, onApprove, prompt, isGenerating, isUploading = false, isOrphan = false, expandedCharId, onToggleExpand, onUpdateCharacterVoice, onUpdateAppearance, onUpdateCharacterName, onUpdateCharacterRole, onUpdateWardrobe, onBatchUpdateWardrobes, scenes = [], onRemove, onEditImage, ttsProvider, voiceSectionExpanded, onToggleVoiceSection, enableDrag = false, onOpenCharacterPrompt, screenplayContext }: CharacterCardProps) => {
  const hasImage = !!character.referenceImage
  const isApproved = character.imageApproved === true
  const isCoreExpanded = expandedCharId === `${characterId}-core`
  const isAppearanceExpanded = expandedCharId === `${characterId}-appear`
  const [editingName, setEditingName] = useState(false)
  const [nameText, setNameText] = useState('')
  const [editingRole, setEditingRole] = useState(false)
  const [wardrobeSectionExpanded, setWardrobeSectionExpanded] = useState(false)
  const [voiceSectionExpandedLocal, setVoiceSectionExpandedLocal] = useState(false)
  const [editingWardrobe, setEditingWardrobe] = useState(false)
  const [editingWardrobeId, setEditingWardrobeId] = useState<string | null>(null) // Which wardrobe is being edited
  const [wardrobeText, setWardrobeText] = useState('')
  const [accessoriesText, setAccessoriesText] = useState('')
  const [wardrobeName, setWardrobeName] = useState('') // Name for new/edited wardrobe
  const [showAiAssist, setShowAiAssist] = useState(false)
  const [aiPromptText, setAiPromptText] = useState('')
  const [isGeneratingWardrobe, setIsGeneratingWardrobe] = useState(false)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [showAddWardrobeForm, setShowAddWardrobeForm] = useState(false) // Toggle for add new wardrobe form
  
  // Script analysis for wardrobes state
  const [isAnalyzingScript, setIsAnalyzingScript] = useState(false)
  const [wardrobeSuggestions, setWardrobeSuggestions] = useState<Array<{
    name: string
    description: string
    accessories?: string
    sceneNumbers: number[]
    reason: string
    confidence: number
  }>>([])
  
  // Wardrobe expansion modal state
  const [expandedWardrobe, setExpandedWardrobe] = useState<CharacterWardrobe | null>(null)
  
  // Enhance reference state
  const [enhanceIterationCount, setEnhanceIterationCount] = useState(character.enhanceIterationCount || 0)
  const [showEnhanceConfirm, setShowEnhanceConfirm] = useState(false)
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState<string | null>(null)
  const [enhanceQualityFeedback, setEnhanceQualityFeedback] = useState<{
    originalScore: number
    issuesFixed: string[]
    improvements: string[]
  } | null>(null)
  
  // Wardrobe preview generation state
  const [generatingPreviewFor, setGeneratingPreviewFor] = useState<string | null>(null)
  const [isGeneratingAllPreviews, setIsGeneratingAllPreviews] = useState(false)
  
  // Get wardrobes collection (or migrate from legacy format)
  const wardrobes: CharacterWardrobe[] = character.wardrobes || (
    (character.defaultWardrobe || character.wardrobeAccessories) ? [{
      id: 'legacy-wardrobe',
      name: 'Default Outfit',
      description: character.defaultWardrobe || '',
      accessories: character.wardrobeAccessories,
      isDefault: true,
      createdAt: new Date().toISOString()
    }] : []
  )
  
  // Build character context for voice recommendations
  const characterContext: CharacterContext = {
    name: character.name || 'Unknown',
    role: character.role,
    gender: character.gender,
    age: character.age,
    ethnicity: character.ethnicity,
    personality: character.keyFeature,
    description: character.description || character.appearanceDescription
  }
  
  // Helper function to generate fallback description from attributes
  const generateFallbackDescription = (character: any): string => {
    const parts = []
    
    // Core Identity
    if (character.ethnicity) parts.push(character.ethnicity)
    if (character.keyFeature) parts.push(character.keyFeature)
    
    // Physical Appearance
    if (character.build) parts.push(character.build)
    if (character.hairColor && character.hairStyle) {
      parts.push(`${character.hairColor} ${character.hairStyle} hair`)
    } else if (character.hairStyle) {
      parts.push(`${character.hairStyle} hair`)
    } else if (character.hairColor) {
      parts.push(`${character.hairColor} hair`)
    }
    if (character.eyeColor) parts.push(`${character.eyeColor} eyes`)
    if (character.expression) parts.push(character.expression)
    
    return parts.length > 0 
      ? parts.join(', ') 
      : 'Click to add appearance description for scene generation'
  }
  
  const handleSaveName = async () => {
    if (nameText.trim() && onUpdateCharacterName) {
      await onUpdateCharacterName(characterId, nameText.trim())
      setEditingName(false)
    }
  }
  
  const handleSaveRole = async () => {
    if (onUpdateCharacterRole) {
      await onUpdateCharacterRole(characterId, (document.getElementById(`role-select-${characterId}`) as HTMLSelectElement)?.value || 'supporting')
      setEditingRole(false)
    }
  }

  // Analyze script to suggest wardrobes for this character
  const handleAnalyzeScriptForWardrobes = async () => {
    if (!scenes || scenes.length === 0) {
      toast.error('No scenes available for analysis')
      return
    }

    setIsAnalyzingScript(true)
    setWardrobeSuggestions([])
    
    try {
      const response = await fetch('/api/character/suggest-wardrobes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: {
            id: characterId,
            name: character.name,
            role: character.role,
            appearanceDescription: character.appearanceDescription,
            existingWardrobes: wardrobes.map(w => ({ name: w.name, sceneNumbers: w.sceneNumbers }))
          },
          scenes: scenes.map((s: any, idx: number) => ({
            sceneNumber: idx + 1,
            heading: typeof s.heading === 'string' ? s.heading : s.heading?.text,
            action: s.action,
            visualDescription: s.visualDescription,
            dialogue: s.dialogue?.filter((d: any) => 
              d.character?.toLowerCase() === character.name?.toLowerCase()
            ).map((d: any) => d.line).join(' ')
          })),
          screenplayContext: {
            genre: screenplayContext?.genre,
            tone: screenplayContext?.tone,
            setting: screenplayContext?.setting,
            logline: screenplayContext?.logline
          }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze script')
      }

      const { suggestions } = await response.json()
      setWardrobeSuggestions(suggestions || [])
      
      if (suggestions?.length > 0) {
        toast.success(`Found ${suggestions.length} wardrobe suggestion(s) for ${character.name}`)
      } else {
        toast.info('No additional wardrobes needed based on script analysis')
      }
    } catch (error) {
      console.error('[Script Analysis] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to analyze script')
    } finally {
      setIsAnalyzingScript(false)
    }
  }
  
  // Accept a wardrobe suggestion and add it to the collection
  const handleAcceptSuggestion = (suggestion: typeof wardrobeSuggestions[0]) => {
    onUpdateWardrobe?.(characterId, {
      defaultWardrobe: suggestion.description,
      wardrobeAccessories: suggestion.accessories,
      wardrobeName: suggestion.name,
      sceneNumbers: suggestion.sceneNumbers,
      reason: suggestion.reason,
      action: 'add'
    })
    
    // Remove from suggestions
    setWardrobeSuggestions(prev => prev.filter(s => s.name !== suggestion.name))
    toast.success(`Added "${suggestion.name}" to wardrobe collection`)
  }
  
  // Accept all suggestions at once
  const handleAcceptAllSuggestions = () => {
    if (onBatchUpdateWardrobes && wardrobeSuggestions.length > 0) {
      onBatchUpdateWardrobes(characterId, wardrobeSuggestions.map(s => ({
        name: s.name,
        description: s.description,
        accessories: s.accessories,
        sceneNumbers: s.sceneNumbers,
        reason: s.reason
      })))
      setWardrobeSuggestions([])
      toast.success(`Added ${wardrobeSuggestions.length} wardrobe(s) to collection`)
    }
  }

  const handleGenerateWardrobe = async (recommendMode: boolean = false, addAsNew: boolean = false) => {
    if (!recommendMode && !aiPromptText.trim()) {
      toast.error('Please describe the wardrobe or image you want')
      return
    }

    setIsGeneratingWardrobe(true)
    try {
      const response = await fetch('/api/character/generate-wardrobe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: character.name,
          characterRole: character.role,
          appearanceDescription: character.appearanceDescription || generateFallbackDescription(character),
          wardrobeDescription: recommendMode ? undefined : aiPromptText,
          recommendMode,
          // Include screenplay context for smarter recommendations
          genre: screenplayContext?.genre,
          tone: screenplayContext?.tone,
          setting: screenplayContext?.setting,
          logline: screenplayContext?.logline,
          visualStyle: screenplayContext?.visualStyle,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate wardrobe')
      }

      const { wardrobe } = await response.json()
      
      // Populate the wardrobe fields with AI-generated content
      setWardrobeText(wardrobe.defaultWardrobe)
      setAccessoriesText(wardrobe.wardrobeAccessories || '')
      setShowAiAssist(false)
      setAiPromptText('')
      
      if (addAsNew) {
        // Show add form with pre-filled AI content including suggested name
        setShowAddWardrobeForm(true)
        setWardrobeName(wardrobe.wardrobeName || '') // Use AI-suggested name
      } else {
        setEditingWardrobe(true)
        setEditingWardrobeId(null)
      }
      
      toast.success(recommendMode 
        ? 'Wardrobe recommended based on character & screenplay! Review and save.' 
        : 'Wardrobe generated! Review and save when ready.')
    } catch (error) {
      console.error('[AI Wardrobe] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate wardrobe')
    } finally {
      setIsGeneratingWardrobe(false)
    }
  }
  
  // Handle saving wardrobe (add new or update existing)
  const handleSaveWardrobe = () => {
    if (!wardrobeText.trim()) {
      toast.error('Please enter a wardrobe description')
      return
    }
    
    if (showAddWardrobeForm) {
      // Adding new wardrobe to collection
      const name = wardrobeName.trim() || `Outfit ${wardrobes.length + 1}`
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: wardrobeText.trim(),
        wardrobeAccessories: accessoriesText.trim() || undefined,
        wardrobeName: name,
        action: 'add'
      })
      toast.success(`Added "${name}" to wardrobe collection`)
    } else if (editingWardrobeId) {
      // Updating existing wardrobe
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: wardrobeText.trim(),
        wardrobeAccessories: accessoriesText.trim() || undefined,
        wardrobeId: editingWardrobeId,
        action: 'update'
      })
      toast.success('Wardrobe updated')
    } else {
      // Legacy: update default wardrobe
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: wardrobeText.trim(),
        wardrobeAccessories: accessoriesText.trim() || undefined
      })
      toast.success('Wardrobe updated')
    }
    
    // Reset form state
    setEditingWardrobe(false)
    setEditingWardrobeId(null)
    setShowAddWardrobeForm(false)
    setWardrobeText('')
    setAccessoriesText('')
    setWardrobeName('')
  }
  
  // Handle deleting a wardrobe
  const handleDeleteWardrobe = (wardrobeId: string) => {
    onUpdateWardrobe?.(characterId, {
      wardrobeId,
      action: 'delete'
    })
    toast.success('Wardrobe deleted')
  }
  
  // Handle setting a wardrobe as default
  const handleSetDefaultWardrobe = (wardrobeId: string) => {
    onUpdateWardrobe?.(characterId, {
      wardrobeId,
      action: 'setDefault'
    })
    toast.success('Default wardrobe updated')
  }

  // Overlay store for enhance progress
  const overlayStore = useOverlayStore()
  
  // Derived state: check if character enhancement is in progress
  const isEnhancingReference = overlayStore.isVisible && overlayStore.operationType === 'character-enhance'

  // Handle enhancing the character reference image
  const handleEnhanceReference = async () => {
    if (!character.referenceImage) {
      toast.error('No reference image to enhance')
      return
    }

    if (enhanceIterationCount >= 3) {
      toast.error('Maximum enhancement iterations reached. Please upload a new source image.')
      return
    }

    overlayStore.show('Analyzing portrait quality...', 10, 'character-enhance')
    try {
      overlayStore.setProgress(25)
      overlayStore.setStatus('Setting up studio lighting...')
      const response = await fetch('/api/character/enhance-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          sourceImageUrl: character.referenceImage,
          characterName: character.name,
          appearanceDescription: character.appearanceDescription || generateFallbackDescription(character),
          iterationCount: enhanceIterationCount,
        }),
      })

      overlayStore.setProgress(70)
      overlayStore.setStatus('Generating enhanced portrait...')

      if (!response.ok) {
        const error = await response.json()
        if (error.code === 'INSUFFICIENT_CREDITS') {
          toast.error(`Insufficient credits. Need ${error.required} credits.`)
          return
        }
        if (error.code === 'ALREADY_OPTIMIZED') {
          toast.info('This image is already well-optimized. Try uploading a different source image.')
          return
        }
        throw new Error(error.error || 'Enhancement failed')
      }

      overlayStore.setProgress(90)
      overlayStore.setStatus('Applying final retouching...')
      const result = await response.json()
      
      // Show preview for confirmation with quality feedback
      setEnhancedPreviewUrl(result.enhancedImageUrl)
      setEnhanceQualityFeedback(result.qualityFeedback || null)
      setShowEnhanceConfirm(true)
      setEnhanceIterationCount(result.iterationCount)
      
      overlayStore.setProgress(100)
      overlayStore.setStatus('Portrait enhanced!')
      toast.success(`Enhanced to professional headshot! ${result.remainingIterations} iteration(s) remaining.`)
    } catch (error) {
      console.error('[Enhance Reference] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Enhancement failed')
    } finally {
      overlayStore.hide()
    }
  }
  
  // Accept the enhanced image
  const handleAcceptEnhanced = () => {
    if (enhancedPreviewUrl) {
      // Update the character's reference image via upload handler
      // The parent component should handle updating the character
      onUpload && fetch(enhancedPreviewUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `enhanced-${characterId}.png`, { type: 'image/png' })
          onUpload(file)
        })
      setShowEnhanceConfirm(false)
      setEnhancedPreviewUrl(null)
      setEnhanceQualityFeedback(null)
      toast.success('Professional headshot reference applied!')
    }
  }
  
  // Generate wardrobe preview images (headshot + full body)
  const handleGenerateWardrobePreview = async (wardrobeId: string) => {
    const wardrobe = wardrobes.find(w => w.id === wardrobeId)
    if (!wardrobe || !character.referenceImage) {
      toast.error('Character reference image is required')
      return
    }

    setGeneratingPreviewFor(wardrobeId)
    try {
      const response = await fetch('/api/character/generate-wardrobe-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          wardrobeId,
          characterName: character.name,
          characterReferenceImageUrl: character.referenceImage,
          appearanceDescription: character.appearanceDescription || generateFallbackDescription(character),
          wardrobeDescription: wardrobe.description,
          wardrobeAccessories: wardrobe.accessories,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.code === 'INSUFFICIENT_CREDITS') {
          toast.error(`Insufficient credits. Need ${error.required} credits for headshot + full body.`)
          return
        }
        throw new Error(error.error || 'Preview generation failed')
      }

      const result = await response.json()
      
      // Update wardrobe with headshot and full body URLs
      onUpdateWardrobe?.(characterId, {
        wardrobeId,
        action: 'update',
        defaultWardrobe: wardrobe.description,
        wardrobeAccessories: wardrobe.accessories,
        headshotUrl: result.headshotUrl,
        fullBodyUrl: result.fullBodyUrl,
        // Legacy compatibility
        previewImageUrl: result.previewImageUrl || result.fullBodyUrl
      })
      
      toast.success('Wardrobe preview generated (headshot + full body)!')
    } catch (error) {
      console.error('[Wardrobe Preview] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Preview generation failed')
    } finally {
      setGeneratingPreviewFor(null)
    }
  }
  
  // Generate all wardrobe previews
  const handleGenerateAllPreviews = async () => {
    const wardrobesWithoutPreviews = wardrobes.filter(w => !w.fullBodyUrl && !w.previewImageUrl)
    if (wardrobesWithoutPreviews.length === 0) {
      toast.info('All wardrobes already have previews')
      return
    }
    
    if (!character.referenceImage) {
      toast.error('Character reference image is required')
      return
    }

    setIsGeneratingAllPreviews(true)
    try {
      const response = await fetch('/api/character/generate-wardrobe-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          characterName: character.name,
          characterReferenceImageUrl: character.referenceImage,
          appearanceDescription: character.appearanceDescription || generateFallbackDescription(character),
          batch: true,
          wardrobes: wardrobesWithoutPreviews.map(w => ({
            wardrobeId: w.id,
            description: w.description,
            accessories: w.accessories
          }))
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        if (error.code === 'INSUFFICIENT_CREDITS') {
          toast.error(`Insufficient credits. Need ${error.required} credits for ${error.wardrobeCount} wardrobes (headshot + full body each).`)
          return
        }
        throw new Error(error.error || 'Batch preview generation failed')
      }

      const result = await response.json()
      
      // Update each wardrobe with its headshot and full body URLs
      for (const item of result.results) {
        if (item.success) {
          const wardrobe = wardrobes.find(w => w.id === item.wardrobeId)
          if (wardrobe) {
            onUpdateWardrobe?.(characterId, {
              wardrobeId: item.wardrobeId,
              action: 'update',
              defaultWardrobe: wardrobe.description,
              wardrobeAccessories: wardrobe.accessories,
              headshotUrl: item.headshotUrl,
              fullBodyUrl: item.fullBodyUrl,
              previewImageUrl: item.previewImageUrl || item.fullBodyUrl
            })
          }
        }
      }
      
      toast.success(`Generated ${result.successCount} wardrobe preview set(s) (headshot + full body)!`)
    } catch (error) {
      console.error('[Wardrobe Preview Batch] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Batch preview generation failed')
    } finally {
      setIsGeneratingAllPreviews(false)
    }
  }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `character-reference-${characterId}`,
    data: {
      referenceType: 'character',
      referenceId: character.id || characterId,
      name: character.name,
      imageUrl: character.referenceImage,
    },
    disabled: !enableDrag,
  })

  const draggableStyle = enableDrag
    ? {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.65 : 1,
      }
    : undefined
  
  return (
    <div
      ref={setNodeRef}
      style={draggableStyle}
      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden"
    >
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
                  onOpenCharacterPrompt?.()
                }}
                className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                title="Open Prompt Builder"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              {onEditImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditImage()
                  }}
                  className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-sf-primary hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                  title="Edit image"
                >
                  <Wand2 className="w-4 h-4" />
                </button>
              )}
              {/* Enhance Reference Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  if (isEnhancingReference) return
                  handleEnhanceReference()
                }}
                disabled={isEnhancingReference || enhanceIterationCount >= 3}
                className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={enhanceIterationCount >= 3 
                  ? 'Max iterations reached - upload new image' 
                  : `Enhance reference (${3 - enhanceIterationCount} left)`}
              >
                {isEnhancingReference ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  if (isUploading) return
                  const input = document.getElementById(`upload-${characterId}`) as HTMLInputElement                                                            
                  input?.click()
                }}
                disabled={isUploading}
                className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"                                                    
                title={isUploading ? 'Uploading...' : 'Upload image'}
              >
                {isUploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </button>
              <input
                id={`upload-${characterId}`}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  e.stopPropagation()
                  if (isUploading) return
                  const file = e.target.files?.[0]
                  if (file) onUpload(file)
                  e.target.value = ''
                }}
              />
            </div>
            {/* Drag Handle - Bottom Strip */}
            {enableDrag && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center cursor-grab active:cursor-grabbing"
                {...listeners}
                {...attributes}
              >
                <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-white/60"></div>
                  <div className="w-1 h-1 rounded-full bg-white/60"></div>
                  <div className="w-1 h-1 rounded-full bg-white/60"></div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
            <ImageIcon className="w-12 h-12 text-gray-400" />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenCharacterPrompt?.()
                }} 
                disabled={isGenerating}
                title="Open Prompt Builder"
              >
                <Sparkles className="w-4 h-4" />
                Create
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  if (isUploading) return
                  const input = document.getElementById(`upload-${characterId}`) as HTMLInputElement                                                            
                  input?.click()
                }}
                disabled={isUploading || isGenerating}
                title="Upload image"
              >
                {isUploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
              <input
                id={`upload-${characterId}`}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  e.stopPropagation()
                  if (isUploading) return
                  const file = e.target.files?.[0]
                  if (file) onUpload(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        )}
        
        {/* Status Badges - Top Right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {/* Voice Status */}
          {character.voiceConfig ? (
            <div className="bg-green-500/90 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Mic className="w-3 h-3" />
              <span>Voice</span>
            </div>
          ) : (
            <div className="bg-amber-500/90 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm" title="Assign voice for audio generation">
              <AlertCircle className="w-3 h-3" />
              <span>No Voice</span>
            </div>
          )}
          {/* Image Status */}
          {character.referenceImage && (
            <div className="bg-green-500/90 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <ImageIcon className="w-3 h-3" />
              <span>Image</span>
            </div>
          )}
          {/* Wardrobe Status */}
          {wardrobes.length > 0 && (
            <div className="bg-purple-500/90 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Shirt className="w-3 h-3" />
              <span>{wardrobes.length}</span>
            </div>
          )}
        </div>
        
                {/* Loading overlay */}
        {(isGenerating || isUploading) && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">                                                         
            <Loader className="w-8 h-8 animate-spin text-white mb-2" />
            <span className="text-sm text-white font-medium">
              {isUploading ? 'Uploading...' : 'Generating...'}
            </span>                                                                               
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            {editingName ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={nameText}
                  onChange={(e) => setNameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') {
                      setEditingName(false)
                      setNameText('')
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-2 py-1 text-base font-semibold border border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSaveName()
                  }}
                  className="p-1 text-green-600 dark:text-green-400"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingName(false)
                    setNameText('')
                  }}
                  className="p-1 text-red-600 dark:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="font-bold text-base tracking-tight text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onUpdateCharacterName) {
                          setEditingName(true)
                          setNameText(character.name || '')
                        }
                      }}
                      title={onUpdateCharacterName ? "Click to edit name" : ""}
                    >
                      {character.name || 'Unnamed'}
                    </span>
                    {/* Orphan badge - character not in script */}
                    {isOrphan && (
                      <span 
                        className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full"
                        title="This character has no dialogue in the current script"
                      >
                        <AlertCircle className="w-2.5 h-2.5" />
                        Not in script
                      </span>
                    )}
                  </div>
                  {/* Inline voice info - shows voice name next to character name */}
                  {character.voiceConfig?.voiceName && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({character.voiceConfig.voiceName})
                    </span>
                  )}
                </div>
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Remove ${character.name}?`)) {
                        onRemove()
                      }
                    }}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                    title="Remove character"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
          {editingRole ? (
            <div className="flex gap-2 items-center">
              <select
                id={`role-select-${characterId}`}
                defaultValue={character.role || 'supporting'}
                onClick={(e) => e.stopPropagation()}
                className="text-xs px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 uppercase tracking-wide"
              >
                <option value="lead">Lead</option>
                <option value="supporting">Supporting</option>
                <option value="minor">Minor</option>
              </select>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSaveRole()
                }}
                className="p-0.5 text-green-600 dark:text-green-400"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingRole(false)
                }}
                className="p-0.5 text-red-600 dark:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              {character.role && (
                <span 
                  className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onUpdateCharacterRole) {
                      setEditingRole(true)
                    }
                  }}
                  title={onUpdateCharacterRole ? "Click to edit role" : ""}
                >
                  {character.role}
                </span>
              )}
            </>
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
        
        {/* Voice Button - Above Wardrobes */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setVoiceDialogOpen(true)
            }}
            className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-lg transition-colors ${
              character.voiceConfig
                ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            {character.voiceConfig ? 'Voice' : 'Add Voice'}
          </button>
        </div>
        
        {/* Wardrobe Section - Collapsible with Collection Management */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setWardrobeSectionExpanded(!wardrobeSectionExpanded)
            }}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Shirt className="w-4 h-4" />
              Wardrobes
              {wardrobes.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded">
                  {wardrobes.length}
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${wardrobeSectionExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {wardrobeSectionExpanded && (
            <div className="mt-3 space-y-3">
              {/* AI Assist Section */}
              {showAiAssist ? (
                <div className="space-y-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Wardrobe Assistant
                  </div>
                  <textarea
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                    placeholder="Describe the look you want, e.g., 'Professional tech CEO, modern minimalist style' or 'Rugged adventurer, practical outdoor wear'"
                    className="w-full px-2 py-1.5 text-xs rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    rows={2}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isGeneratingWardrobe}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateWardrobe(false, true) // Add as new to collection
                      }}
                      disabled={isGeneratingWardrobe || !aiPromptText.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingWardrobe ? (
                        <>
                          <Loader className="w-3 h-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          Generate & Add
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAiAssist(false)
                        setAiPromptText('')
                      }}
                      disabled={isGeneratingWardrobe}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400">
                    AI will generate specific outfit and add it to the wardrobe collection
                  </p>
                </div>
              ) : (editingWardrobe || showAddWardrobeForm) ? (
                <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {showAddWardrobeForm ? 'Add New Wardrobe' : 'Edit Wardrobe'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAiAssist(true)
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800/40"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI Assist
                    </button>
                  </div>
                  {showAddWardrobeForm && (
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Wardrobe Name</label>
                      <input
                        type="text"
                        value={wardrobeName}
                        onChange={(e) => setWardrobeName(e.target.value)}
                        placeholder="e.g., Office Attire, Casual, Formal Event"
                        className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Outfit Description</label>
                    <textarea
                      value={wardrobeText}
                      onChange={(e) => setWardrobeText(e.target.value)}
                      placeholder="e.g., Charcoal grey tailored suit, white dress shirt, dark blue silk tie"
                      className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                      rows={2}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Accessories</label>
                    <textarea
                      value={accessoriesText}
                      onChange={(e) => setAccessoriesText(e.target.value)}
                      placeholder="e.g., Silver wristwatch, rectangular glasses, gold wedding band"
                      className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                      rows={2}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveWardrobe()
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {showAddWardrobeForm ? 'Add to Collection' : 'Save'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingWardrobe(false)
                        setEditingWardrobeId(null)
                        setShowAddWardrobeForm(false)
                        setWardrobeText('')
                        setAccessoriesText('')
                        setWardrobeName('')
                      }}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Add New Wardrobe Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAddWardrobeForm(true)
                      setWardrobeText('')
                      setAccessoriesText('')
                      setWardrobeName('')
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Outfit
                  </button>
                  
                  {/* Analyze Script Button - Full Width */}
                  {scenes && scenes.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAnalyzeScriptForWardrobes()
                      }}
                      disabled={isAnalyzingScript}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      title="Analyze script to determine wardrobes needed for each scene range"
                    >
                      {isAnalyzingScript ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Analyzing Script...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>Generate Wardrobe</span>
                          <span className="text-[10px] opacity-75">({scenes.length} scenes)</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Wardrobe Suggestions from Script Analysis */}
                  {wardrobeSuggestions.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            Script Analysis Suggestions
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                            {wardrobeSuggestions.length}
                          </span>
                        </div>
                        {wardrobeSuggestions.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAcceptAllSuggestions()
                            }}
                            className="text-[10px] px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600"
                          >
                            Accept All
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {wardrobeSuggestions.map((suggestion, idx) => (
                          <div 
                            key={idx}
                            className="p-2 bg-white dark:bg-gray-800 rounded border border-amber-200 dark:border-amber-700"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {suggestion.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                    Scenes {suggestion.sceneNumbers.length === 1 
                                      ? suggestion.sceneNumbers[0]
                                      : `${Math.min(...suggestion.sceneNumbers)}-${Math.max(...suggestion.sceneNumbers)}`
                                    }
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {suggestion.description}
                                </p>
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 italic">
                                  {suggestion.reason}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAcceptSuggestion(suggestion)
                                  }}
                                  className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                  title="Accept suggestion"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setWardrobeSuggestions(prev => prev.filter((_, i) => i !== idx))
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                  title="Dismiss suggestion"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Wardrobe Collection List */}
                  {wardrobes.length > 0 ? (
                    <div className="space-y-2">
                      {/* Generate All Previews Button */}
                      {wardrobes.some(w => !w.previewImageUrl && !w.fullBodyUrl) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleGenerateAllPreviews()
                          }}
                          disabled={isGeneratingAllPreviews || generatingPreviewFor !== null}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGeneratingAllPreviews ? (
                            <>
                              <Loader className="w-3.5 h-3.5 animate-spin" />
                              Generating Previews...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3.5 h-3.5" />
                              Generate All Previews ({wardrobes.filter(w => !w.previewImageUrl && !w.fullBodyUrl).length} × 10 credits)
                            </>
                          )}
                        </button>
                      )}
                      
                      {wardrobes.map((w) => (
                        <div 
                          key={w.id}
                          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                            w.isDefault 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedWardrobe(w)
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            {/* Wardrobe Preview Thumbnail */}
                            <div className="flex-shrink-0 w-14 h-14 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                              {(w.fullBodyUrl || w.previewImageUrl) ? (
                                <img 
                                  src={w.fullBodyUrl || w.previewImageUrl} 
                                  alt={`${w.name} preview`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleGenerateWardrobePreview(w.id)
                                  }}
                                  disabled={generatingPreviewFor !== null || isGeneratingAllPreviews}
                                  className="w-full h-full flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
                                  title="Generate preview (5 credits)"
                                >
                                  {generatingPreviewFor === w.id ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <ImageIcon className="w-4 h-4" />
                                      <span className="text-[8px]">Preview</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                  {w.name}
                                </span>
                                {w.sceneNumbers && w.sceneNumbers.length > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                    {w.sceneNumbers.length === 1 
                                      ? `Scene ${w.sceneNumbers[0]}`
                                      : `Scenes ${Math.min(...w.sceneNumbers)}-${Math.max(...w.sceneNumbers)}`
                                    }
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                                {w.description}
                              </p>
                              {w.accessories && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                                  Accessories: {w.accessories}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                              {/* Expand button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedWardrobe(w)
                                }}
                                className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                                title="View full details"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                              {!w.isDefault && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSetDefaultWardrobe(w.id)
                                  }}
                                  className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                                  title="Set as default"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingWardrobe(true)
                                  setEditingWardrobeId(w.id)
                                  setWardrobeText(w.description)
                                  setAccessoriesText(w.accessories || '')
                                  setShowAddWardrobeForm(false)
                                }}
                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                title="Edit wardrobe"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {wardrobes.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteWardrobe(w.id)
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                  title="Delete wardrobe"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-2">
                      No wardrobes defined. Add an outfit or use Generate Wardrobe to analyze your script.
                    </p>
                  )}
                  
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 text-center">
                    Tip: Create multiple wardrobes for different scenes (office, casual, formal, etc.)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        

        
        {/* Browse Voices Dialog */}
        <BrowseVoicesDialog
          open={voiceDialogOpen}
          onOpenChange={setVoiceDialogOpen}
          provider={ttsProvider}
          selectedVoiceId={character.voiceConfig?.voiceId || ''}
          onSelectVoice={(voiceId, voiceName) => {
            onUpdateCharacterVoice?.(characterId, {
              provider: ttsProvider,
              voiceId,
              voiceName
            })
          }}
          characterContext={characterContext}
          screenplayContext={screenplayContext as ScreenplayContext}
        />
        
        {/* Approve Button - Show only if image exists and not approved */}
        {hasImage && !isApproved && (
          <button
            onClick={(e) => { 
              e.stopPropagation()
              onApprove()
            }}
            disabled={isGenerating}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3 inline mr-1" />
            Approve
          </button>
        )}
        
        {/* Enhance Reference Confirmation Dialog */}
        <Dialog open={showEnhanceConfirm} onOpenChange={setShowEnhanceConfirm}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Professional Headshot Preview
              </DialogTitle>
              <DialogDescription>
                Your reference image has been optimized for film production use. Compare and accept, or try again ({3 - enhanceIterationCount} iteration{3 - enhanceIterationCount !== 1 ? 's' : ''} remaining).
              </DialogDescription>
            </DialogHeader>
            
            {/* Quality Improvements Banner */}
            {enhanceQualityFeedback && enhanceQualityFeedback.improvements.length > 0 && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">Enhancements Applied</span>
                  {enhanceQualityFeedback.originalScore && (
                    <span className="text-xs text-gray-500 ml-auto">
                      Original quality score: {enhanceQualityFeedback.originalScore}/100
                    </span>
                  )}
                </div>
                <ul className="space-y-1">
                  {enhanceQualityFeedback.improvements.map((improvement, idx) => (
                    <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Original</p>
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-transparent">
                  {character.referenceImage && (
                    <img src={character.referenceImage} alt="Original" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-purple-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Professional Headshot
                </p>
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-purple-500/50">
                  {enhancedPreviewUrl && (
                    <img src={enhancedPreviewUrl} alt="Enhanced" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Pro tip */}
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
              <strong>💡 Pro Tip:</strong> Professional headshots with neutral gray backgrounds and front-facing poses provide the most consistent results across all scene generations.
            </div>
            
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEnhanceConfirm(false)
                  setEnhancedPreviewUrl(null)
                  setEnhanceQualityFeedback(null)
                }}
              >
                Keep Original
              </Button>
              {enhanceIterationCount < 3 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEnhanceConfirm(false)
                    setEnhancedPreviewUrl(null)
                    setEnhanceQualityFeedback(null)
                    handleEnhanceReference()
                  }}
                  disabled={isEnhancingReference}
                >
                  {isEnhancingReference ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
                  Try Again
                </Button>
              )}
              <Button
                onClick={handleAcceptEnhanced}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              >
                Accept Enhanced
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Wardrobe Expansion Modal */}
        <Dialog open={!!expandedWardrobe} onOpenChange={(open) => !open && setExpandedWardrobe(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-purple-500" />
                {expandedWardrobe?.name || 'Wardrobe Details'}
                {expandedWardrobe?.sceneNumbers && expandedWardrobe.sceneNumbers.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                    {expandedWardrobe.sceneNumbers.length === 1 
                      ? `Scene ${expandedWardrobe.sceneNumbers[0]}`
                      : `Scenes ${Math.min(...expandedWardrobe.sceneNumbers)}-${Math.max(...expandedWardrobe.sceneNumbers)}`
                    }
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {character.name}'s wardrobe for film production
              </DialogDescription>
            </DialogHeader>
            
            {expandedWardrobe && (
              <div className="space-y-6 py-4">
                {/* Full Body Studio Portrait */}
                <div className="flex justify-center">
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      <Shirt className="w-4 h-4" />
                      Full Body Portrait
                    </div>
                    <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      {(expandedWardrobe.fullBodyUrl || expandedWardrobe.previewImageUrl) ? (
                        <img 
                          src={expandedWardrobe.fullBodyUrl || expandedWardrobe.previewImageUrl} 
                          alt={`${expandedWardrobe.name} full body`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                          <Shirt className="w-12 h-12" />
                          <span className="text-sm">No preview</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerateWardrobePreview(expandedWardrobe.id)
                            }}
                            disabled={generatingPreviewFor !== null}
                            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {generatingPreviewFor === expandedWardrobe.id ? 'Generating...' : 'Generate Preview'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Outfit Description
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    {expandedWardrobe.description}
                  </p>
                </div>
                
                {/* Accessories */}
                {expandedWardrobe.accessories && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Accessories
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      {expandedWardrobe.accessories}
                    </p>
                  </div>
                )}
                
                {/* Reason (if from script analysis) */}
                {expandedWardrobe.reason && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Analysis
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 italic">
                      {expandedWardrobe.reason}
                    </p>
                  </div>
                )}
                
                {/* Scene Numbers */}
                {expandedWardrobe.sceneNumbers && expandedWardrobe.sceneNumbers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Used in Scenes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {expandedWardrobe.sceneNumbers.map(num => (
                        <span 
                          key={num}
                          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                        >
                          Scene {num}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (expandedWardrobe) {
                    setEditingWardrobe(true)
                    setEditingWardrobeId(expandedWardrobe.id)
                    setWardrobeText(expandedWardrobe.description)
                    setAccessoriesText(expandedWardrobe.accessories || '')
                    setExpandedWardrobe(null)
                  }
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => setExpandedWardrobe(null)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  
  // Build character context for voice recommendations (narrator-specific)
  const characterContext: CharacterContext = {
    name: character.name || 'Narrator',
    role: 'narrator',
    description: character.description
  }
  
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 overflow-hidden">
      <div className="p-3">
        {/* Header with badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
              {character.name}
            </span>
          </div>
          <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-medium rounded-full">
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
              {/* Voice Selection Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setVoiceDialogOpen(true)
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg hover:border-indigo-500/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-gray-200">
                    {character.voiceConfig?.voiceName || 'Select Narrator Voice...'}
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </button>
              
              {character.voiceConfig && (
                <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Voice configured
                </div>
              )}
              
              {/* Browse Voices Dialog */}
              <BrowseVoicesDialog
                open={voiceDialogOpen}
                onOpenChange={setVoiceDialogOpen}
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
                characterContext={characterContext}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// Scene Description Voice Card Component
interface DescriptionVoiceCardProps {
  character: any
  onUpdateCharacterVoice?: (characterId: string, voiceConfig: any) => void
  ttsProvider: 'google' | 'elevenlabs'
}

function DescriptionVoiceCard({ character, onUpdateCharacterVoice, ttsProvider }: DescriptionVoiceCardProps) {
  const [voiceSectionExpanded, setVoiceSectionExpanded] = useState(false)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)

  // Build character context for voice recommendations (description voice specific)
  const characterContext: CharacterContext = {
    name: character.name || 'Scene Description',
    role: 'narrator',  // Treat as narrator type for recommendations
    description: character.description
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 overflow-hidden">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
              {character.name}
            </span>
          </div>
          <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-medium rounded-full">
            Desc
          </span>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {character.description}
        </p>

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
              {/* Voice Selection Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setVoiceDialogOpen(true)
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-lg hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-200">
                    {character.voiceConfig?.voiceName || 'Select Description Voice...'}
                  </span>
                </div>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </button>
              
              {character.voiceConfig && (
                <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Voice configured
                </div>
              )}
              
              {/* Browse Voices Dialog */}
              <BrowseVoicesDialog
                open={voiceDialogOpen}
                onOpenChange={setVoiceDialogOpen}
                provider={ttsProvider}
                selectedVoiceId={character.voiceConfig?.voiceId || ''}
                onSelectVoice={(voiceId, voiceName) => {
                  onUpdateCharacterVoice?.(character.id, {
                    provider: ttsProvider,
                    voiceId,
                    voiceName
                  })
                }}
                characterContext={characterContext}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


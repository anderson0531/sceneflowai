const CharacterCard = ({ character, characterId, isSelected, onClick, onRegenerate, onGenerate, onUpload, onApprove, prompt, isGenerating, isUploading = false, isOrphan = false, expandedCharId, onToggleExpand, onUpdateCharacterVoice, onUpdateAppearance, onUpdateCharacterName, onUpdateCharacterRole, onUpdateCharacterAttributes, onUpdateWardrobe, onBatchUpdateWardrobes, scenes = [], onRemove, onEditImage, ttsProvider, voiceSectionExpanded, onToggleVoiceSection, enableDrag = false, onOpenCharacterPrompt, screenplayContext }: CharacterCardProps) => {
  const [imageError, setImageError] = useState(false) // Track if image failed to load
  
  // Reset imageError when referenceImage changes (new image uploaded)
  useEffect(() => {
    setImageError(false)
  }, [character.referenceImage])
  
  const hasImage = !!character.referenceImage && !imageError
  const isApproved = character.imageApproved === true
  const isCoreExpanded = expandedCharId === `${characterId}-core`
  const isAppearanceExpanded = expandedCharId === `${characterId}-appear`
  const [isCollapsed, setIsCollapsed] = useState(true) // Hide/show card content - default to collapsed
  const [editingName, setEditingName] = useState(false)
  const [nameText, setNameText] = useState('')
  const [editingRole, setEditingRole] = useState(false)
  const [wardrobeSectionExpanded, setWardrobeSectionExpanded] = useState(false)
  const [voiceSectionExpandedLocal, setVoiceSectionExpandedLocal] = useState(false)
  const [editingWardrobe, setEditingWardrobe] = useState(false)
  const [editingWardrobeId, setEditingWardrobeId] = useState<string | null>(null) // Which wardrobe is being edited
  const [wardrobeText, setWardrobeText] = useState('')
  const [editingBodyDescription, setEditingBodyDescription] = useState(false)
  const [bodyDescriptionText, setBodyDescriptionText] = useState('')
  const [accessoriesText, setAccessoriesText] = useState('')
  const [wardrobeName, setWardrobeName] = useState('') // Name for new/edited wardrobe
  const [showAiAssist, setShowAiAssist] = useState(false)
  const [aiPromptText, setAiPromptText] = useState('')
  const [isGeneratingWardrobe, setIsGeneratingWardrobe] = useState(false)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [showAddWardrobeForm, setShowAddWardrobeForm] = useState(false) // Toggle for add new wardrobe form
  const [enhancingWardrobeId, setEnhancingWardrobeId] = useState<string | null>(null) // Which wardrobe is being AI-enhanced
  
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
  
  // Costume reference generation state (uses /api/image/edit to create character-in-outfit reference)
  const [generatingCostumeRefFor, setGeneratingCostumeRefFor] = useState<string | null>(null)
  
  // Get wardrobes collection. Only synthesize legacy entry when:
  // 1. character.wardrobes is empty/undefined AND
  // 2. there's a meaningful legacy description to migrate
  const wardrobes: CharacterWardrobe[] = (character.wardrobes && character.wardrobes.length > 0)
    ? character.wardrobes
    : (character.defaultWardrobe?.trim() ? [{
        id: 'legacy-wardrobe',
        name: 'Default Outfit',
        description: character.defaultWardrobe,
        accessories: character.wardrobeAccessories,
        isDefault: true,
        createdAt: new Date().toISOString()
      }] : [])
  
  // Build character context for voice recommendations
  const characterContext: CharacterContext = {
    name: character.name || 'Unknown',
    role: character.role,
    gender: character.gender,
    age: character.age,
    ethnicity: character.ethnicity,
    personality: character.keyFeature,
    description: character.description || character.appearanceDescription,
    referenceImage: character.referenceImage,
    voiceDescription: character.voiceDescription
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
    } else {
      // Legacy: update default wardrobe
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: wardrobeText.trim(),
        wardrobeAccessories: accessoriesText.trim() || undefined
      })
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
  }
  
  // Handle setting a wardrobe as default
  const handleSetDefaultWardrobe = (wardrobeId: string) => {
    onUpdateWardrobe?.(characterId, {
      wardrobeId,
      action: 'setDefault'
    })
  }

  // Handle AI enhancement of a wardrobe description
  // Takes a vague description and generates a highly detailed, image-gen-optimized version
  const handleEnhanceWardrobe = async (wardrobeId: string) => {
    const wardrobe = wardrobes.find(w => w.id === wardrobeId)
    if (!wardrobe) return

    setEnhancingWardrobeId(wardrobeId)
    try {
      const response = await fetch('/api/character/enhance-wardrobe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: character.name,
          characterRole: character.role,
          appearanceDescription: character.appearanceDescription || generateFallbackDescription(character),
          currentWardrobeDescription: wardrobe.description,
          currentAccessories: wardrobe.accessories,
          wardrobeName: wardrobe.name,
          genre: screenplayContext?.genre,
          tone: screenplayContext?.tone,
          setting: screenplayContext?.setting,
          visualStyle: screenplayContext?.visualStyle,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enhance wardrobe')
      }

      const { enhanced } = await response.json()

      // Save the enhanced description directly
      // The handler automatically syncs the legacy defaultWardrobe field
      // when the updated wardrobe is the one marked isDefault
      onUpdateWardrobe?.(characterId, {
        defaultWardrobe: enhanced.description,
        wardrobeAccessories: enhanced.accessories || wardrobe.accessories,
        wardrobeId: wardrobeId,
        action: 'update'
      })

      // Update expanded wardrobe dialog if it's showing this wardrobe
      if (expandedWardrobe?.id === wardrobeId) {
        setExpandedWardrobe({
          ...expandedWardrobe,
          description: enhanced.description,
          accessories: enhanced.accessories || expandedWardrobe.accessories
        })
      }

      toast.success('Wardrobe description enhanced with AI-level detail')
    } catch (error) {
      console.error('[Enhance Wardrobe] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to enhance wardrobe')
    } finally {
      setEnhancingWardrobeId(null)
    }
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
          gender: character.gender, // Pass gender for pronoun usage in prompts
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
  
  // Generate costume reference image using /api/image/edit
  // This creates a character reference image wearing the specific outfit,
  // which is then used as the character reference during scene image generation
  // instead of text-based wardrobe descriptions
  const handleGenerateCostumeReference = async (wardrobeId: string) => {
    const wardrobe = wardrobes.find(w => w.id === wardrobeId)
    if (!wardrobe) return
    
    if (!character.referenceImage) {
      toast.error('Character reference image is required to generate a costume reference')
      return
    }
    
    if (!wardrobe.description) {
      toast.error('Wardrobe needs a description first. Use ✨ Enhance to add details.')
      return
    }
    
    setGeneratingCostumeRefFor(wardrobeId)
    try {
      // Build an edit instruction that changes the outfit while preserving identity
      const instruction = `Change this person's clothing to: ${wardrobe.description}${wardrobe.accessories ? `. Accessories: ${wardrobe.accessories}` : ''}. Keep the exact same person, face, expression, pose, and background. Only change the outfit.`
      
      const response = await fetch('/api/image/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'instruction',
          sourceImage: character.referenceImage,
          instruction,
          subjectReference: {
            imageUrl: character.referenceImage,
            description: character.appearanceDescription || character.name
          },
          saveToBlob: true,
          blobPrefix: `costume-ref-${characterId}`,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Costume reference generation failed')
      }
      
      const result = await response.json()
      
      // Save the costume reference URL to the wardrobe's fullBodyUrl field
      onUpdateWardrobe?.(characterId, {
        wardrobeId,
        action: 'update',
        defaultWardrobe: wardrobe.description,
        wardrobeAccessories: wardrobe.accessories,
        fullBodyUrl: result.imageUrl,
      })
      
      // Update expanded wardrobe dialog if showing this wardrobe
      if (expandedWardrobe?.id === wardrobeId) {
        setExpandedWardrobe({
          ...expandedWardrobe,
          fullBodyUrl: result.imageUrl,
        })
      }
      
      toast.success('Costume reference created! This image will be used during scene generation.')
    } catch (error) {
      console.error('[Costume Reference] Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate costume reference')
    } finally {
      setGeneratingCostumeRefFor(null)
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
  
  // Collapsed view - shows just character name with expand button
  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        style={draggableStyle}
        className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Small avatar thumbnail */}
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
              {character.referenceImage && !imageError ? (
                <img 
                  src={character.referenceImage} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate block">
                {character.name || 'Unnamed'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                {character.role || 'Character'}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsCollapsed(false)
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Show character details"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div
      ref={setNodeRef}
      style={draggableStyle}
      className="relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden flex flex-col"
    >
      {/* Loading overlay */}
      {(isGenerating || isUploading) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">                                                         
          <Loader className="w-8 h-8 animate-spin text-white mb-2" />
          <span className="text-sm text-white font-medium">
            {isUploading ? 'Uploading...' : 'Generating...'}
          </span>                                                                               
        </div>
      )}

      {/* Approve Button */}
      {hasImage && !isApproved && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
          <button
            onClick={(e) => { 
              e.stopPropagation()
              onApprove()
            }}
            disabled={isGenerating}
            className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3 inline mr-1" />
            Approve Image
          </button>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
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
        
        
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }}
            className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors shrink-0"
            title="Hide character card"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap gap-2">
          {character.voiceConfig ? (
            <div className="bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-green-500/20 shadow-sm">
              <Mic className="w-3 h-3" /> <span>Voice</span>
            </div>
          ) : (
            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-amber-500/20 shadow-sm" title="Assign voice for audio generation">
              <AlertCircle className="w-3 h-3" /> <span>No Voice</span>
            </div>
          )}
          {character.referenceImage && (
            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-blue-500/20 shadow-sm">
              <ImageIcon className="w-3 h-3" /> <span>Image</span>
            </div>
          )}
          {wardrobes.length > 0 && (
            <div className="bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-purple-500/20 shadow-sm">
              <Shirt className="w-3 h-3" /> <span>{wardrobes.length} Wardrobes</span>
            </div>
          )}
        </div>

{/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {character.description}
        </p>
        
        

        {/* Subsections */}
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          
          {/* Voice Settings */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
            <button
              onClick={(e) => { e.stopPropagation(); setVoiceSectionExpandedLocal(!voiceSectionExpandedLocal) }}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2 font-medium text-sm text-gray-900 dark:text-gray-100">
                <Mic className="w-4 h-4 text-gray-500" />
                Voice Settings
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded">
                  {character.voiceConfig ? character.voiceConfig.voiceName : 'Required'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${voiceSectionExpandedLocal ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {voiceSectionExpandedLocal && (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setVoiceDialogOpen(true)
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    character.voiceConfig
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                      : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  Select Voice
                </button>
              </div>
            )}
          </div>

          {/* Talent Reference */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
            <button
              onClick={(e) => { e.stopPropagation(); setTalentSectionExpanded(!talentSectionExpanded) }}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2 font-medium text-sm text-gray-900 dark:text-gray-100">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                Talent
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${talentSectionExpanded ? 'rotate-180' : ''}`} />
            </button>
            {talentSectionExpanded && (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-3">
{/* Image Section */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        {character.referenceImage && !imageError ? (
          <>
            <img 
              src={character.referenceImage} 
              alt={character.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
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
        
        </div>

{/* Body Description - Editable for image generation prompts */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
              <User className="w-3.5 h-3.5" />
              Body Description
            </span>
            {!editingBodyDescription && onUpdateAppearance && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setBodyDescriptionText(character.appearanceDescription || '')
                  setEditingBodyDescription(true)
                }}
                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                title="Edit body description for image generation"
              >
                <Edit className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {editingBodyDescription ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={bodyDescriptionText}
                onChange={(e) => setBodyDescriptionText(e.target.value)}
                placeholder="e.g., Athletic build, tall, muscular, slim figure"
                className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingBodyDescription(false)}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onUpdateAppearance) {
                      onUpdateAppearance(characterId, bodyDescriptionText)
                      setEditingBodyDescription(false)
                    }
                  }}
                  className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              {character.appearanceDescription || 'Click edit to add body description'}
            </p>
          )}
        </div>
        
        
              </div>
            )}
          </div>

          {/* Wardrobes */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
            <button
              onClick={(e) => { e.stopPropagation(); setWardrobeSectionExpanded(!wardrobeSectionExpanded) }}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2 font-medium text-sm text-gray-900 dark:text-gray-100">
                <Shirt className="w-4 h-4 text-gray-500" />
                Character Wardrobes
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${wardrobeSectionExpanded ? 'rotate-180' : ''}`} />
            </button>
            {wardrobeSectionExpanded && (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-4">
{/* Primary CTA: Analyze Script for Outfits (Automate) */}
              {scenes && scenes.length > 0 && wardrobes.length === 0 && !isAnalyzingScript && wardrobeSuggestions.length === 0 && (
                <div className="text-center py-3">
                  <p className="text-xs text-gray-400 mb-2">
                    Analyze your script to determine which outfits {character.name} needs across scenes.
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAnalyzeScriptForWardrobes()
                    }}
                    disabled={isAnalyzingScript}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    title="Analyze script to determine wardrobes needed for each scene range"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Analyze Script for Outfits</span>
                    <span className="text-[10px] opacity-75">({scenes.length} scenes)</span>
                  </button>
                </div>
              )}

              {/* Analyzing indicator */}
              {isAnalyzingScript && (
                <div className="flex items-center justify-center gap-2 py-4 text-amber-400">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Analyzing {scenes?.length || 0} scenes...</span>
                </div>
              )}

              {/* Wardrobe Suggestions from Script Analysis (Guide) */}
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
                                Scenes {suggestion.sceneNumbers.join(', ')}
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

              {/* Guided Edit Form — AI Assist or Manual (Control) */}
              {showAiAssist ? (
                <div className="space-y-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    Guided Wardrobe Edit
                  </div>
                  <textarea
                    value={aiPromptText}
                    onChange={(e) => setAiPromptText(e.target.value)}
                    placeholder="Describe the wardrobe change, e.g., 'Make the suit navy instead of black' or 'Professional tech CEO, modern minimalist'"
                    className="w-full px-2 py-1.5 text-xs rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    rows={2}
                    onClick={(e) => e.stopPropagation()}
                    disabled={isGeneratingWardrobe}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleGenerateWardrobe(false, true)
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
              ) : null}

              
                
                {/* Large Image Wardrobe Cards */}
                {wardrobes.length > 0 && (
                  <div className="space-y-4">
                    {wardrobes.map((w) => (
                      <div 
                        key={w.id}
                        className={`rounded-lg border overflow-hidden transition-colors ${
                          w.isDefault 
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-700/50' 
                            : 'bg-gray-50/50 dark:bg-gray-800/10 border-gray-200 dark:border-gray-700/50'
                        }`}
                      >
                        {/* Large Image Format */}
                        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {(w.fullBodyUrl || w.headshotUrl || w.previewImageUrl) ? (
                            <>
                              <img 
                                src={w.fullBodyUrl || w.headshotUrl || w.previewImageUrl} 
                                alt={w.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all opacity-0 hover:opacity-100 flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleGenerateCostumeReference(w.id)
                                  }}
                                  disabled={generatingCostumeRefFor === w.id}
                                  className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                                  title={w.fullBodyUrl ? 'Regenerate costume reference' : 'Generate costume reference'}
                                >
                                  {generatingCostumeRefFor === w.id ? <Loader className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEnhanceWardrobe(w.id)
                                  }}
                                  disabled={enhancingWardrobeId === w.id}
                                  className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                                  title="Enhance with AI"
                                >
                                  {enhancingWardrobeId === w.id ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingWardrobe(true)
                                    setEditingWardrobeId(w.id)
                                    setWardrobeText(w.description)
                                    setAccessoriesText(w.accessories || '')
                                    setShowAddWardrobeForm(false)
                                  }}
                                  className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                                  title="Edit wardrobe"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {wardrobes.length > 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteWardrobe(w.id)
                                    }}
                                    className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                                    title="Delete wardrobe"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedWardrobe(w)
                                  }}
                                  className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                                  title="Expand details"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                              <Shirt className="w-12 h-12 text-gray-400" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleGenerateCostumeReference(w.id)
                                }}
                                disabled={generatingCostumeRefFor === w.id}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded shadow flex items-center gap-1"
                              >
                                {generatingCostumeRefFor === w.id ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                Generate Costume
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Details below image */}
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                              {w.name}
                            </span>
                            {w.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400 rounded">
                                default
                              </span>
                            )}
                            {w.sceneNumbers && w.sceneNumbers.length > 0 && (
                              <span className="text-[10px] text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                Scenes {formatSceneRange(w.sceneNumbers)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                            {w.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

{/* Bottom action row */}
              {wardrobes.length > 0 && !editingWardrobe && !showAddWardrobeForm && !showAiAssist && (
                <div className="flex gap-2">
                  {/* Re-analyze button */}
                  {scenes && scenes.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAnalyzeScriptForWardrobes()
                      }}
                      disabled={isAnalyzingScript}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-amber-500 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 disabled:opacity-50"
                    >
                      {isAnalyzingScript ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Re-analyze
                    </button>
                  )}
                  {/* Manual add */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAddWardrobeForm(true)
                      setWardrobeText('')
                      setAccessoriesText('')
                      setWardrobeName('')
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-gray-400 border border-gray-600/30 rounded-lg hover:bg-gray-700/30"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                  {/* AI Assist */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAiAssist(true)
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI
                  </button>
                </div>
              )}

              {/* Generate Previews — only when wardrobes exist */}
              {wardrobes.length > 0 && wardrobes.some(w => !w.fullBodyUrl && !w.previewImageUrl) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleGenerateAllPreviews()
                  }}
                  disabled={isGeneratingAllPreviews || generatingPreviewFor !== null}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-purple-400 border border-purple-500/20 rounded-lg hover:bg-purple-500/10 disabled:opacity-50"
                >
                  {isGeneratingAllPreviews ? (
                    <>
                      <Loader className="w-3 h-3 animate-spin" />
                      Generating Previews...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3 h-3" />
                      Generate Previews ({wardrobes.filter(w => !w.fullBodyUrl && !w.previewImageUrl).length})
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
        

        
        
        </div>
      </div>

{/* Voice Selection Dialog */}
        <VoiceSelectionDialog
          open={voiceDialogOpen}
          onOpenChange={setVoiceDialogOpen}
          provider={ttsProvider}
          mode="character"
          selectedVoiceId={character.voiceConfig?.voiceId || ''}
          onSelectVoice={(voiceId, voiceName, prompt) => {
            onUpdateCharacterVoice?.(characterId, {
              provider: ttsProvider,
              voiceId,
              voiceName,
              prompt: prompt || character.voiceConfig?.prompt
            })
          }}
          characterContext={characterContext}
          screenplayContext={screenplayContext as ScreenplayContext}
          characterAudioSampleUrl={character.voiceTrainingAudioUrl}
          onVoiceDescriptionGenerated={(description) => {
            onUpdateCharacterAttributes?.(characterId, { voiceDescription: description })
          }}
          onVoiceTrainingAudioSaved={(audioUrl) => {
            onUpdateCharacterAttributes?.(characterId, { voiceTrainingAudioUrl: audioUrl })
          }}
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
                    Scenes {formatSceneRange(expandedWardrobe.sceneNumbers)}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription>
                {character.name}'s wardrobe for film production
              </DialogDescription>
            </DialogHeader>
            
            {expandedWardrobe && (
              <div className="space-y-6 py-4">
                {/* Full Body Studio Portrait / Costume Reference */}
                <div className="flex justify-center">
                  <div className="w-full max-w-sm space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                      {expandedWardrobe.fullBodyUrl ? (
                        <>
                          <ImageIcon className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">Costume Reference</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded-full">Used in generation</span>
                        </>
                      ) : (
                        <>
                          <Shirt className="w-4 h-4" />
                          Wardrobe Preview
                        </>
                      )}
                    </div>
                    <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      {(expandedWardrobe.fullBodyUrl || expandedWardrobe.previewImageUrl) ? (
                        <>
                          <img 
                            src={expandedWardrobe.fullBodyUrl || expandedWardrobe.previewImageUrl} 
                            alt={`${expandedWardrobe.name} full body`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken image and show placeholder
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                          <div className="hidden w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                            <Shirt className="w-12 h-12" />
                            <span className="text-sm">Image unavailable</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleGenerateWardrobePreview(expandedWardrobe.id)
                              }}
                              disabled={generatingPreviewFor !== null}
                              className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                            >
                              {generatingPreviewFor === expandedWardrobe.id ? 'Generating...' : 'Regenerate Preview'}
                            </button>
                          </div>
                        </>
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Outfit Description
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="group relative">
                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        <div className="absolute right-0 bottom-full mb-1 w-56 p-2 bg-gray-900 text-gray-200 text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          More detailed descriptions produce more consistent images across scenes. Use ✨ Enhance to automatically add specifics like exact colors, materials, fit, and footwear.
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEnhanceWardrobe(expandedWardrobe.id)
                        }}
                        disabled={enhancingWardrobeId === expandedWardrobe.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/40 disabled:opacity-50"
                      >
                        {enhancingWardrobeId === expandedWardrobe.id ? (
                          <><Loader className="w-3 h-3 animate-spin" /> Enhancing...</>
                        ) : (
                          <><Wand2 className="w-3 h-3" /> Enhance</>
                        )}
                      </button>
                    </div>
                  </div>
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
              {expandedWardrobe && !expandedWardrobe.isDefault && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (expandedWardrobe) {
                      handleSetDefaultWardrobe(expandedWardrobe.id)
                      setExpandedWardrobe(null)
                    }
                  }}
                  className="border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Set as Default
                </Button>
              )}
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
                variant="outline"
                onClick={() => {
                  if (expandedWardrobe) {
                    handleGenerateCostumeReference(expandedWardrobe.id)
                  }
                }}
                disabled={generatingCostumeRefFor !== null}
                className="border-green-500/50 text-green-600 dark:text-green-400 hover:bg-green-500/10"
              >
                {generatingCostumeRefFor === expandedWardrobe?.id ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {expandedWardrobe?.fullBodyUrl ? 'Regenerate Costume Ref' : 'Generate Costume Ref'}
                  </>
                )}
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



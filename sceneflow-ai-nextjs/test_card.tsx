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



const CharacterCard = ({ character, characterId, isSelected, onClick, onRegenerate, onGenerate, onUpload, onApprove, prompt, isGenerating, isUploading = false, isOrphan = false, expandedCharId, onToggleExpand, onUpdateCharacterVoice, onUpdateAppearance, onUpdateCharacterName, onUpdateCharacterRole, onUpdateCharacterAttributes, onUpdateWardrobe, onBatchUpdateWardrobes, scenes = [], onRemove, onEditImage, ttsProvider, voiceSectionExpanded, onToggleVoiceSection, enableDrag = false, onOpenCharacterPrompt, screenplayContext }: CharacterCardProps) => {
  const [imageError, setImageError] = useState(false) // Track if image failed to load
  
  // Reset imageError when referenceImage changes (new image uploaded)
  useEffect(() => {
  return ( <div></div> )
}

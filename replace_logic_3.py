with open('character_card.tsx', 'r') as f:
    text = f.read()

start_sig = '  return (\n    <div\n      ref={setNodeRef}'

idx = text.find(start_sig)
before_return = text[:idx]

def extract_section(s, e):
    i1 = text.find(s, idx)
    i2 = text.find(e, i1)
    return text[i1:i2]

image_section = extract_section('{/* Image Section */}', '{/* Status Badges - Top Right */}') + "</div>"
header_section = extract_section('{/* Header */}', '{/* Description */}')
desc_section = extract_section('{/* Description */}', '{/* Body Description - Editable for image generation prompts */}')
body_desc_section = extract_section('{/* Body Description - Editable for image generation prompts */}', '{/* Voice Button - Above Wardrobes */}')
wardrobe_top = extract_section('{/* Primary CTA: Analyze Script for Outfits (Automate) */}', '{/* Compact Scene-Mapped Wardrobe List */}')
wardrobe_bottom = extract_section('{/* Bottom action row */}', '{/* Voice Selection Dialog */}')

rest_start = '{/* Voice Selection Dialog */}'
rest_end = text.rfind('}')
rest_section = text[text.find(rest_start):rest_end]

# Same new_return as before but remove the last `</div>`
new_return = f"""  return (
    <div
      ref={{setNodeRef}}
      style={{draggableStyle}}
      className="relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden flex flex-col"
    >
      {{/* Loading overlay */}}
      {{(isGenerating || isUploading) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">                                                         
          <Loader className="w-8 h-8 animate-spin text-white mb-2" />
          <span className="text-sm text-white font-medium">
            {{isUploading ? 'Uploading...' : 'Generating...'}}
          </span>                                                                               
        </div>
      )}}

      {{/* Approve Button */}}
      {{hasImage && !isApproved && (
        <div className="p-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
          <button
            onClick={{(e) => {{ 
              e.stopPropagation()
              onApprove()
            }}}}
            disabled={{isGenerating}}
            className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3 inline mr-1" />
            Approve Image
          </button>
        </div>
      )}}

      <div className="p-4 space-y-4">
        {{/* Header Section */}}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
{header_section}
          </div>
          <button
            onClick={{(e) => {{ e.stopPropagation(); setIsCollapsed(true); }}}}
            className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors shrink-0"
            title="Hide character card"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {{/* Status Indicators */}}
        <div className="flex flex-wrap gap-2">
          {{character.voiceConfig ? (
            <div className="bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-green-500/20 shadow-sm">
              <Mic className="w-3 h-3" /> <span>Voice</span>
            </div>
          ) : (
            <div className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-amber-500/20 shadow-sm" title="Assign voice for audio generation">
              <AlertCircle className="w-3 h-3" /> <span>No Voice</span>
            </div>
          )}}
          {{character.referenceImage && (
            <div className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-blue-500/20 shadow-sm">
              <ImageIcon className="w-3 h-3" /> <span>Image</span>
            </div>
          )}}
          {{wardrobes.length > 0 && (
            <div className="bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-purple-500/20 shadow-sm">
              <Shirt className="w-3 h-3" /> <span>{{wardrobes.length}} Wardrobes</span>
            </div>
          )}}
        </div>

{desc_section}

        {{/* Subsections */}}
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          
          {{/* Voice Settings */}}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
            <button
              onClick={{(e) => {{ e.stopPropagation(); setVoiceSectionExpandedLocal(!voiceSectionExpandedLocal) }}}}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2 font-medium text-sm text-gray-900 dark:text-gray-100">
                <Mic className="w-4 h-4 text-gray-500" />
                Voice Settings
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded">
                  {{character.voiceConfig ? character.voiceConfig.voiceName : 'Required'}}
                </span>
                <ChevronDown className={{`w-4 h-4 text-gray-500 transition-transform ${{voiceSectionExpandedLocal ? 'rotate-180' : ''}}`}} />
              </div>
            </button>
            {{voiceSectionExpandedLocal && (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={{(e) => {{
                    e.stopPropagation()
                    setVoiceDialogOpen(true)
                  }}}}
                  className={{`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${{
                    character.voiceConfig
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                      : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }}`}}
                >
                  <Volume2 className="w-4 h-4" />
                  Select Voice
                </button>
              </div>
            )}}
          </div>

          {{/* Talent Reference */}}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
            <button
              onClick={{(e) => {{ e.stopPropagation(); setTalentSectionExpanded(!talentSectionExpanded) }}}}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2 font-medium text-sm text-gray-900 dark:text-gray-100">
                <ImageIcon className="w-4 h-4 text-gray-500" />
                Talent
              </div>
              <ChevronDown className={{`w-4 h-4 text-gray-500 transition-transform ${{talentSectionExpanded ? 'rotate-180' : ''}}`}} />
            </button>
            {{talentSectionExpanded && (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-3">
{image_section}

{body_desc_section}
              </div>
            )}}
          </div>

          {{/* Wardrobes */}}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
            <button
              onClick={{(e) => {{ e.stopPropagation(); setWardrobeSectionExpanded(!wardrobeSectionExpanded) }}}}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-2 font-medium text-sm text-gray-900 dark:text-gray-100">
                <Shirt className="w-4 h-4 text-gray-500" />
                Character Wardrobes
              </div>
              <ChevronDown className={{`w-4 h-4 text-gray-500 transition-transform ${{wardrobeSectionExpanded ? 'rotate-180' : ''}}`}} />
            </button>
            {{wardrobeSectionExpanded && (
              <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-4">
{wardrobe_top}
                
                {{/* Large Image Wardrobe Cards */}}
                {{wardrobes.length > 0 && (
                  <div className="space-y-4">
                    {{wardrobes.map((w) => (
                      <div 
                        key={{w.id}}
                        className={{`rounded-lg border overflow-hidden transition-colors ${{
                          w.isDefault 
                            ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-700/50' 
                            : 'bg-gray-50/50 dark:bg-gray-800/10 border-gray-200 dark:border-gray-700/50'
                        }}`}}
                      >
                        {{/* Large Image Format */}}
                        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          {{(w.fullBodyUrl || w.headshotUrl || w.previewImageUrl) ? (
                            <>
                              <img 
                                src={{w.fullBodyUrl || w.headshotUrl || w.previewImageUrl}} 
                                alt={{w.name}}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all opacity-0 hover:opacity-100 flex items-center justify-center gap-2">
                                <button
                                  onClick={{(e) => {{
                                    e.stopPropagation()
                                    handleGenerateCostumeReference(w.id)
                                  }}}}
                                  disabled={{generatingCostumeRefFor === w.id}}
                                  className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                                  title={{w.fullBodyUrl ? 'Regenerate costume reference' : 'Generate costume reference'}}
                                >
                                  {{generatingCostumeRefFor === w.id ? <Loader className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}}
                                </button>
                                <button
                                  onClick={{(e) => {{
                                    e.stopPropagation()
                                    handleEnhanceWardrobe(w.id)
                                  }}}}
                                  disabled={{enhancingWardrobeId === w.id}}
                                  className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                                  title="Enhance with AI"
                                >
                                  {{enhancingWardrobeId === w.id ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}}
                                </button>
                                <button
                                  onClick={{(e) => {{
                                    e.stopPropagation()
                                    setEditingWardrobe(true)
                                    setEditingWardrobeId(w.id)
                                    setWardrobeText(w.description)
                                    setAccessoriesText(w.accessories || '')
                                    setShowAddWardrobeForm(false)
                                  }}}}
                                  className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                                  title="Edit wardrobe"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {{wardrobes.length > 1 && (
                                  <button
                                    onClick={{(e) => {{
                                      e.stopPropagation()
                                      handleDeleteWardrobe(w.id)
                                    }}}}
                                    className="p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-sm"
                                    title="Delete wardrobe"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}}
                                <button
                                  onClick={{(e) => {{
                                    e.stopPropagation()
                                    setExpandedWardrobe(w)
                                  }}}}
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
                                onClick={{(e) => {{
                                  e.stopPropagation()
                                  handleGenerateCostumeReference(w.id)
                                }}}}
                                disabled={{generatingCostumeRefFor === w.id}}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded shadow flex items-center gap-1"
                              >
                                {{generatingCostumeRefFor === w.id ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}}
                                Generate Costume
                              </button>
                            </div>
                          )}}
                        </div>
                        
                        {{/* Details below image */}}
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                              {{w.name}}
                            </span>
                            {{w.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded">
                                default
                              </span>
                            )}}
                            {{w.sceneNumbers && w.sceneNumbers.length > 0 && (
                              <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                Scenes {{formatSceneRange(w.sceneNumbers)}}
                              </span>
                            )}}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5">
                            {{w.description}}
                          </p>
                        </div>
                      </div>
                    ))}}
                  </div>
                )}}

{wardrobe_bottom}
              </div>
            )}}
          </div>
        </div>
      </div>

{rest_section}
"""

with open('new_character_card.tsx', 'w') as f:
    f.write(before_return + new_return)


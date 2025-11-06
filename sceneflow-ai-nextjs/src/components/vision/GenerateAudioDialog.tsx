'use client'

import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Globe, CheckCircle2, AlertCircle, XCircle, Loader, Sparkles } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'
import { getAvailableLanguages, hasLanguageAudio } from '@/lib/audio/languageDetection'

interface LanguageStatus {
  code: string
  name: string
  status: 'complete' | 'partial' | 'none'
  narrationCount: number
  dialogueCount: number
  musicCount: number
  sfxCount: number
}

interface GenerateAudioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  script: any
  onGenerate: (language: string, audioTypes: { narration: boolean; dialogue: boolean; music: boolean; sfx: boolean }) => Promise<void>
  isGenerating?: boolean
}

export function GenerateAudioDialog({
  open,
  onOpenChange,
  script,
  onGenerate,
  isGenerating = false,
}: GenerateAudioDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en')
  const [audioTypes, setAudioTypes] = useState({
    narration: true,
    dialogue: true,
    music: false,
    sfx: false,
  })

  const scenes = script?.script?.scenes || []

  // Calculate language status for all languages
  const languageStatuses = useMemo((): LanguageStatus[] => {
    return SUPPORTED_LANGUAGES.map(lang => {
      let narrationCount = 0
      let dialogueCount = 0
      let musicCount = 0
      let sfxCount = 0

      scenes.forEach((scene: any) => {
        // Check narration
        const hasNarration = 
          (scene.narrationAudio?.[lang.code]?.url) ||
          (lang.code === 'en' && scene.narrationAudioUrl)
        if (hasNarration) narrationCount++

        // Check dialogue
        const dialogueArray = scene.dialogueAudio?.[lang.code] || (lang.code === 'en' ? scene.dialogueAudio : null)
        if (Array.isArray(dialogueArray) && dialogueArray.length > 0) {
          const hasDialogue = dialogueArray.some((d: any) => d.audioUrl)
          if (hasDialogue) {
            dialogueCount += dialogueArray.filter((d: any) => d.audioUrl).length
          }
        }

        // Check music
        if (scene.musicUrl || scene.music?.url) musicCount++

        // Check SFX
        if (Array.isArray(scene.sfx)) {
          const sfxWithAudio = scene.sfx.filter((sfx: any) => 
            (typeof sfx === 'object' && sfx.url) || (typeof sfx === 'string' && sfx)
          )
          sfxCount += sfxWithAudio.length
        }
      })

      const totalScenes = scenes.length
      const hasNarration = narrationCount > 0
      const hasDialogue = dialogueCount > 0
      const hasAny = hasNarration || hasDialogue || musicCount > 0 || sfxCount > 0
      
      let status: 'complete' | 'partial' | 'none' = 'none'
      if (narrationCount === totalScenes && hasDialogue) {
        status = 'complete'
      } else if (hasAny) {
        status = 'partial'
      }

      return {
        code: lang.code,
        name: lang.name,
        status,
        narrationCount,
        dialogueCount,
        musicCount,
        sfxCount,
      }
    })
  }, [scenes])

  // Calculate counts for selected language
  const selectedLanguageStatus = languageStatuses.find(l => l.code === selectedLanguage) || {
    code: selectedLanguage,
    name: SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage,
    status: 'none' as const,
    narrationCount: 0,
    dialogueCount: 0,
    musicCount: 0,
    sfxCount: 0,
  }

  // Calculate what will be generated
  const totalScenes = scenes.length
  const totalDialogueLines = scenes.reduce((sum: number, scene: any) => {
    const dialogue = scene.dialogue || []
    return sum + dialogue.length
  }, 0)

  const totalSFXCount = scenes.reduce((sum: number, scene: any) => {
    const sfx = scene.sfx || []
    return sum + sfx.length
  }, 0)

  const willGenerateNarration = audioTypes.narration
  const willGenerateDialogue = audioTypes.dialogue
  const willGenerateMusic = audioTypes.music
  const willGenerateSFX = audioTypes.sfx

  const narrationCount = willGenerateNarration ? totalScenes : 0
  const dialogueCount = willGenerateDialogue ? totalDialogueLines : 0
  const musicCount = willGenerateMusic ? totalScenes : 0
  const sfxCount = willGenerateSFX ? totalSFXCount : 0

  const willOverwrite = selectedLanguageStatus.status !== 'none' && (
    (willGenerateNarration && selectedLanguageStatus.narrationCount > 0) ||
    (willGenerateDialogue && selectedLanguageStatus.dialogueCount > 0) ||
    (willGenerateMusic && selectedLanguageStatus.musicCount > 0) ||
    (willGenerateSFX && selectedLanguageStatus.sfxCount > 0)
  )

  const handleGenerate = async () => {
    await onGenerate(selectedLanguage, audioTypes)
    // Dialog will be closed by parent if generation is successful
  }

  const handleToggleAll = (checked: boolean) => {
    setAudioTypes({
      narration: checked,
      dialogue: checked,
      music: checked,
      sfx: checked,
    })
  }

  const allSelected = audioTypes.narration && audioTypes.dialogue && audioTypes.music && audioTypes.sfx
  const noneSelected = !audioTypes.narration && !audioTypes.dialogue && !audioTypes.music && !audioTypes.sfx

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Generate Audio
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Select language and audio types to generate for all scenes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Language Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Target Language
            </label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {SUPPORTED_LANGUAGES.map(lang => (
                  <SelectItem 
                    key={lang.code} 
                    value={lang.code}
                    className="text-white hover:bg-gray-700 focus:bg-gray-700"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Language Status List */}
            <div className="bg-gray-800 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              <div className="text-xs font-medium text-gray-400 mb-2">Language Status:</div>
              {languageStatuses.map(status => {
                const isSelected = status.code === selectedLanguage
                const Icon = status.status === 'complete' 
                  ? CheckCircle2 
                  : status.status === 'partial' 
                  ? AlertCircle 
                  : XCircle
                const iconColor = status.status === 'complete'
                  ? 'text-green-400'
                  : status.status === 'partial'
                  ? 'text-yellow-400'
                  : 'text-gray-500'

                return (
                  <div
                    key={status.code}
                    className={`flex items-center justify-between text-xs p-2 rounded ${
                      isSelected ? 'bg-blue-900/30 border border-blue-700' : 'hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3 h-3 ${iconColor}`} />
                      <span className={isSelected ? 'text-blue-300 font-medium' : 'text-gray-300'}>
                        {status.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400">
                      {status.narrationCount > 0 && (
                        <span>N:{status.narrationCount}</span>
                      )}
                      {status.dialogueCount > 0 && (
                        <span>D:{status.dialogueCount}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Audio Types Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-200">Audio Types</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll(!allSelected)}
                className="text-xs h-7 text-blue-400 hover:text-blue-300"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="narration"
                  checked={audioTypes.narration}
                  onCheckedChange={(checked) =>
                    setAudioTypes({ ...audioTypes, narration: !!checked })
                  }
                />
                <label
                  htmlFor="narration"
                  className="flex-1 text-sm text-gray-200 cursor-pointer"
                >
                  <div className="font-medium">Narration</div>
                  <div className="text-xs text-gray-400">
                    {totalScenes} scenes • {selectedLanguageStatus.narrationCount === totalScenes 
                      ? '✅ Complete' 
                      : selectedLanguageStatus.narrationCount > 0 
                      ? `⚠️ Partial (${selectedLanguageStatus.narrationCount}/${totalScenes})` 
                      : '❌ Not generated'}
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="dialogue"
                  checked={audioTypes.dialogue}
                  onCheckedChange={(checked) =>
                    setAudioTypes({ ...audioTypes, dialogue: !!checked })
                  }
                />
                <label
                  htmlFor="dialogue"
                  className="flex-1 text-sm text-gray-200 cursor-pointer"
                >
                  <div className="font-medium">Dialogue</div>
                  <div className="text-xs text-gray-400">
                    {totalDialogueLines} lines • {selectedLanguageStatus.dialogueCount === totalDialogueLines 
                      ? '✅ Complete' 
                      : selectedLanguageStatus.dialogueCount > 0 
                      ? `⚠️ Partial (${selectedLanguageStatus.dialogueCount}/${totalDialogueLines})` 
                      : '❌ Not generated'}
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="music"
                  checked={audioTypes.music}
                  onCheckedChange={(checked) =>
                    setAudioTypes({ ...audioTypes, music: !!checked })
                  }
                />
                <label
                  htmlFor="music"
                  className="flex-1 text-sm text-gray-200 cursor-pointer"
                >
                  <div className="font-medium">Background Music</div>
                  <div className="text-xs text-gray-400">
                    {totalScenes} scenes • {selectedLanguageStatus.musicCount > 0 
                      ? `✅ ${selectedLanguageStatus.musicCount} generated` 
                      : '❌ Not generated'}
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="sfx"
                  checked={audioTypes.sfx}
                  onCheckedChange={(checked) =>
                    setAudioTypes({ ...audioTypes, sfx: !!checked })
                  }
                />
                <label
                  htmlFor="sfx"
                  className="flex-1 text-sm text-gray-200 cursor-pointer"
                >
                  <div className="font-medium">Sound Effects</div>
                  <div className="text-xs text-gray-400">
                    {sfxCount} effects • {selectedLanguageStatus.sfxCount > 0 
                      ? `✅ ${selectedLanguageStatus.sfxCount} generated` 
                      : '❌ Not generated'}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Generation Summary */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 space-y-2">
            <div className="text-sm font-medium text-blue-300">Generation Summary</div>
            <div className="text-xs text-gray-300 space-y-1">
              {willGenerateNarration && (
                <div>• {narrationCount} narration file{narrationCount !== 1 ? 's' : ''}</div>
              )}
              {willGenerateDialogue && (
                <div>• {dialogueCount} dialogue file{dialogueCount !== 1 ? 's' : ''}</div>
              )}
              {willGenerateMusic && (
                <div>• {musicCount} music file{musicCount !== 1 ? 's' : ''}</div>
              )}
              {willGenerateSFX && (
                <div>• {sfxCount} SFX file{sfxCount !== 1 ? 's' : ''}</div>
              )}
              <div className="pt-1 text-blue-300">
                Language: <strong>{SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}</strong>
              </div>
            </div>
            {willOverwrite && (
              <div className="text-xs text-yellow-400 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" />
                <span>This will overwrite existing audio files for the selected types</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="border-gray-700 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || noneSelected}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


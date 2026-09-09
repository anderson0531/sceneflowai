'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BlueprintGeminiVoicePicker } from '@/components/blueprint/BlueprintGeminiVoicePicker'
import { DirectorNoteBuilderDialog } from '@/components/tts/DirectorNoteBuilderDialog'
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { useBlueprintTtsContext } from '@/contexts/BlueprintTtsContext'
import { VOICE_DIRECTION_COPY } from '@/lib/blueprint/blueprintGlossary'
import { BlueprintListenButton } from '@/components/blueprint/BlueprintListenButton'

export interface BlueprintTtsControlsProps {
  getTextToSpeak: () => string
  playId?: string
  className?: string
}

export function BlueprintTtsControls({
  getTextToSpeak,
  playId = 'blueprint-tts',
  className,
}: BlueprintTtsControlsProps) {
  const t = useTranslations('blueprint.audio')
  const tts = useBlueprintTtsContext()
  const isActive = tts.loadingId === playId
  const isLoading =
    isActive &&
    tts.generationProgress != null &&
    tts.generationProgress.phase !== 'playing'

  return (
    <TooltipProvider>
      <div className={className ?? 'flex items-center gap-1'}>
        <BlueprintListenButton
          isPlaying={isActive && !isLoading}
          isLoading={isLoading}
          disabled={!tts.enabled || tts.voices.length === 0}
          onPlay={() => tts.playText(getTextToSpeak(), playId)}
          onStop={tts.stopAny}
        />

        <DropdownMenu open={tts.audioMenuOpen} onOpenChange={tts.setAudioMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={t('settings')}
              aria-expanded={tts.audioMenuOpen}
              className="h-8 w-8"
              size="icon"
              variant="outline"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-1 py-1.5 text-xs text-gray-400">{t('voice')}</div>
            {tts.enabled ? (
              <Button
                variant="outline"
                className="h-8 mx-1 w-[calc(100%-8px)] justify-between text-left font-normal"
                onClick={() => {
                  tts.setAudioMenuOpen(false)
                  tts.setVoiceDialogOpen(true)
                }}
              >
                <span className="truncate">{tts.selectedVoiceName || t('selectVoice')}</span>
                <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
              </Button>
            ) : (
              <div className="mx-2 my-1 text-xs text-amber-300">{t('notConfigured')}</div>
            )}
            <div className="px-1 pt-2 pb-1 text-xs text-gray-400">{VOICE_DIRECTION_COPY.sectionLabel}</div>
            <Button
              variant="outline"
              className="h-8 mx-1 w-[calc(100%-8px)] justify-start gap-2 text-left font-normal"
              onClick={() => {
                tts.setAudioMenuOpen(false)
                tts.setDirectorNotesDialogOpen(true)
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="truncate text-xs">
                {tts.directorNotes.trim() ? VOICE_DIRECTION_COPY.set : VOICE_DIRECTION_COPY.add}
              </span>
            </Button>
            <div className="px-1 pt-2 pb-1 text-xs text-gray-400">{t('language')}</div>
            <GroupedLanguageSelector
              value={tts.selectedLanguage}
              onValueChange={(code) => tts.setSelectedLanguage(code)}
              size="xs"
              intent="generate"
            />
          </DropdownMenuContent>
        </DropdownMenu>

        <BlueprintGeminiVoicePicker
          open={tts.voiceDialogOpen}
          onOpenChange={tts.setVoiceDialogOpen}
          selectedVoiceId={tts.selectedVoiceId}
          onSelectVoice={tts.selectVoice}
        />
        <DirectorNoteBuilderDialog
          isOpen={tts.directorNotesDialogOpen}
          onClose={() => tts.setDirectorNotesDialogOpen(false)}
          initialPrompt={tts.directorNotes}
          onSave={tts.saveDirectorNotes}
        />
      </div>
    </TooltipProvider>
  )
}

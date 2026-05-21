'use client'

import React from 'react'
import { Play, Square, ChevronDown, Sparkles } from 'lucide-react'
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
import { useBlueprintTts } from '@/hooks/useBlueprintTts'

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
  const tts = useBlueprintTts()

  return (
    <TooltipProvider>
      <div className={className ?? 'flex items-center gap-1'}>
        {tts.enabled && tts.voices.length > 0 ? (
          tts.loadingId === playId ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Stop playback"
                  title="Stop"
                  onClick={tts.stopAny}
                  className="h-8 w-8 border border-gray-700 text-gray-300 hover:bg-gray-800"
                  variant="outline"
                  size="icon"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Play narration"
                  title="Play"
                  onClick={() => tts.playText(getTextToSpeak(), playId)}
                  className="h-8 w-8 border border-gray-700 text-gray-300 hover:bg-gray-800"
                  variant="outline"
                  size="icon"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Play</TooltipContent>
            </Tooltip>
          )
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Audio preview unavailable"
                title="Audio preview unavailable"
                disabled
                className="h-8 w-8 border border-gray-800 text-gray-500"
                variant="outline"
                size="icon"
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Configure Google TTS (GOOGLE_API_KEY or Vertex) to enable audio previews
            </TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu open={tts.audioMenuOpen} onOpenChange={tts.setAudioMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Audio settings"
              aria-expanded={tts.audioMenuOpen}
              className="h-8 w-8"
              size="icon"
              variant="outline"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-1 py-1.5 text-xs text-gray-400">Voice</div>
            {tts.enabled ? (
              <Button
                variant="outline"
                className="h-8 mx-1 w-[calc(100%-8px)] justify-between text-left font-normal"
                onClick={() => {
                  tts.setAudioMenuOpen(false)
                  tts.setVoiceDialogOpen(true)
                }}
              >
                <span className="truncate">{tts.selectedVoiceName || 'Select voice...'}</span>
                <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
              </Button>
            ) : (
              <div className="mx-2 my-1 text-xs text-amber-300">Audio not configured</div>
            )}
            <div className="px-1 pt-2 pb-1 text-xs text-gray-400">Director&apos;s notes</div>
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
                {tts.directorNotes.trim() ? "Notes set" : 'Add director\'s notes'}
              </span>
            </Button>
            <div className="px-1 pt-2 pb-1 text-xs text-gray-400">Language</div>
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

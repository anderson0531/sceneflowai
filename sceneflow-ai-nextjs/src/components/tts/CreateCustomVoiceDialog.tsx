'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Wand2, Mic, Sparkles, Volume2, Shield } from 'lucide-react'
import { VoiceDesignPanel } from './VoiceDesignPanel'
import { VoiceClonePanel } from './VoiceClonePanel'
import { CharacterContext, ScreenplayContext } from '@/lib/voiceRecommendation'

interface CreateCustomVoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVoiceCreated?: (voiceId: string, voiceName: string) => void
  characterContext?: CharacterContext
  screenplayContext?: ScreenplayContext
}

export function CreateCustomVoiceDialog({
  open,
  onOpenChange,
  onVoiceCreated,
  characterContext,
  screenplayContext
}: CreateCustomVoiceDialogProps) {
  const [activeTab, setActiveTab] = useState<'design' | 'clone'>('design')

  const handleVoiceCreated = (voiceId: string, voiceName: string) => {
    onVoiceCreated?.(voiceId, voiceName)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle 
            className="flex items-center gap-1.5 font-medium text-gray-200"
            style={{ fontSize: '15px', lineHeight: '1.3' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Create Custom Voice
          </DialogTitle>
          <DialogDescription 
            className="text-gray-400"
            style={{ fontSize: '12px', lineHeight: '1.4' }}
          >
            Design a new AI voice or clone an existing voice from audio samples.
          </DialogDescription>
        </DialogHeader>

        {/* Guardrails Info Banner */}
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300">
          <Shield className="w-4 h-4 shrink-0" />
          <span>
            Voice cloning requires consent verification. Your custom voices are private and secure.
          </span>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'design' | 'clone')} 
          className="flex-1 flex flex-col overflow-hidden mt-3"
        >
          <TabsList className="shrink-0 h-8 bg-transparent border-b border-gray-700 rounded-none p-0 gap-6">
            <TabsTrigger 
              value="design" 
              className="font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 bg-transparent rounded-none px-0 pb-2"
              style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', minWidth: '140px' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Wand2 className="w-3 h-3 shrink-0" />
                AI Voice Design
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="clone" 
              className="font-medium text-gray-300 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 bg-transparent rounded-none px-0 pb-2"
              style={{ fontSize: '13px', textTransform: 'none', letterSpacing: 'normal', minWidth: '120px' }}
            >
              <span className="inline-flex items-center gap-1.5">
                <Mic className="w-3 h-3 shrink-0" />
                Clone Voice
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="flex-1 overflow-y-auto mt-4">
            <VoiceDesignPanel
              onVoiceCreated={handleVoiceCreated}
              characterContext={characterContext}
              screenplayContext={screenplayContext}
            />
          </TabsContent>

          <TabsContent value="clone" className="flex-1 overflow-y-auto mt-4">
            <VoiceClonePanel
              onVoiceCreated={handleVoiceCreated}
              characterName={characterContext?.name}
            />
          </TabsContent>
        </Tabs>

        {/* Footer with feature summary */}
        <div className="pt-3 border-t border-gray-700 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Wand2 className="w-3 h-3" />
              Design: Describe a voice, AI creates it
            </span>
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3" />
              Clone: Upload audio samples to clone
            </span>
          </div>
          <span className="flex items-center gap-1 text-blue-400">
            <Volume2 className="w-3 h-3" />
            Preview before saving
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

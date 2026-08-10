/**
 * DirectionDialog - Prompt Direction Review and Modification
 * 
 * A modal dialog that provides users with clear visibility into the current
 * prompt direction before video generation. Users can review the optimized
 * prompt and provide natural language instructions to modify it.
 * 
 * Features:
 * - Read-only display of current optimized prompt
 * - AI-powered prompt modification via natural language instructions
 * - Undo support for reverting changes
 * - Mode-specific context and tips
 */

'use client'

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Send,
  Undo2,
  CheckCircle,
  Lightbulb,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import type { VideoGenerationMethod } from './types'

interface DirectionDialogProps {
  isOpen: boolean
  onClose: () => void
  currentPrompt: string
  onPromptChange: (newPrompt: string) => void
  mode: string
  hasStartFrame: boolean
  hasEndFrame: boolean
}

// Map internal mode names to VideoGenerationMethod
const modeToMethod: Record<string, VideoGenerationMethod> = {
  'TEXT_TO_VIDEO': 'T2V',
  'IMAGE_TO_VIDEO': 'I2V',
  'FRAME_TO_VIDEO': 'FTV',
  'EXTEND': 'EXT',
  'REFERENCE_IMAGES': 'REF',
}

const MODE_KEYS = [
  'TEXT_TO_VIDEO',
  'IMAGE_TO_VIDEO',
  'FRAME_TO_VIDEO',
  'EXTEND',
  'REFERENCE_IMAGES',
] as const

type ModeKey = (typeof MODE_KEYS)[number]

function isModeKey(mode: string): mode is ModeKey {
  return (MODE_KEYS as readonly string[]).includes(mode)
}

export const DirectionDialog: React.FC<DirectionDialogProps> = ({
  isOpen,
  onClose,
  currentPrompt,
  onPromptChange,
  mode,
  hasStartFrame,
  hasEndFrame,
}) => {
  const t = useTranslations('production.direction.promptDirection')
  const tc = useTranslations('common.actions')
  const [instruction, setInstruction] = useState('')
  const [isModifying, setIsModifying] = useState(false)
  const [promptHistory, setPromptHistory] = useState<string[]>([])
  const [localPrompt, setLocalPrompt] = useState(currentPrompt)

  const modeKey: ModeKey = isModeKey(mode) ? mode : 'TEXT_TO_VIDEO'
  const modeDisplayName = t(`modes.${modeKey}`)
  const tips = (['tip1', 'tip2', 'tip3'] as const).map((key) => t(`tips.${modeKey}.${key}`))
  const examples = (['example1', 'example2', 'example3', 'example4'] as const).map((key) =>
    t(`examples.${modeKey}.${key}`)
  )

  // Sync local prompt when dialog opens with new prompt
  React.useEffect(() => {
    if (isOpen) {
      setLocalPrompt(currentPrompt)
      setPromptHistory([])
      setInstruction('')
    }
  }, [isOpen, currentPrompt])

  // Handle AI-assisted prompt modification
  const handleModifyPrompt = useCallback(async () => {
    if (!instruction.trim() || !localPrompt) return

    setIsModifying(true)
    
    // Save current prompt to history for undo
    setPromptHistory(prev => [...prev, localPrompt])

    try {
      const response = await fetch('/api/prompt/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt: localPrompt,
          instruction: instruction,
          mode: modeToMethod[mode],
          context: {
            hasStartFrame,
            hasEndFrame,
          }
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.modifiedPrompt) {
          setLocalPrompt(data.modifiedPrompt)
          setInstruction('') // Clear instruction after successful modification
        }
      } else {
        console.error('[DirectionDialog] Failed to modify prompt')
        // Revert history since modification failed
        setPromptHistory(prev => prev.slice(0, -1))
      }
    } catch (error) {
      console.error('[DirectionDialog] Error modifying prompt:', error)
      // Revert history since modification failed
      setPromptHistory(prev => prev.slice(0, -1))
    } finally {
      setIsModifying(false)
    }
  }, [instruction, localPrompt, mode, hasStartFrame, hasEndFrame])

  // Undo last modification
  const handleUndo = useCallback(() => {
    if (promptHistory.length === 0) return
    
    const previousPrompt = promptHistory[promptHistory.length - 1]
    setPromptHistory(prev => prev.slice(0, -1))
    setLocalPrompt(previousPrompt)
  }, [promptHistory])

  // Apply changes and close
  const handleApply = useCallback(() => {
    onPromptChange(localPrompt)
    onClose()
  }, [localPrompt, onPromptChange, onClose])

  // Use example instruction
  const handleUseExample = useCallback((example: string) => {
    setInstruction(example)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 text-white border-slate-700">
        
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          
          {/* Mode Badge */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`
                ${mode === 'FRAME_TO_VIDEO' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : ''}
                ${mode === 'IMAGE_TO_VIDEO' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : ''}
                ${mode === 'TEXT_TO_VIDEO' ? 'bg-green-500/20 text-green-300 border-green-500/50' : ''}
                ${mode === 'EXTEND' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : ''}
                ${mode === 'REFERENCE_IMAGES' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : ''}
              `}
            >
              {t('modeSuffix', { mode: modeDisplayName })}
            </Badge>
            <span className="text-xs text-slate-500">
              {t('optimizedForMethod')}
            </span>
          </div>

          {/* Current Prompt Display */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300 font-medium">{t('currentDirection')}</Label>
              {promptHistory.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                >
                  <Undo2 className="w-3 h-3 mr-1" />
                  {t('undo', { count: promptHistory.length })}
                </Button>
              )}
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 max-h-[200px] overflow-y-auto">
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {localPrompt || <span className="text-slate-500 italic">{t('noPrompt')}</span>}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{t('characters', { count: localPrompt.length })}</span>
              {promptHistory.length > 0 && (
                <span className="text-indigo-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t('modified')}
                </span>
              )}
            </div>
          </div>

          {/* Mode-specific Tips */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400 font-medium">{t('tipsFor', { mode: modeDisplayName })}</span>
            </div>
            <ul className="space-y-1">
              {tips.map((tip, index) => (
                <li key={index} className="text-xs text-slate-400 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 mt-0.5 text-slate-500 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instruction Input */}
          <div className="flex flex-col gap-2">
            <Label className="text-slate-300">{t('refineDirection')}</Label>
            <p className="text-xs text-slate-500">
              {t('refineHint')}
            </p>
            <div className="flex gap-2">
              <Input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleModifyPrompt()
                  }
                }}
                placeholder={t('refinePlaceholder')}
                className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 text-sm"
                disabled={isModifying}
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleModifyPrompt}
                disabled={!instruction.trim() || isModifying}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4"
              >
                {isModifying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Example Instructions */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleUseExample(example)}
                  className="text-xs px-2 py-1 bg-slate-800/60 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-700/50">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              {tc('cancel')}
            </Button>
            <Button 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleApply}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('applyDirection')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DirectionDialog

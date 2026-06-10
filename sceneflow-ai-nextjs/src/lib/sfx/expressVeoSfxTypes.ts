import type { VeoSfxClipDuration } from '@/lib/sfx/veoSfxDuration'
import type { VeoSfxPromptMode } from '@/lib/sfx/veoSfx'

export interface ExpressVeoSfxItem {
  beatId: string
  sfxIndex: number
  sfxId: string
  text: string
  promptMode: VeoSfxPromptMode
}

export interface ExpressVeoSfxSkippedItem {
  beatId: string
  reason: string
}

export interface ResolveExpressVeoSfxResult {
  items: ExpressVeoSfxItem[]
  skipped: ExpressVeoSfxSkippedItem[]
  errors: string[]
}

export interface ExpressVeoSfxOptions {
  projectId: string
  sceneIndex: number
  beatIds: string[]
  clipDurationSeconds: VeoSfxClipDuration
  regenerate?: boolean
  userId: string
}

export interface ExpressVeoSfxAttribution {
  source: 'veo'
  clipDurationSeconds: number
  veoQuality: 'fast'
  promptMode: 'actionBeat'
}

export type ExpressVeoSfxEvent =
  | { type: 'start'; sceneIndex: number; total: number; skipped: number }
  | { type: 'item-start'; beatId: string; sfxIndex: number }
  | {
      type: 'item-done'
      beatId: string
      sfxIndex: number
      url: string
      gcsPath: string
      attribution: ExpressVeoSfxAttribution
    }
  | { type: 'item-error'; beatId: string; sfxIndex?: number; error: string }
  | { type: 'throttle'; max: number; cooldownMs: number }
  | { type: 'complete'; success: number; failed: number; skipped: number }
  | { type: 'error'; error: string }

export interface ExpressVeoSfxRunResult {
  success: number
  failed: number
  skipped: number
}

export type ExpressVeoSfxEmit = (event: ExpressVeoSfxEvent) => void

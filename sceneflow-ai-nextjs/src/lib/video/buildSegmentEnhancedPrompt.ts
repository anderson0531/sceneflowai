/**
 * Assembles the full text prompt sent to Vertex/Omni for segment video generation.
 * Shared by generateSegmentVideoCore and preview-api-prompt.
 */

import { buildOmniVideoReferencePrompt } from '@/lib/gemini/buildOmniVideoReferencePrompt'
import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'
import {
  cleanOmniRefScenePrompt,
  sanitizeOmniRefGuide,
} from '@/lib/gemini/cleanOmniRefPrompt'
import { veoRefsToPrioritized } from '@/lib/video/normalizeReferenceImages'
import { appendFtvTransitionStabilityTokens } from '@/lib/vision/ftvTransitionStability'
import {
  FTV_MINIMAL_NATIVE_AUDIO_HINT,
  narrowPromptForFtvFrameLock,
  neutralizeFtvGuidePrompt,
  extractSpeaksQuotedPerformCue,
  normalizeVeoSuspiciousPunctuation,
} from '@/lib/vision/ftvPromptNormalize'
import type { VideoGenerationMethod } from '@/lib/vision/intelligentMethodSelection'

export type SegmentReferenceImage = {
  url: string
  type: 'style' | 'character'
  name?: string
  role?: string
}

export interface BuildSegmentEnhancedPromptInput {
  prompt: string
  guidePrompt?: string
  method: VideoGenerationMethod
  referenceImages?: SegmentReferenceImage[]
  segmentIndex?: number
  audioContext?: {
    hasNarration?: boolean
    narrationText?: string
    emotionalTone?: string
    dialogueBeat?: string
    suggestedAtmosphere?: string
  }
}

export interface BuildSegmentEnhancedPromptResult {
  enhancedPrompt: string
  /** Plain T2V prompt without reference preamble — used when REF is downgraded after policy blocks */
  referenceFallbackPrompt?: string
}

export function buildSegmentEnhancedPrompt(
  input: BuildSegmentEnhancedPromptInput
): BuildSegmentEnhancedPromptResult {
  const {
    prompt,
    guidePrompt,
    method,
    referenceImages,
    segmentIndex = 0,
    audioContext,
  } = input

  let referenceFallbackPrompt: string | undefined

  if (method === 'REF' && referenceImages && referenceImages.length > 0) {
    const neutralScenePrompt = neutralizeReferenceConflictPrompt(
      cleanOmniRefScenePrompt(prompt)
    )
    const refGuidePrompt = sanitizeOmniRefGuide(guidePrompt)
    referenceFallbackPrompt = buildOmniVideoReferencePrompt({
      scenePrompt: neutralScenePrompt,
      refs: [],
      guidePrompt: refGuidePrompt,
    })
  }

  let enhancedPrompt =
    method === 'FTV'
      ? extractSpeaksQuotedPerformCue(prompt) ?? narrowPromptForFtvFrameLock(prompt)
      : prompt
  if (method === 'FTV' && !enhancedPrompt.trim()) {
    enhancedPrompt = 'Natural motion and expression between the two keyframes.'
  }

  if (method === 'REF' && referenceImages && referenceImages.length > 0) {
    const prioritized = veoRefsToPrioritized(referenceImages)
    const neutralScenePrompt = neutralizeReferenceConflictPrompt(
      cleanOmniRefScenePrompt(prompt)
    )
    const refGuidePrompt = sanitizeOmniRefGuide(guidePrompt)
    enhancedPrompt = buildOmniVideoReferencePrompt({
      scenePrompt: neutralScenePrompt,
      refs: prioritized,
      guidePrompt: refGuidePrompt,
    })
  } else if (guidePrompt?.trim()) {
    const gpRaw = guidePrompt.trim()
    const gp = method === 'FTV' ? neutralizeFtvGuidePrompt(gpRaw) : gpRaw
    if (gp) {
      enhancedPrompt = enhancedPrompt.trim() ? `${enhancedPrompt.trim()}\n\n${gp}` : gp
      if (method === 'FTV') {
        enhancedPrompt += `\n\n${FTV_MINIMAL_NATIVE_AUDIO_HINT}`
      } else {
        enhancedPrompt +=
          '\n\nInclude native synchronized audio (dialogue, ambience, and music) matching the descriptions above unless the scene should be silent.'
      }
    }
  }

  if (audioContext && method !== 'FTV') {
    const atmosphericGuidance: string[] = []
    if (audioContext.emotionalTone) {
      atmosphericGuidance.push(`Emotional atmosphere: ${audioContext.emotionalTone}`)
    }
    if (audioContext.suggestedAtmosphere) {
      atmosphericGuidance.push(`Visual mood: ${audioContext.suggestedAtmosphere}`)
    }
    if (audioContext.hasNarration && audioContext.narrationText) {
      atmosphericGuidance.push(
        `Scene accompanies narration about: ${audioContext.narrationText.slice(0, 100)}...`
      )
    }
    if (audioContext.dialogueBeat) {
      atmosphericGuidance.push(`Dialogue moment: ${audioContext.dialogueBeat}`)
    }
    if (atmosphericGuidance.length > 0) {
      const atmosphericText = `[Audio-Visual Sync Context]\n${atmosphericGuidance.join('\n')}`
      enhancedPrompt = `${enhancedPrompt}\n\n${atmosphericText}`
    }
  }

  enhancedPrompt = appendFtvTransitionStabilityTokens(
    method === 'FTV' ? normalizeVeoSuspiciousPunctuation(enhancedPrompt) : enhancedPrompt,
    method,
    segmentIndex
  )

  return { enhancedPrompt, referenceFallbackPrompt }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateText } from '@/lib/vertexai/gemini'
import { getGeminiTextModel } from '@/lib/config/modelConfig'
import {
  buildDeterministicShotInvestigation,
  type ShotErrorInvestigationInput,
  type ShotErrorInvestigationResult,
  type ShotErrorResolution,
} from '@/lib/errors/shotErrorInvestigator'

export const maxDuration = 30

interface AiInvestigationPatch {
  summary?: string
  likenessRiskDetected?: boolean
  flaggedReferenceName?: string
  recommendCreativeKlingF2V?: boolean
  revisedPrompt?: string
  reason?: string
}

function parseJsonSafe(raw: string): AiInvestigationPatch | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()
    return JSON.parse(cleaned) as AiInvestigationPatch
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = (await req.json()) as ShotErrorInvestigationInput
    const base = buildDeterministicShotInvestigation(body)

    // Skip LLM micro-pass for clear transient 429s or missing prerequisites
    if (
      base.diagnosedCause === 'rate_limit_429' ||
      base.diagnosedCause === 'missing_prerequisite' ||
      !body.prompt?.trim()
    ) {
      return NextResponse.json(base)
    }

    try {
      const refSummary = (body.referenceImages || [])
        .slice(0, 6)
        .map((r, i) => `Ref ${i + 1}: role=${r.role || 'unknown'}, name=${r.name || 'unnamed'}`)
        .join('\n')

      const systemInstruction = `You are SceneFlow's Self-Healing Production Diagnostics AI.
Analyze a failed ${body.mediaType} generation prompt and provider error to identify why it failed and provide a concrete one-click resolution.
Check specifically for:
1. Celebrity/public-figure name or Hollywood movie-star likeness triggers (Google Prominent People RAI false positives).
2. Physical action/violence/weapon intensity that Google Veo/Omni blocks but Creative (Kling AI F2V) can render.
3. Internal prompt contradictions (e.g., opening an already-open object, conflicting props/lighting).
Return ONLY valid JSON:
{
  "summary": "1-sentence plain-English diagnosis",
  "likenessRiskDetected": boolean,
  "flaggedReferenceName": "character/ref name if applicable or empty string",
  "recommendCreativeKlingF2V": boolean,
  "reason": "why the fix works",
  "revisedPrompt": "clean, concise, policy-safe and physics-consistent rewritten prompt preserving the exact creative intent"
}`

      const prompt = [
        `Media type: ${body.mediaType}`,
        `Provider: ${body.provider || 'vertex'} | Method: ${body.generationMethod || 'default'}`,
        `Error: ${(body.rawError || body.technicalDetails || '').slice(0, 500)}`,
        body.vertexRaiDetails ? `RAI details: ${body.vertexRaiDetails.slice(0, 400)}` : '',
        refSummary ? `Attached references:\n${refSummary}` : '',
        `Prompt:\n${body.prompt.slice(0, 1400)}`,
      ]
        .filter(Boolean)
        .join('\n\n')

      const aiRes = await generateText(prompt, {
        model: getGeminiTextModel(),
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 700,
        responseMimeType: 'application/json',
        timeoutMs: 6500,
        maxRetries: 0,
      })

      const parsed = parseJsonSafe(aiRes?.text || '')
      if (parsed) {
        const mergedResolutions: ShotErrorResolution[] = [...base.resolutions]

        if (
          parsed.recommendCreativeKlingF2V &&
          body.mediaType === 'clip' &&
          !mergedResolutions.some((r) => r.actionType === 'switch_creative_kling_f2v')
        ) {
          mergedResolutions.unshift({
            id: 'ai-switch-creative-kling',
            rootCause: 'action_intensity_for_veo',
            confidence: 'high',
            title: 'Switch to Creative (Kling AI F2V)',
            reason:
              parsed.reason ||
              'Action/intensity or likeness sensitivity exceeded Google Veo/Omni policy limits.',
            fixDescription:
              'Render this shot using Creative (Kling AI F2V) anchored to your Start Frame.',
            recommended: true,
            actionType: 'switch_creative_kling_f2v',
            ctaLabel: 'Switch to Creative (Kling AI F2V)',
            patch: { targetMode: 'creative', targetSourceMethod: 'frame' },
          })
        }

        if (parsed.revisedPrompt?.trim() && parsed.revisedPrompt.trim() !== body.prompt.trim()) {
          const existingIdx = mergedResolutions.findIndex(
            (r) =>
              r.actionType === 'apply_sanitized_prompt_and_retry' ||
              r.actionType === 'mitigate_likeness_and_retry'
          )
          const aiPromptFix: ShotErrorResolution = {
            id: 'ai-revised-prompt',
            rootCause: parsed.likenessRiskDetected
              ? 'celebrity_likeness_ref'
              : base.diagnosedCause,
            confidence: 'high',
            title: 'Apply AI-Repaired Prompt & Retry',
            reason: parsed.reason || parsed.summary || 'Rewrote prompt to remove policy triggers and contradictions.',
            fixDescription: 'Updates this shot prompt with the repaired wording and retries immediately.',
            recommended: !mergedResolutions.some((r) => r.recommended),
            actionType: 'apply_sanitized_prompt_and_retry',
            ctaLabel: 'Apply Fix & Retry',
            patch: {
              revisedPrompt: parsed.revisedPrompt.trim(),
              ...(parsed.flaggedReferenceName?.trim()
                ? { flaggedReferenceName: parsed.flaggedReferenceName.trim() }
                : {}),
            },
          }
          if (existingIdx >= 0) {
            mergedResolutions[existingIdx] = aiPromptFix
          } else {
            mergedResolutions.unshift(aiPromptFix)
          }
        }

        const enriched: ShotErrorInvestigationResult = {
          diagnosedCause: parsed.likenessRiskDetected
            ? 'celebrity_likeness_ref'
            : parsed.recommendCreativeKlingF2V
              ? 'action_intensity_for_veo'
              : base.diagnosedCause,
          summary: parsed.summary?.trim() || base.summary,
          resolutions: mergedResolutions.slice(0, 4),
          evaluatedBy: 'multimodal_ai',
        }
        return NextResponse.json(enriched)
      }
    } catch (aiErr) {
      console.warn('[investigate-shot-error] Falling back to deterministic diagnosis:', aiErr)
    }

    return NextResponse.json(base)
  } catch (err) {
    console.error('[investigate-shot-error] Error:', err)
    return NextResponse.json(
      { error: 'Failed to investigate generation error' },
      { status: 500 }
    )
  }
}

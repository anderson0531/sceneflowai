import { describe, expect, it } from 'vitest'
import {
  hasCompleteSceneImageComposition,
  unwrapSceneImageAiPrompt,
} from '@/lib/intelligence/scene-image-intelligence'
import { resolveDialogueBeat } from '@/lib/script/beatMigration'
import { readFileSync } from 'fs'
import path from 'path'

describe('unwrapSceneImageAiPrompt', () => {
  it('extracts inner prompt from clean JSON', () => {
    const wrapped = JSON.stringify({
      prompt: '[GLOBAL STYLE ANCHOR]\nMaster Style: Photorealistic',
      reasoning: 'test',
    })
    const unwrapped = unwrapSceneImageAiPrompt(wrapped)
    expect(unwrapped).toBe('[GLOBAL STYLE ANCHOR]\nMaster Style: Photorealistic')
  })

  it('recovers prompt from truncated JSON with escaped newlines', () => {
    const truncated =
      '{ "prompt": "[GLOBAL STYLE ANCHOR]\\nMaster Style: Photorealistic cinematic still\\n\\n[SCENE COMPOSITION & BEAT]\\nAction/Framing: Medium shot. person [1] clutches a file.", "reasoning": "trunc'
    const unwrapped = unwrapSceneImageAiPrompt(truncated)
    expect(unwrapped).toContain('[GLOBAL STYLE ANCHOR]')
    expect(unwrapped).toContain('\nMaster Style: Photorealistic cinematic still')
    expect(unwrapped).toContain('person [1] clutches a file.')
    expect(unwrapped).not.toMatch(/^\s*\{/)
  })

  it('returns empty when prompt cannot be recovered', () => {
    expect(unwrapSceneImageAiPrompt('{ "reasoning": "no prompt field" }')).toBe('')
    expect(unwrapSceneImageAiPrompt('')).toBe('')
  })

  it('passes through already-clean structured prompts', () => {
    const clean = '[GLOBAL STYLE ANCHOR]\nMaster Style: Cinematic'
    expect(unwrapSceneImageAiPrompt(clean)).toBe(clean)
  })
})

describe('hasCompleteSceneImageComposition', () => {
  it('rejects style-anchor-only stubs from truncated JSON recovery', () => {
    const stub =
      '[GLOBAL STYLE ANCHOR]\nMaster Style: photorealistic, cinematic still\nLighting & Camera: Low-Key and Hard & Dramatic lighting, Stylized split: Warm (Tungsten 3200K) environment vs. Deep'
    expect(hasCompleteSceneImageComposition(stub)).toBe(false)
  })

  it('accepts prompts with composition section and Action/Framing', () => {
    const complete = `[GLOBAL STYLE ANCHOR]
Master Style: photorealistic
Lighting & Camera: low-key

[SCENE COMPOSITION & BEAT]
Action/Framing: Medium close-up. person [1] leans into the vault glow, eyes on the core.

[EXCLUSIONS & BOUNDARIES]
Strictly Avoid: mannequin geometry`
    expect(hasCompleteSceneImageComposition(complete)).toBe(true)
  })
})

describe('resolveDialogueBeat', () => {
  it('resolves by lineId and returns actionDescription for beat-primary dialogue frames', () => {
    const scene = {
      dialogue: [
        { lineId: 'line-a', character: 'Piper Hayes', line: 'Stay back.' },
        { lineId: 'line-b', character: 'Piper Hayes', line: 'We open it now.' },
      ],
      beats: [
        {
          beatId: 'b0',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Wide vault establishing.',
        },
        {
          beatId: 'b1',
          sequenceIndex: 1,
          kind: 'dialogue',
          lineId: 'line-a',
          character: 'Piper Hayes',
          line: 'Stay back.',
          actionDescription: 'Piper braces against the iron gate, lantern raised.',
        },
        {
          beatId: 'b2',
          sequenceIndex: 2,
          kind: 'dialogue',
          lineId: 'line-b',
          character: 'Piper Hayes',
          line: 'We open it now.',
          actionDescription:
            'Tight MCU: Piper grips the vault wheel as indigo light washes her face.',
        },
      ],
    }

    const resolved = resolveDialogueBeat(scene, 1)
    expect(resolved).not.toBeNull()
    expect(resolved!.beatIndex).toBe(2)
    expect(resolved!.beat.actionDescription).toContain('vault wheel')
  })

  it('falls back to spoken order when lineIds are absent', () => {
    const scene = {
      dialogue: [
        { character: 'Piper', line: 'One.' },
        { character: 'Piper', line: 'Two.' },
      ],
      beats: [
        {
          beatId: 'a',
          sequenceIndex: 0,
          kind: 'action',
          actionDescription: 'Establishing.',
        },
        {
          beatId: 'd0',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'Piper',
          line: 'One.',
          actionDescription: 'First spoken beat action.',
        },
        {
          beatId: 'd1',
          sequenceIndex: 2,
          kind: 'dialogue',
          character: 'Piper',
          line: 'Two.',
          actionDescription: 'Second spoken beat action.',
        },
      ],
    }

    const resolved = resolveDialogueBeat(scene, 0)
    expect(resolved?.beat.actionDescription).toBe('First spoken beat action.')
    expect(resolveDialogueBeat(scene, 1)?.beat.actionDescription).toBe(
      'Second spoken beat action.'
    )
  })
})

describe('generate-image dialogue beat-primary wiring', () => {
  const route = readFileSync(
    path.join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
    'utf8'
  )

  it('resolves dialogue beats and logs beat-primary context', () => {
    expect(route).toContain('resolveDialogueBeat')
    expect(route).toContain(
      "[Scene Image] Using beat-primary context for dialogue frame"
    )
  })

  it('merges script action when enhanced Scene Direction is primary', () => {
    expect(route).toContain('Using enhanced Scene Direction as base context')
    expect(route).toMatch(/fullSceneContext = `\$\{fullSceneContext\}\\n\\n\$\{extraTrimmed\}`/)
  })

  it('passes dialogue-resolved beatAction into intelligence request', () => {
    expect(route).toContain('dialogueResolvedBeat')
    expect(route).toContain('intelligenceBeatIndex')
  })
})

describe('scene-image-intelligence rejects incomplete recovered prompts', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src/lib/intelligence/scene-image-intelligence.ts'),
    'utf8'
  )

  it('gates on hasCompleteSceneImageComposition after recovery', () => {
    expect(source).toContain('hasCompleteSceneImageComposition')
    expect(source).toContain(
      'Recovered prompt missing composition section — falling back'
    )
  })
})

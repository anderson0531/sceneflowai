import { describe, expect, it } from 'vitest'
import {
  REWRITE_TOKENS_BASE,
  REWRITE_TOKENS_REASONING,
  REWRITE_TOKENS_WITH_BEATS,
  tokensForRewriteStep,
} from '@/lib/treatment/runGuidedRevise'
import { capPatchSize } from '@/lib/treatment/blueprintRevisionDiff'
import { MAX_BEATS } from '@/lib/treatment/blueprintRevisionTypes'
import { checkBeatsPatch } from '@/lib/treatment/blueprintRevisionValidate'
import { resolveLoadedBlueprintVariants } from '@/lib/blueprint/resolveLoadedVariants'

function beat(i: number, overrides: Record<string, unknown> = {}) {
  return {
    title: `Beat ${i}`,
    intent: 'Advance the story',
    synopsis: `Something happens in beat ${i}.`,
    minutes: 2.5,
    ...overrides,
  }
}

describe('tokensForRewriteStep', () => {
  it('gives beats-emitting sections the larger budget', () => {
    for (const section of ['beats', 'story', 'characters'] as const) {
      expect(tokensForRewriteStep([section], false)).toBe(REWRITE_TOKENS_WITH_BEATS)
    }
  })

  it('uses the base budget for sections that do not emit beats', () => {
    expect(tokensForRewriteStep(['core'], false)).toBe(REWRITE_TOKENS_BASE)
    expect(tokensForRewriteStep(['tone'], false)).toBe(REWRITE_TOKENS_BASE)
  })

  it('adds the reasoning allowance on the final pass', () => {
    expect(tokensForRewriteStep(['beats'], true)).toBe(
      REWRITE_TOKENS_WITH_BEATS + REWRITE_TOKENS_REASONING
    )
    expect(tokensForRewriteStep(['core'], true)).toBe(
      REWRITE_TOKENS_BASE + REWRITE_TOKENS_REASONING
    )
  })

  it('exceeds the former 2048 cap that truncated beat sheets', () => {
    expect(tokensForRewriteStep(['beats'], true)).toBeGreaterThan(2048)
  })
})

describe('capPatchSize beats ceiling', () => {
  it('keeps well beyond the former 8-beat limit', () => {
    const patch = { beats: Array.from({ length: 16 }, (_, i) => beat(i + 1)) }
    expect((capPatchSize(patch).beats as unknown[]).length).toBe(16)
  })

  it('still enforces MAX_BEATS', () => {
    const patch = { beats: Array.from({ length: MAX_BEATS + 5 }, (_, i) => beat(i + 1)) }
    expect((capPatchSize(patch).beats as unknown[]).length).toBe(MAX_BEATS)
  })
})

describe('checkBeatsPatch', () => {
  it('accepts a patch with no beats field', () => {
    expect(checkBeatsPatch({ logline: 'x' }).ok).toBe(true)
  })

  it('accepts a complete beat sheet', () => {
    expect(checkBeatsPatch({ beats: [beat(1), beat(2)] }).ok).toBe(true)
  })

  it('rejects an empty beats array', () => {
    const result = checkBeatsPatch({ beats: [] })
    expect(result.ok).toBe(false)
    expect(result.issue).toBe('empty')
  })

  it('rejects the truncation signature of a title with no synopsis', () => {
    const result = checkBeatsPatch({
      beats: [{ title: "Intro & Objectives: The Archivist's Invitation" }],
    })
    expect(result.ok).toBe(false)
    expect(result.issue).toBe('missing_synopsis')
  })

  it('rejects a partially truncated sheet', () => {
    const result = checkBeatsPatch({ beats: [beat(1), beat(2), { title: 'Cut off here' }] })
    expect(result.ok).toBe(false)
    expect(result.issue).toBe('missing_synopsis')
  })
})

describe('resolveLoadedBlueprintVariants', () => {
  it('REGRESSION: prefers the saved working copy over a stale approved snapshot', () => {
    const resolved = resolveLoadedBlueprintVariants({
      filmTreatmentVariant: { id: 'A', synopsis: 'stale', beats: [beat(1)] },
      treatmentVariants: [{ id: 'A', synopsis: 'revised', beats: [beat(1), beat(2), beat(3)] }],
    })

    expect(resolved.source).toBe('treatmentVariants')
    expect(resolved.treatmentText).toBe('revised')
    expect((resolved.variants[0].beats as unknown[]).length).toBe(3)
  })

  it('falls back to filmTreatmentVariant when no working copy exists', () => {
    const resolved = resolveLoadedBlueprintVariants({
      filmTreatmentVariant: { id: 'A', synopsis: 'approved' },
    })
    expect(resolved.source).toBe('filmTreatmentVariant')
    expect(resolved.variants[0].id).toBe('A')
  })

  it('defaults an id when the approved snapshot has none', () => {
    const resolved = resolveLoadedBlueprintVariants({ approvedTreatment: { synopsis: 'x' } })
    expect(resolved.source).toBe('approvedTreatment')
    expect(resolved.variants[0].id).toBe('approved-treatment')
  })

  it('falls back to the legacy filmTreatment string', () => {
    const resolved = resolveLoadedBlueprintVariants({ filmTreatment: 'legacy body' }, 'My Film')
    expect(resolved.source).toBe('filmTreatment')
    expect(resolved.variants[0].label).toBe('My Film')
    expect(resolved.treatmentText).toBe('legacy body')
  })

  it('ignores an empty treatmentVariants array', () => {
    const resolved = resolveLoadedBlueprintVariants({
      treatmentVariants: [],
      filmTreatmentVariant: { id: 'A' },
    })
    expect(resolved.source).toBe('filmTreatmentVariant')
  })

  it('reports none for empty metadata', () => {
    expect(resolveLoadedBlueprintVariants({}).source).toBe('none')
    expect(resolveLoadedBlueprintVariants(null).source).toBe('none')
  })
})

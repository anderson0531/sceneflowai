import { describe, expect, it } from 'vitest'
import {
  stripHeavyFieldsFromVariant,
  reattachPreservedAssets,
} from '@/lib/treatment/blueprintVariantSanitize'
import {
  inferPlanFromRecommendations,
  inferPlanFromFocus,
} from '@/lib/treatment/blueprintRevisionPrompts'
import type { BlueprintAudienceRecommendation } from '@/lib/types/audienceResonance'

const BASE64_IMAGE = 'data:image/png;base64,' + 'A'.repeat(5000)

describe('stripHeavyFieldsFromVariant', () => {
  it('removes base64 referenceImage from character_descriptions', () => {
    const { variant, preservedCharacterAssets } = stripHeavyFieldsFromVariant({
      title: 'Test Film',
      synopsis: 'A short synopsis.',
      character_descriptions: [
        {
          id: 'char-1',
          name: 'Elara',
          role: 'protagonist',
          description: 'A detective.',
          referenceImage: BASE64_IMAGE,
          imagePrompt: BASE64_IMAGE,
        },
      ],
    })

    const chars = variant.character_descriptions as Array<Record<string, unknown>>
    expect(chars[0].referenceImage).toBeUndefined()
    expect(chars[0].imagePrompt).toBeUndefined()
    expect(chars[0].name).toBe('Elara')
    expect(preservedCharacterAssets['char-1']?.referenceImage).toBe(BASE64_IMAGE)
  })

  it('preserves http image URLs on characters', () => {
    const url = 'https://storage.googleapis.com/bucket/elara.png'
    const { variant, preservedCharacterAssets } = stripHeavyFieldsFromVariant({
      character_descriptions: [
        {
          name: 'Elara',
          referenceImage: url,
        },
      ],
    })

    const chars = variant.character_descriptions as Array<Record<string, unknown>>
    expect(chars[0].referenceImage).toBe(url)
    expect(preservedCharacterAssets.Elara?.referenceImage).toBe(url)
  })

  it('deduplicates content when identical to synopsis', () => {
    const text = 'Same text for both fields.'
    const { variant } = stripHeavyFieldsFromVariant({
      content: text,
      synopsis: text,
      title: 'T',
    })
    expect(variant.synopsis).toBe(text)
    expect(variant.content).toBeUndefined()
  })

  it('round-trips preserved assets after merge', () => {
    const { variant, preservedCharacterAssets } = stripHeavyFieldsFromVariant({
      title: 'Test',
      character_descriptions: [
        { id: 'c1', name: 'Hero', referenceImage: BASE64_IMAGE },
      ],
    })

    const merged = {
      ...variant,
      synopsis: 'Updated synopsis.',
      character_descriptions: [
        { id: 'c1', name: 'Hero', description: 'Updated hero.' },
      ],
    }

    const restored = reattachPreservedAssets(merged, preservedCharacterAssets)
    const chars = restored.character_descriptions as Array<Record<string, unknown>>
    expect(chars[0].referenceImage).toBe(BASE64_IMAGE)
    expect(restored.synopsis).toBe('Updated synopsis.')
  })
})

describe('inferPlanFromRecommendations', () => {
  const rec = (
    fixSection: BlueprintAudienceRecommendation['fixSection'],
    id = 'r1'
  ): BlueprintAudienceRecommendation => ({
    id,
    text: 'Improve pacing',
    fixSection,
    pointsDeducted: 5,
    priority: 'medium',
    category: 'pacing',
    title: 'Fix pacing',
  })

  it('returns null when no recommendations', () => {
    expect(inferPlanFromRecommendations([], 'intent')).toBeNull()
  })

  it('infers plan from single fixSection via inferPlanFromFocus', () => {
    const plan = inferPlanFromRecommendations([rec('story')], 'Tighten act two')
    const focusPlan = inferPlanFromFocus('story', 'Tighten act two')
    expect(plan?.sectionsToUpdate).toEqual(focusPlan?.sectionsToUpdate)
    expect(plan?.primaryGoal).toContain('Tighten act two')
  })

  it('combines sections when recommendations span multiple fixSections', () => {
    const plan = inferPlanFromRecommendations(
      [rec('story', 'r1'), rec('characters', 'r2')],
      'Balance story and cast'
    )
    expect(plan?.sectionsToUpdate).toContain('story')
    expect(plan?.sectionsToUpdate).toContain('characters')
    expect(plan?.sectionsToUpdate).toContain('beats')
  })
})

describe('readJsonSafe', () => {
  it('parses JSON responses', async () => {
    const { readJsonSafe } = await import('@/lib/readJsonSafe')
    const res = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await readJsonSafe(res)
    expect(data.success).toBe(true)
  })

  it('returns friendly message for HTML error pages', async () => {
    const { readJsonSafe } = await import('@/lib/readJsonSafe')
    const res = new Response('<!DOCTYPE html><html>error</html>', {
      status: 503,
    })
    const data = await readJsonSafe(res)
    expect(String(data.message)).toContain('narrower focus')
  })
})

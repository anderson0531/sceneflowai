import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  applyPolicyComplianceToPrompt,
  buildReferenceStillDirectorSystemPrompt,
  buildReferenceStillDirectorUserPrompt,
  ensureReferenceKindAnchor,
  fallbackReferenceStillPrompt,
  overlayUserDirectionOnPrompt,
  parseReferenceStillDirectorResponse,
  preferredStoredOrBuiltPrompt,
  seedCastDirectorPrompt,
  seedLocationDirectorPrompt,
  seedObjectDirectorPrompt,
} from '@/lib/intelligence/reference-still-director-fallback'
import { CHARACTER_IDENTITY_REFERENCE_ANCHOR } from '@/lib/character/characterReferencePrompts'
import { LOCATION_TURNAROUND_GENERATION_INSTRUCTION } from '@/lib/vision/locationReferencePrompts'
import { OBJECT_REFERENCE_PURPOSE } from '@/lib/vision/objectReferencePrompts'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('reference still director prompts', () => {
  it('overlay appends notes and skips duplicates', () => {
    expect(overlayUserDirectionOnPrompt('Headshot of Mara.', 'studio gray')).toContain(
      'studio gray'
    )
    expect(overlayUserDirectionOnPrompt('studio gray backdrop', 'studio gray')).toBe(
      'studio gray backdrop'
    )
  })

  it('parse accepts { prompt } JSON and raw strings', () => {
    expect(parseReferenceStillDirectorResponse({ prompt: '  Plate A  ' })).toBe('Plate A')
    expect(parseReferenceStillDirectorResponse('Plate B')).toBe('Plate B')
    expect(parseReferenceStillDirectorResponse({})).toBeUndefined()
  })

  it('kind anchors are restored when Gemini drops them', () => {
    expect(ensureReferenceKindAnchor('cast', 'Mara, late 40s')).toContain(
      CHARACTER_IDENTITY_REFERENCE_ANCHOR
    )
    expect(ensureReferenceKindAnchor('location', 'A warehouse at dusk')).toContain(
      LOCATION_TURNAROUND_GENERATION_INSTRUCTION
    )
    expect(ensureReferenceKindAnchor('object', 'brass lantern')).toContain(OBJECT_REFERENCE_PURPOSE)
  })

  it('optimize vs rewrite user prompts differ and safety is folded in', () => {
    const optimize = buildReferenceStillDirectorUserPrompt({
      kind: 'cast',
      mode: 'optimize',
      currentPrompt: 'Headshot of Mara',
    })
    const rewrite = buildReferenceStillDirectorUserPrompt({
      kind: 'cast',
      mode: 'rewrite',
      currentPrompt: 'Headshot of Mara',
      userDirection: 'Tighter crop',
      policyCompliance: true,
    })
    expect(optimize).toContain('Optimize the generation prompt')
    expect(rewrite).toContain('Honor USER NOTES')
    expect(rewrite).toContain('Tighter crop')
    expect(rewrite).toContain('SAFETY COMPLIANCE')
    expect(buildReferenceStillDirectorSystemPrompt('wardrobe')).toContain('NO handheld')
  })

  it('fallback overlays notes, restores the kind anchor, and can soften for safety', () => {
    const prompt = fallbackReferenceStillPrompt({
      kind: 'cast',
      mode: 'rewrite',
      currentPrompt: 'Mara in a hallway',
      userDirection: 'Keep the cheekbones',
      policyCompliance: true,
    })
    expect(prompt).toContain(CHARACTER_IDENTITY_REFERENCE_ANCHOR)
    expect(prompt).toContain('Keep the cheekbones')
    expect(applyPolicyComplianceToPrompt('the spanner slams into the stone')).not.toMatch(
      /slams into/i
    )
  })

  it('prefers a stored directed prompt over a rebuilt one', () => {
    expect(preferredStoredOrBuiltPrompt('  saved plate  ', 'built')).toBe('saved plate')
    expect(preferredStoredOrBuiltPrompt('', 'built')).toBe('built')
    expect(
      seedCastDirectorPrompt({
        imagePrompt: 'Directed headshot of Mara',
        appearanceDescription: 'unused',
      })
    ).toBe('Directed headshot of Mara')
    expect(
      seedLocationDirectorPrompt({
        storedPrompt: 'Directed warehouse',
        locationName: 'WAREHOUSE',
      })
    ).toBe('Directed warehouse')
    expect(
      seedObjectDirectorPrompt({
        id: 'p1',
        type: 'object',
        name: 'Lantern',
        generationPrompt: 'Isolated brass lantern on gray',
      })
    ).toContain('Isolated brass lantern on gray')
  })
})

describe('reference still director wiring', () => {
  it('route rewrites without persisting', () => {
    const route = readSource('src/app/api/vision/direct-reference-still/route.ts')
    expect(route).toContain("mode !== 'optimize' && mode !== 'rewrite'")
    expect(route).toContain('policyCompliance')
    expect(route).toContain('fallbackReferenceStillPrompt')
    expect(route).not.toContain('project.save')
    expect(route).not.toContain('persistVision')
  })

  it('dialog does not persist itself', () => {
    const dialog = readSource('src/components/vision/ReferenceStillDirectorDialog.tsx')
    expect(dialog).toContain('onSave({ prompt, generate })')
    expect(dialog).toContain("t('saveAndGenerate')")
    expect(dialog).toContain('policyCompliance: safety')
    expect(dialog).not.toContain('persistVision')
    expect(dialog).not.toContain('applyStillDirectorPatch')
  })

  it('cast overlay order is Regen, Prompt Builder, Director, Edit', () => {
    const src = readSource('src/components/vision/CharacterLibrary.tsx')
    const regen = src.indexOf('Quick Generate Character')
    const builder = src.indexOf('Open Prompt Builder')
    const director = src.indexOf('title="Director"', builder)
    const edit = src.indexOf('title="Edit Image"', director)
    expect(regen).toBeGreaterThan(-1)
    expect(builder).toBeGreaterThan(regen)
    expect(director).toBeGreaterThan(builder)
    expect(edit).toBeGreaterThan(director)
    expect(src).toContain('bg-teal-600/90')
    expect(src).toContain('seedWardrobeDirectorPrompt')
    expect(src).toContain('saveOnly: !generate')
    expect(src).toContain('rawMode: true')
  })

  it('location overlay order is Regen, Prompt Builder, Director, Edit', () => {
    const src = readSource('src/components/vision/LocationLibrary.tsx')
    const overlayStart = src.indexOf('function LocationStillOverlay')
    const overlay = src.slice(overlayStart, src.indexOf('function LocationLibrary', overlayStart))
    const regen = overlay.indexOf('Quick Regenerat')
    const builder = overlay.indexOf('Open Prompt Builder')
    const director = overlay.indexOf('TooltipContent>Director')
    const edit = overlay.indexOf('TooltipContent>Edit Image')
    expect(regen).toBeGreaterThan(-1)
    expect(builder).toBeGreaterThan(regen)
    expect(director).toBeGreaterThan(builder)
    expect(edit).toBeGreaterThan(director)
    expect(src).toContain('onDirector')
    expect(src).toContain('seedLocationVersionDirectorPrompt')
    expect(src).toContain('version overlay: Prompt Builder + Edit')
  })

  it('object overlay order is Regen, Prompt Builder, Director, Edit', () => {
    const src = readSource('src/components/vision/VisionReferencesSidebar.tsx')
    const regen = src.indexOf('Quick Regenerat')
    const builder = src.indexOf('Open Prompt Builder', regen)
    const director = src.indexOf('TooltipContent>Director', builder)
    const edit = src.indexOf('TooltipContent>Edit Image', director)
    expect(regen).toBeGreaterThan(-1)
    expect(builder).toBeGreaterThan(regen)
    expect(director).toBeGreaterThan(builder)
    expect(edit).toBeGreaterThan(director)
    expect(src).toContain('onOpenObjectDirector')
    expect(src).toContain('seedObjectDirectorPrompt')
  })

  it('wardrobe still exposes Director and forwards promptOverride', () => {
    const src = readSource('src/components/vision/CharacterLibrary.tsx')
    expect(src).toContain('title="Director"')
    expect(src).toContain('promptOverride: wardrobe.generationPrompt.trim()')
    const headshot = readSource('src/app/api/character/generate-scene-headshot/route.ts')
    expect(headshot).toContain('promptOverride: headshotFields.promptOverride')
    const gen = readSource('src/lib/character/sceneCharacterHeadshot.ts')
    expect(gen).toContain('input.promptOverride?.trim()')
  })

  it('Regen prefers stored directed prompts', () => {
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')
    expect(page).toContain('locationPrompt: location.generationPrompt?.trim() || undefined')
    expect(page).toContain('locationPrompt: version.generationPrompt?.trim() || undefined')
    expect(page).toContain('saveOnly')
    expect(page).toContain('rawMode')
    expect(page).toContain('handleSaveObjectPrompt')
    const express = readSource('src/lib/vision/referenceExpress/runItem.ts')
    expect(express).toContain('rawMode: Boolean(storedPrompt)')
    expect(express).toContain('promptOverride: wardrobe.generationPrompt')
    expect(express).toContain('location.generationPrompt')
  })
})

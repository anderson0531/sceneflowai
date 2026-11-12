import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { omitWardrobePlatesForFaceCloseUp } from '@/lib/vision/referenceLimits'
import { resolveBeatFrameGenerationContext } from '@/lib/vision/beatFrameGenerationContext'
import { resolvePreVisFramePromptContext } from '@/lib/vision/resolvePreVisFramePromptContext'
import { resolveBeatVideoReferences } from '@/lib/vision/resolveBeatVideoReferences'
import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'
import { compileBeatVideoPromptFromDirection } from '@/lib/scene/beatVideoPromptCompiler'
import { buildFtvSilentMotionHint, FTV_SILENT_MOTION_HINT } from '@/lib/vision/ftvPromptNormalize'
import { optimizeStandardOmniSettings } from '@/lib/intelligence/standard-shot-settings'
import { injectElementTagsIntoPrompt } from '@/lib/kling/elementPromptTags'

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

describe('Layer A — Stills prompt & reference consistency', () => {
  it('downgrades 16:9 wardrobe-diptych sheets to discrete identity portraits on Face Close-Ups while preserving wardrobe summary', () => {
    const refs = [
      {
        imageUrl: 'https://cdn.example.com/elena-diptych.png',
        fallbackIdentityUrl: 'https://cdn.example.com/elena-headshot.png',
        name: 'Diptych ref: Elena',
        role: 'identity' as const,
        refRole: 'wardrobe-diptych' as const,
        characterName: 'Elena',
        wardrobeDescription: 'navy wool peacoat with upturned collar',
      },
      {
        imageUrl: 'https://cdn.example.com/elena-wardrobe.png',
        name: 'Wardrobe ref: Elena',
        role: 'wardrobe' as const,
        refRole: 'wardrobe' as const,
        characterName: 'Elena',
      },
    ]

    const { kept, dropped } = omitWardrobePlatesForFaceCloseUp(refs, 'Close-Up')
    expect(kept).toHaveLength(1)
    expect(kept[0]?.imageUrl).toBe('https://cdn.example.com/elena-headshot.png')
    expect(kept[0]?.refRole).toBe('identity')
    expect(kept[0]?.wardrobeDescription).toBe('navy wool peacoat with upturned collar')
    expect(dropped).toHaveLength(2)
  })

  it('does not attach off-camera props mentioned only in spoken dialogue when visual staging exists', () => {
    const ctx = resolveBeatFrameGenerationContext({
      scene: { heading: 'INT. KITCHEN - NIGHT' },
      beat: {
        beatId: 'beat-1',
        beatNumber: 1,
        kind: 'dialogue',
        character: 'Elena',
        line: 'Did you leave the brass compass in the truck?',
        actionDescription: 'Elena stands by the sink drying her hands with a dish towel.',
        durationSeconds: 4,
      },
      sceneIndex: 0,
      projectCharacters: [
        {
          id: 'char-elena',
          name: 'Elena',
          referenceImage: 'https://cdn.example.com/elena.png',
        },
      ],
      locationReferences: [],
      objectReferences: [
        {
          id: 'prop-compass',
          name: 'Brass Compass',
          imageUrl: 'https://cdn.example.com/compass.png',
          category: 'object',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    })

    expect(ctx.objectRefIds).not.toContain('prop-compass')
  })

  it('does not attach scene cast onto empty architectural/prop beats containing inanimate body-part idioms', () => {
    const ctx = resolveBeatFrameGenerationContext({
      scene: {
        heading: 'INT. MANOR HALLWAY - NIGHT',
        characters: ['Elena', 'Marcus'],
      },
      beat: {
        beatId: 'beat-insert',
        beatNumber: 2,
        kind: 'action',
        actionDescription:
          'Extreme close-up on the cracked grandfather clock face at the foot of the stairs in the back of the room.',
        durationSeconds: 4,
      },
      sceneIndex: 0,
      projectCharacters: [
        {
          id: 'char-elena',
          name: 'Elena',
          referenceImage: 'https://cdn.example.com/elena.png',
        },
        {
          id: 'char-marcus',
          name: 'Marcus',
          referenceImage: 'https://cdn.example.com/marcus.png',
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })

    expect(ctx.characterIds).toEqual([])
  })

  it('ignores cross-location locationVersionId mismatches and appends active location version stateNotes', () => {
    const resolved = resolvePreVisFramePromptContext({
      slot: {
        kind: 'beat',
        key: 'beat-1',
        label: 'Shot 1',
        beatId: 'beat-1',
        beatNumber: 1,
        prompt: 'Wide shot of the flooded lab.',
      },
      scene: {
        heading: 'INT. LAB - NIGHT',
        beats: [
          {
            beatId: 'beat-1',
            beatNumber: 1,
            kind: 'action',
            actionDescription: 'Sparks arc across the flooded lab floor.',
            durationSeconds: 5,
            referenceSelection: {
              characterIds: [],
              locationRefId: 'loc-lab',
              locationVersionId: 'ver-from-other-loc',
              objectRefIds: [],
              resolvedAt: '2026-01-01T00:00:00Z',
            },
          },
        ],
      },
      sceneIndex: 0,
      projectCharacters: [],
      locationReferences: [
        {
          id: 'loc-office',
          location: 'INT. OFFICE',
          locationDisplay: 'Office',
          imageUrl: 'https://cdn.example.com/office.png',
          sceneNumbers: [1],
          versions: [
            {
              id: 'ver-from-other-loc',
              name: 'Messy Office',
              imageUrl: 'https://cdn.example.com/office-messy.png',
              stateNotes: 'Papers scattered everywhere',
            },
          ],
        },
        {
          id: 'loc-lab',
          location: 'INT. LAB',
          locationDisplay: 'Main Lab',
          imageUrl: 'https://cdn.example.com/lab-clean.png',
          sceneNumbers: [1],
          defaultVersionId: 'ver-lab-flooded',
          versions: [
            {
              id: 'ver-lab-flooded',
              name: 'Flooded Emergency State',
              imageUrl: 'https://cdn.example.com/lab-flooded.png',
              stateNotes: 'Ankle-deep water and red emergency strobes',
            },
          ],
        },
      ],
      objectReferences: [],
    })

    expect(resolved.locationRefId).toBe('loc-lab')
    expect(resolved.locationVersionId).toBe('ver-lab-flooded')
    expect(resolved.visualSetup.location).toContain(
      'Ankle-deep water and red emergency strobes'
    )
    expect(resolved.visualSetup.location).not.toContain('Papers scattered everywhere')
  })
})

describe('Layer B — Clips prompt & reference consistency', () => {
  it('selects discrete identity headshot instead of full-body diptych on strict Face Close-Up clips', () => {
    const resolved = resolveBeatVideoReferences({
      scene: { heading: 'INT. INTERROGATION ROOM - NIGHT' },
      beat: {
        beatId: 'beat-cu',
        beatNumber: 1,
        kind: 'dialogue',
        character: 'Elena',
        line: 'Tell me the truth.',
        actionDescription: 'Elena leans forward across the steel table.',
        durationSeconds: 4,
        beatDirection: {
          shotType: 'Close-Up',
        },
        referenceSelection: {
          characterIds: ['char-elena'],
          objectRefIds: [],
        },
      },
      sceneIndex: 0,
      projectCharacters: [
        {
          id: 'char-elena',
          name: 'Elena',
          referenceImage: 'https://cdn.example.com/elena-portrait.png',
          wardrobes: [
            {
              id: 'w-1',
              name: 'Detective Coat',
              isDefault: true,
              combinedCharacterRefUrl: 'https://cdn.example.com/elena-diptych.png',
              fullBodyUrl: 'https://cdn.example.com/elena-body.png',
            },
          ],
        },
      ],
      locationReferences: [],
      objectReferences: [],
    })

    const charRef = resolved.labeledRefs.find((r) => r.characterName === 'Elena')
    expect(charRef).toBeDefined()
    expect(charRef?.url).toBe('https://cdn.example.com/elena-portrait.png')
    expect(charRef?.refRole).toBe('identity')
  })

  it('preserves quoted spoken dialogue verbatim when neutralizing reference-conflict prose', () => {
    const raw = `Elara's hands steady the lantern, wearing a tattered coat. Elara speaks, "Elara's voice is trembling in distress, don't look away!"`
    const result = neutralizeReferenceConflictPrompt(raw)

    // Unquoted narrative conflicts are neutralized:
    expect(result).toContain("the subject's hands")
    expect(result).not.toContain('wearing a tattered coat')
    // Quoted spoken dialogue stays 100% verbatim:
    expect(result).toContain(`"Elara's voice is trembling in distress, don't look away!"`)
  })

  it('emits off-screen voiceover (no lip-sync) for V.O. dialogue and custom-speaker narration beats', () => {
    const voPrompt = compileBeatVideoPromptFromDirection(
      {
        beatId: 'beat-vo',
        beatNumber: 1,
        kind: 'dialogue',
        character: 'Marcus (V.O.)',
        line: 'I knew the vault was already empty.',
        actionDescription: 'Elena stares at the open vault door in silence.',
        durationSeconds: 5,
        beatDirection: {
          shotType: 'Medium Shot',
          blocking: 'Elena stands alone before the open vault door.',
        },
      },
      undefined
    ).prompt

    expect(voPrompt).toContain('Off-screen voice of')
    expect(voPrompt).toContain('without lip-sync')
    expect(voPrompt).not.toContain('Marcus (V.O.) speaks,')

    const customNarrationPrompt = compileBeatVideoPromptFromDirection(
      {
        beatId: 'beat-nar',
        beatNumber: 2,
        kind: 'narration',
        character: 'ELENA',
        line: 'That winter changed all of us.',
        actionDescription: 'Snow drifts across the empty courtyard.',
        durationSeconds: 5,
        beatDirection: {
          shotType: 'Wide Shot',
          blocking: 'Snow falls across the empty stone courtyard.',
        },
      },
      undefined
    ).prompt

    expect(customNarrationPrompt).toContain('Off-screen voiceover narration')
    expect(customNarrationPrompt).toContain('no lip-sync')
  })

  it('uses camera-aware FTV silent motion hint instead of forcing static camera on dolly/tracking moves', () => {
    expect(buildFtvSilentMotionHint('Slow dolly push-in', '')).toContain('smooth camera movement')
    expect(buildFtvSilentMotionHint('Slow dolly push-in', '')).not.toContain('static camera')
    expect(buildFtvSilentMotionHint('Static locked-off', '')).toBe(FTV_SILENT_MOTION_HINT)
  })

  it('does not trigger omniMultiShot on ordinary single-shot beats containing "meanwhile"', () => {
    const settings = optimizeStandardOmniSettings({
      segment: {
        shotType: 'Medium Shot',
        action: 'Meanwhile, Elena checks her watch beside the window.',
        cameraMovement: 'Static',
      },
      sceneHeading: 'INT. LOBBY - DAY',
      ingredientCount: 2,
    })

    expect(settings.omniMultiShot).toBe(false)
  })

  it('normalizes subsequent bare character-name mentions when injecting Kling element tags', () => {
    const tagged = injectElementTagsIntoPrompt(
      'Elena steps into the light. Elena raises the lantern toward Elena’s reflection.',
      [
        {
          tag: '<<<element_1>>>',
          token: 'person [1]',
          names: ['Elena'],
        },
      ]
    )

    expect(tagged).toContain('person [1] <<<element_1>>> steps into the light.')
    expect(tagged).not.toMatch(/\bElena\b/)
  })
})

describe('Layer C & D — Unified Shot Director, Stills/Clips UI parity & client-bundle purity', () => {
  it('folds Refine Current Frame + Save & Shoot/Render directly into BeatDirectorDialog', () => {
    const dialog = readSource('src/components/vision/BeatDirectorDialog.tsx')
    const editor = readSource('src/components/vision/BeatDirectionEditor.tsx')

    expect(dialog).toContain("'/api/image/edit'")
    expect(dialog).toContain('Refine Current Frame')
    expect(dialog).toContain('Direct Shot')
    expect(dialog).toContain('Save & Render Clip')
    expect(dialog).toContain('Save & Shoot Still')
    expect(dialog).toContain('Active compiled prompts (Still &amp; Clip)')
    expect(editor).toContain('onSaveEditedFrame')
    expect(editor).toContain('onSaveAndGenerate')
  })

  it('keeps Stills and Clips controls consistent via Shot Director without legacy technical prompt dialogs', () => {
    const frames = readSource('src/components/vision/SceneStoryboardFrameViewer.tsx')
    const gallery = readSource('src/components/vision/scene-production/BeatVideoGallery.tsx')
    const page = readSource('src/app/dashboard/workflow/vision/[projectId]/page.tsx')

    expect(frames).toContain('Shot Director')
    expect(frames).not.toContain('onDirect={')
    expect(gallery).toContain('Shot Director')
    expect(gallery).toContain('Open Stills')
    expect(gallery).not.toContain('Direct Clip')
    expect(page).not.toContain('onDirectFrame={handleOpenDirectFrame}')
  })

  it('keeps all modified client-reachable modules strictly free of server-only imports', () => {
    const clientReachableFiles = [
      'src/components/vision/BeatDirectorDialog.tsx',
      'src/components/vision/BeatDirectionEditor.tsx',
      'src/components/vision/SceneStoryboardFrameViewer.tsx',
      'src/components/vision/scene-production/BeatVideoGallery.tsx',
      'src/components/vision/scene-production/DirectorConsoleImpl.tsx',
      'src/components/vision/ScriptPanel.tsx',
      'src/lib/vision/referenceLimits.ts',
      'src/lib/vision/beatFrameGenerationContext.ts',
      'src/lib/vision/resolvePreVisFramePromptContext.ts',
      'src/lib/vision/resolveBeatVideoReferences.ts',
      'src/lib/scene/beatVideoPromptCompiler.ts',
      'src/lib/gemini/neutralizeReferenceConflictPrompt.ts',
      'src/lib/vision/ftvPromptNormalize.ts',
      'src/lib/kling/elementPromptTags.ts',
    ]

    const forbiddenPatterns = [
      /from\s+['"]server-only['"]/,
      /import\s*\(\s*['"]server-only['"]\s*\)/,
      /from\s+['"]@\/lib\/vertexai\//,
      /import\s*\(\s*['"]@\/lib\/vertexai\//,
      /from\s+['"]@\/models\//,
      /import\s*\(\s*['"]@\/models\//,
      /from\s+['"](?:fs|node:fs|child_process|node:child_process)['"]/,
      /require\s*\(\s*['"](?:fs|node:fs|child_process|node:child_process)['"]\s*\)/,
    ]

    for (const relPath of clientReachableFiles) {
      const src = readSource(relPath)
      for (const pattern of forbiddenPatterns) {
        expect(src, `${relPath} must not match ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})

import { describe, expect, it } from 'vitest'
import {
  applyBatchWardrobeSuggestions,
  applyCharacterWardrobeMutation,
  defaultCharacterWardrobeId,
  LEGACY_WARDROBE_ID,
  mergeVisionPhaseCharactersForPut,
  updateCharacterAttributesInList,
  updateCharacterInList,
} from '@/lib/vision/updateCharacterReference'
import { mergeVisionPhaseReferences } from '@/lib/projects/mergeVisionPhaseReferences'
import { mergeLocationReferences } from '@/lib/vision/hydrateVisionProjectImages'
import {
  advanceSaveBaselineAfterPut,
  captureSaveBaselineFromMetadata,
  diffProjectPutAgainstBaseline,
} from '@/lib/projects/deltaProjectSave'
import type { LocationReference } from '@/types/vision'

describe('referenceImagePersistence — Cast, Wardrobe, Location & Save-Queue Regression Suite', () => {
  describe('1. First-time wardrobe generation (Smoking Gun #1: legacy-wardrobe & defaultWardrobe)', () => {
    it('persists fullBodyUrl and combinedCharacterRefUrl on the 1st attempt when UI sends legacy-wardrobe for unmigrated defaultWardrobe', () => {
      const initialCharacters = [
        {
          id: 'char-bp-4',
          name: 'Tariq Al-mansoor',
          role: 'supporting',
          referenceImage: 'https://blob.vercel-storage.com/tariq-portrait.png',
          defaultWardrobe: 'Charcoal wool cardigan over rumpled blue Oxford shirt',
          wardrobeAccessories: 'Wire-rim glasses, security lanyard',
          wardrobes: [],
        },
      ]

      const next = applyCharacterWardrobeMutation(
        initialCharacters,
        'char-bp-4',
        {
          wardrobeId: LEGACY_WARDROBE_ID,
          fullBodyUrl: 'https://blob.vercel-storage.com/tariq-full-body-1.png',
          combinedCharacterRefUrl: 'https://blob.vercel-storage.com/tariq-combined-1.jpg',
          needsImageRegen: false,
          action: 'update',
        },
        1794477000000
      )

      expect(next).toHaveLength(1)
      const tariq = next[0]!
      expect(tariq.wardrobes).toHaveLength(1)
      expect(tariq.wardrobes![0]!.id).toBe(defaultCharacterWardrobeId('char-bp-4'))
      expect(tariq.wardrobes![0]!.description).toBe(
        'Charcoal wool cardigan over rumpled blue Oxford shirt'
      )
      expect(tariq.wardrobes![0]!.accessories).toBe('Wire-rim glasses, security lanyard')
      expect(tariq.wardrobes![0]!.fullBodyUrl).toBe(
        'https://blob.vercel-storage.com/tariq-full-body-1.png'
      )
      expect(tariq.wardrobes![0]!.combinedCharacterRefUrl).toBe(
        'https://blob.vercel-storage.com/tariq-combined-1.jpg'
      )
      expect(tariq.wardrobes![0]!.needsImageRegen).toBe(false)
    })

    it('persists fullBodyUrl and combinedCharacterRefUrl on the 1st attempt when UI sends deterministic defaultCharacterWardrobeId', () => {
      const initialCharacters = [
        {
          id: 'char-bp-5',
          name: 'Dr. Elena Rostova',
          referenceImage: 'https://blob.vercel-storage.com/elena-portrait.png',
          defaultWardrobe: 'Crisp slate-grey lab coat over black turtleneck',
          wardrobes: [],
        },
      ]

      const next = applyCharacterWardrobeMutation(
        initialCharacters,
        'char-bp-5',
        {
          wardrobeId: defaultCharacterWardrobeId('char-bp-5'),
          wardrobeName: 'Default Outfit',
          defaultWardrobe: 'Crisp slate-grey lab coat over black turtleneck',
          fullBodyUrl: 'https://blob.vercel-storage.com/elena-full-body-1.png',
          combinedCharacterRefUrl: 'https://blob.vercel-storage.com/elena-combined-1.jpg',
          needsImageRegen: false,
          action: 'update',
        },
        1794477005000
      )

      const elena = next[0]!
      expect(elena.wardrobes).toHaveLength(1)
      expect(elena.wardrobes![0]!.id).toBe('wardrobe-default-char-bp-5')
      expect(elena.wardrobes![0]!.fullBodyUrl).toBe(
        'https://blob.vercel-storage.com/elena-full-body-1.png'
      )
      expect(elena.wardrobes![0]!.combinedCharacterRefUrl).toBe(
        'https://blob.vercel-storage.com/elena-combined-1.jpg'
      )
    })

    it('upserts wardrobe media instead of dropping it even when wardrobeId is missing and defaultWardrobe is empty', () => {
      const initialCharacters = [
        {
          id: 'char-bp-6',
          name: 'Kaelen',
          referenceImage: 'https://blob.vercel-storage.com/kaelen-portrait.png',
          wardrobes: [],
        },
      ]

      const next = applyCharacterWardrobeMutation(
        initialCharacters,
        'char-bp-6',
        {
          wardrobeId: 'wardrobe-9991',
          wardrobeName: 'Arctic Expedition Parka',
          defaultWardrobe: 'Heavy orange expedition parka with frost-rimmed hood',
          fullBodyUrl: 'https://blob.vercel-storage.com/kaelen-parka.png',
          combinedCharacterRefUrl: 'https://blob.vercel-storage.com/kaelen-parka-combined.jpg',
          needsImageRegen: false,
          action: 'update',
        },
        1794477010000
      )

      const kaelen = next[0]!
      expect(kaelen.wardrobes).toHaveLength(1)
      expect(kaelen.wardrobes![0]!.id).toBe('wardrobe-9991')
      expect(kaelen.wardrobes![0]!.name).toBe('Arctic Expedition Parka')
      expect(kaelen.wardrobes![0]!.fullBodyUrl).toBe(
        'https://blob.vercel-storage.com/kaelen-parka.png'
      )
      expect(kaelen.wardrobes![0]!.combinedCharacterRefUrl).toBe(
        'https://blob.vercel-storage.com/kaelen-parka-combined.jpg'
      )
    })
  })

  describe('2. Character attributes & batch wardrobe suggestions preserve reference media', () => {
    it('updateCharacterAttributesInList strips undefined keys and preserves referenceImage, wardrobes, voiceConfig, and name', () => {
      const characters = [
        {
          id: 'char-bp-3',
          name: 'Maren Lindqvist',
          role: 'supporting',
          description: 'Lead hydrologist',
          referenceImage: 'https://blob.vercel-storage.com/maren-portrait.png',
          voiceConfig: {
            provider: 'google',
            voiceId: 'voice_ec167827',
            voiceName: 'Maren Lindqvist',
          },
          wardrobes: [
            {
              id: 'wardrobe-1',
              name: 'Field Gear',
              description: 'Navy thermal jacket',
              isDefault: true,
              createdAt: '2026-11-12T00:00:00.000Z',
              fullBodyUrl: 'https://blob.vercel-storage.com/maren-full-body.png',
              combinedCharacterRefUrl: 'https://blob.vercel-storage.com/maren-combined.jpg',
            },
          ],
        },
      ]

      const updated = updateCharacterAttributesInList(characters, 'char-bp-3', {
        age: 'early 30s',
        ethnicity: 'Norwegian',
        voiceDescription: 'Cool Nordic authority',
        referenceImage: undefined,
        wardrobes: undefined,
        name: 'Accidental Override',
      })

      expect(updated[0]!.name).toBe('Maren Lindqvist')
      expect((updated[0] as any).age).toBe('early 30s')
      expect((updated[0] as any).ethnicity).toBe('Norwegian')
      expect(updated[0]!.referenceImage).toBe('https://blob.vercel-storage.com/maren-portrait.png')
      expect((updated[0] as any).voiceConfig?.voiceId).toBe('voice_ec167827')
      expect(updated[0]!.wardrobes?.[0]?.fullBodyUrl).toBe(
        'https://blob.vercel-storage.com/maren-full-body.png'
      )
    })

    it('applyBatchWardrobeSuggestions preserves existing wardrobe media URLs when outfit names match', () => {
      const characters = [
        {
          id: 'char-1',
          name: 'Ava',
          wardrobes: [
            {
              id: 'wardrobe-existing',
              name: 'Lab Coat',
              description: 'White lab coat over grey shirt',
              isDefault: true,
              createdAt: '2026-11-12T00:00:00.000Z',
              fullBodyUrl: 'https://blob.vercel-storage.com/ava-lab-full.png',
              combinedCharacterRefUrl: 'https://blob.vercel-storage.com/ava-lab-combined.jpg',
            },
          ],
        },
      ]

      const next = applyBatchWardrobeSuggestions(characters, 'char-1', [
        {
          name: 'Lab Coat',
          description: 'White lab coat over grey shirt',
          sceneNumbers: [1, 2, 4],
          reason: 'Lab scenes',
        },
        {
          name: 'Evening Coat',
          description: 'Dark trench coat',
          sceneNumbers: [5],
          reason: 'Exterior rain scene',
        },
      ])

      expect(next[0]!.wardrobes).toHaveLength(2)
      expect(next[0]!.wardrobes![0]!.id).toBe('wardrobe-existing')
      expect(next[0]!.wardrobes![0]!.fullBodyUrl).toBe(
        'https://blob.vercel-storage.com/ava-lab-full.png'
      )
      expect(next[0]!.wardrobes![0]!.combinedCharacterRefUrl).toBe(
        'https://blob.vercel-storage.com/ava-lab-combined.jpg'
      )
      expect(next[0]!.wardrobes![0]!.needsImageRegen).toBe(false)
    })
  })

  describe('3. Server PUT merge for characters (mergeVisionPhaseCharactersForPut)', () => {
    it('preserves server portrait, voiceConfig, and nested wardrobe media when stale unmigrated client sends wardrobes: [] + defaultWardrobe', () => {
      const existingServerChars = [
        {
          id: 'char-bp-4',
          name: 'Tariq Al-mansoor',
          referenceImage: 'https://blob.vercel-storage.com/tariq-portrait.png',
          voiceConfig: { provider: 'google', voiceId: 'voice_123' },
          defaultWardrobe: 'Charcoal wool cardigan',
          wardrobes: [
            {
              id: 'wardrobe-default-char-bp-4',
              name: 'Default Outfit',
              description: 'Charcoal wool cardigan',
              isDefault: true,
              createdAt: '2026-11-12T00:00:00.000Z',
              fullBodyUrl: 'https://blob.vercel-storage.com/tariq-full.png',
              combinedCharacterRefUrl: 'https://blob.vercel-storage.com/tariq-combined.jpg',
            },
          ],
        },
      ]

      const staleIncomingChars = [
        {
          id: 'char-bp-4',
          name: 'Tariq Al-mansoor',
          age: 'early 30s',
          defaultWardrobe: 'Charcoal wool cardigan',
          wardrobes: [],
        },
      ]

      const merged = mergeVisionPhaseCharactersForPut(existingServerChars, staleIncomingChars)
      expect(merged[0]!.referenceImage).toBe('https://blob.vercel-storage.com/tariq-portrait.png')
      expect((merged[0] as any).voiceConfig?.voiceId).toBe('voice_123')
      expect(merged[0]!.wardrobes).toHaveLength(1)
      expect(merged[0]!.wardrobes![0]!.fullBodyUrl).toBe(
        'https://blob.vercel-storage.com/tariq-full.png'
      )
      expect(merged[0]!.wardrobes![0]!.combinedCharacterRefUrl).toBe(
        'https://blob.vercel-storage.com/tariq-combined.jpg'
      )
    })

    it('honors intentional deletion of the last wardrobe when client clears both wardrobes: [] and defaultWardrobe: undefined', () => {
      const existingServerChars = [
        {
          id: 'char-bp-4',
          name: 'Tariq Al-mansoor',
          defaultWardrobe: 'Charcoal wool cardigan',
          wardrobes: [
            {
              id: 'wardrobe-default-char-bp-4',
              name: 'Default Outfit',
              description: 'Charcoal wool cardigan',
              isDefault: true,
              createdAt: '2026-11-12T00:00:00.000Z',
              fullBodyUrl: 'https://blob.vercel-storage.com/tariq-full.png',
            },
          ],
        },
      ]

      const afterDeleteChars = applyCharacterWardrobeMutation(existingServerChars, 'char-bp-4', {
        wardrobeId: 'wardrobe-default-char-bp-4',
        action: 'delete',
      })

      const merged = mergeVisionPhaseCharactersForPut(existingServerChars, afterDeleteChars)
      expect(merged[0]!.wardrobes).toEqual([])
    })

    it('preserves portrait and wardrobe media across character renames by matching id first', () => {
      const existingServerChars = [
        {
          id: 'char-bp-3',
          name: 'Maren',
          referenceImage: 'https://blob.vercel-storage.com/maren-portrait.png',
          wardrobes: [
            {
              id: 'w-1',
              name: 'Parka',
              description: 'Blue parka',
              isDefault: true,
              createdAt: '2026-11-12T00:00:00.000Z',
              fullBodyUrl: 'https://blob.vercel-storage.com/maren-parka.png',
            },
          ],
        },
      ]

      const renamedIncoming = [
        {
          id: 'char-bp-3',
          name: 'Dr. Maren Lindqvist',
          wardrobes: [
            {
              id: 'w-1',
              name: 'Parka',
              description: 'Blue parka',
              isDefault: true,
              createdAt: '2026-11-12T00:00:00.000Z',
            },
          ],
        },
      ]

      const merged = mergeVisionPhaseCharactersForPut(existingServerChars, renamedIncoming)
      expect(merged[0]!.name).toBe('Dr. Maren Lindqvist')
      expect(merged[0]!.referenceImage).toBe('https://blob.vercel-storage.com/maren-portrait.png')
      expect(merged[0]!.wardrobes?.[0]?.fullBodyUrl).toBe(
        'https://blob.vercel-storage.com/maren-parka.png'
      )
    })
  })

  describe('4. Nested location version image preservation (PUT merge + Phase 2 hydration)', () => {
    it('mergeVisionPhaseReferences preserves nested locationReferences[i].versions[j].imageUrl when incoming payload has empty version imageUrl', () => {
      const existingRefs = {
        locationReferences: [
          {
            id: 'loc-1',
            location: 'SERVER ROOM',
            imageUrl: 'https://blob.vercel-storage.com/server-room-base.png',
            versions: [
              {
                id: 'ver-power-out',
                name: 'Emergency Red Lighting',
                stateNotes: 'Main power cut, red backup strobes active',
                imageUrl: 'https://blob.vercel-storage.com/server-room-red.png',
              },
            ],
          },
        ],
      }

      const incomingStaleRefs = {
        locationReferences: [
          {
            id: 'loc-1',
            location: 'SERVER ROOM',
            description: 'Updated server rack description',
            imageUrl: '',
            versions: [
              {
                id: 'ver-power-out',
                name: 'Emergency Red Lighting',
                stateNotes: 'Main power cut, red backup strobes active',
                imageUrl: '',
              },
            ],
          },
        ],
      }

      const merged = mergeVisionPhaseReferences(existingRefs, incomingStaleRefs)
      const loc = (merged.locationReferences as LocationReference[])[0]!
      expect(loc.imageUrl).toBe('https://blob.vercel-storage.com/server-room-base.png')
      expect(loc.versions?.[0]?.imageUrl).toBe(
        'https://blob.vercel-storage.com/server-room-red.png'
      )
    })

    it('mergeLocationReferences (Phase 2 hydration) preserves live version imageUrl generated before hydration finishes', () => {
      const prevLive: LocationReference[] = [
        {
          id: 'loc-1',
          location: 'ICE CORE LAB',
          imageUrl: 'https://blob.vercel-storage.com/lab-base.png',
          versions: [
            {
              id: 'ver-1',
              name: 'Containment Breach',
              stateNotes: 'Frost covering glass',
              imageUrl: 'https://blob.vercel-storage.com/lab-breach-live.png',
              appliesFrom: { sceneNumber: 4, beatIndex: 0 },
              createdAt: '2026-11-12T00:00:00.000Z',
            },
          ],
        },
      ]

      const serverHydrated: LocationReference[] = [
        {
          id: 'loc-1',
          location: 'ICE CORE LAB',
          imageUrl: 'https://blob.vercel-storage.com/lab-base.png',
          versions: [
            {
              id: 'ver-1',
              name: 'Containment Breach',
              stateNotes: 'Frost covering glass',
              imageUrl: '',
              appliesFrom: { sceneNumber: 4, beatIndex: 0 },
              createdAt: '2026-11-12T00:00:00.000Z',
            },
          ],
        },
      ]

      const merged = mergeLocationReferences(prevLive, serverHydrated)
      expect(merged[0]!.versions?.[0]?.imageUrl).toBe(
        'https://blob.vercel-storage.com/lab-breach-live.png'
      )
    })
  })

  describe('5. Sequential SAVE-QUEUE simulation: Portrait -> Attributes -> Voice -> 1st Wardrobe', () => {
    it('commits every step cleanly through baseline diffing with zero dropped writes on 1st attempt', () => {
      let characters: Array<Record<string, any>> = [
        {
          id: 'char-bp-4',
          name: 'Tariq Al-mansoor',
          role: 'supporting',
          defaultWardrobe: 'Charcoal wool cardigan over rumpled blue Oxford shirt',
          wardrobes: [],
        },
      ]

      const initialMeta = {
        visionPhase: {
          characters,
          references: { sceneReferences: [], objectReferences: [], locationReferences: [] },
        },
      }
      const baseline = captureSaveBaselineFromMetadata(initialMeta)

      // Step 1: Portrait generated
      characters = updateCharacterInList(characters, 'char-bp-4', {
        referenceImage: 'https://blob.vercel-storage.com/tariq-portrait.png',
      })
      const put1 = { metadata: { visionPhase: { characters } } }
      const diff1 = diffProjectPutAgainstBaseline(put1, baseline)
      expect(diff1.noOp).toBe(false)
      advanceSaveBaselineAfterPut(put1, baseline)

      // Step 2: Attributes updated during Auto Voice analysis (now serialized in SAVE-QUEUE)
      characters = updateCharacterAttributesInList(characters, 'char-bp-4', {
        age: 'early 30s',
        ethnicity: 'Jordanian-British',
        voiceDescription: 'Nervous intellectual, British English accent',
        gender: 'male',
        genderSource: 'ai',
      })
      const put2 = { metadata: { visionPhase: { characters } } }
      const diff2 = diffProjectPutAgainstBaseline(put2, baseline)
      expect(diff2.noOp).toBe(false)
      advanceSaveBaselineAfterPut(put2, baseline)

      // Step 3: Voice config saved
      characters = updateCharacterInList(characters, 'char-bp-4', {
        voiceConfig: {
          provider: 'google',
          voiceId: 'voice_c462cef8',
          voiceName: 'Tariq Al-mansoor',
        },
      })
      const put3 = { metadata: { visionPhase: { characters } } }
      const diff3 = diffProjectPutAgainstBaseline(put3, baseline)
      expect(diff3.noOp).toBe(false)
      advanceSaveBaselineAfterPut(put3, baseline)

      // Step 4: 1st-attempt Wardrobe generation
      characters = applyCharacterWardrobeMutation(characters, 'char-bp-4', {
        wardrobeId: defaultCharacterWardrobeId('char-bp-4'),
        wardrobeName: 'Default Outfit',
        defaultWardrobe: 'Charcoal wool cardigan over rumpled blue Oxford shirt',
        fullBodyUrl: 'https://blob.vercel-storage.com/tariq-full-body.png',
        combinedCharacterRefUrl: 'https://blob.vercel-storage.com/tariq-combined.jpg',
        needsImageRegen: false,
        action: 'update',
      })
      const put4 = { metadata: { visionPhase: { characters } } }
      const diff4 = diffProjectPutAgainstBaseline(put4, baseline)
      expect(diff4.noOp).toBe(false)
      advanceSaveBaselineAfterPut(put4, baseline)

      const finalChar = (diff4.body.metadata as any).visionPhase.characters[0]
      expect(finalChar.referenceImage).toBe('https://blob.vercel-storage.com/tariq-portrait.png')
      expect(finalChar.voiceConfig?.voiceId).toBe('voice_c462cef8')
      expect(finalChar.ethnicity).toBe('Jordanian-British')
      expect(finalChar.wardrobes).toHaveLength(1)
      expect(finalChar.wardrobes[0].fullBodyUrl).toBe(
        'https://blob.vercel-storage.com/tariq-full-body.png'
      )
      expect(finalChar.wardrobes[0].combinedCharacterRefUrl).toBe(
        'https://blob.vercel-storage.com/tariq-combined.jpg'
      )
    })
  })
})

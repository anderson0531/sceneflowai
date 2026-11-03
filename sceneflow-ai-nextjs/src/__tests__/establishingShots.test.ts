import { describe, expect, it } from 'vitest'
import {
  buildEstablishingActionBeatForScene,
  doesSceneRequireEstablishingShot,
  ensureEstablishingShotsAcrossScenes,
  ensureSceneHasEstablishingShot,
  isBeatEstablishingShot,
  parseSceneSlugline,
} from '@/lib/script/establishingShots'
import { dedupeRedundantActionBeats } from '@/lib/script/actionBeatDedupe'
import { ensureSceneBeats, parseLlmBeats } from '@/lib/script/beatMigration'
import { autoFixScript, runScriptQA } from '@/lib/script/qualityAssurance'
import type { SceneBeat } from '@/lib/script/segmentTypes'

describe('establishingShots', () => {
  describe('parseSceneSlugline & doesSceneRequireEstablishingShot', () => {
    it('parses standard INT./EXT. sluglines with location and time of day', () => {
      expect(parseSceneSlugline('INT. SUBTERRANEAN VAULT - NIGHT')).toEqual({
        raw: 'INT. SUBTERRANEAN VAULT - NIGHT',
        intExt: 'INT',
        location: 'subterranean vault',
        timeOfDay: 'night',
      })
      expect(parseSceneSlugline('EXT. ROOFTOP HELIPAD (CONTINUOUS) - DAWN')).toEqual({
        raw: 'EXT. ROOFTOP HELIPAD (CONTINUOUS) - DAWN',
        intExt: 'EXT',
        location: 'rooftop helipad',
        timeOfDay: 'dawn',
      })
    })

    it('requires an establishing shot on the first narrative scene or after a title bookend', () => {
      const titleScene = {
        cinematicType: 'title',
        heading: 'TITLE SEQUENCE',
      }
      const firstNarrative = {
        heading: 'INT. OBSERVATORY DOME - NIGHT',
      }
      expect(doesSceneRequireEstablishingShot(firstNarrative, null, 0)).toBe(true)
      expect(doesSceneRequireEstablishingShot(firstNarrative, titleScene, 1)).toBe(true)
      expect(doesSceneRequireEstablishingShot(titleScene, null, 0)).toBe(false)
    })

    it('requires an establishing shot when location changes, INT/EXT flips, or time jumps', () => {
      const vaultNight = { heading: 'INT. SUBTERRANEAN VAULT - NIGHT' }
      const rooftopNight = { heading: 'EXT. ROOFTOP HELIPAD - NIGHT' }
      const vaultExtNight = { heading: 'EXT. SUBTERRANEAN VAULT - NIGHT' }
      const vaultMorning = { heading: 'INT. SUBTERRANEAN VAULT - MORNING' }
      const vaultContinuous = { heading: 'INT. SUBTERRANEAN VAULT - CONTINUOUS' }
      const vaultSplitPart = {
        heading: 'INT. SUBTERRANEAN VAULT - NIGHT',
        scenePartIndex: 1,
      }

      // Different location -> true
      expect(doesSceneRequireEstablishingShot(rooftopNight, vaultNight, 2)).toBe(true)
      // Same location, INT -> EXT -> true
      expect(doesSceneRequireEstablishingShot(vaultExtNight, vaultNight, 2)).toBe(true)
      // Same location, NIGHT -> MORNING -> true
      expect(doesSceneRequireEstablishingShot(vaultMorning, vaultNight, 2)).toBe(true)
      // Same location, NIGHT -> CONTINUOUS -> false
      expect(doesSceneRequireEstablishingShot(vaultContinuous, vaultNight, 2)).toBe(false)
      // Split continuation part (Scene 2B) -> false
      expect(doesSceneRequireEstablishingShot(vaultSplitPart, vaultNight, 2)).toBe(false)
    })
  })

  describe('ensureSceneHasEstablishingShot & ensureEstablishingShotsAcrossScenes', () => {
    it('prepends an establishing action beat when a new-location scene starts directly on dialogue', () => {
      const prevScene = {
        sceneNumber: 1,
        heading: 'INT. ARCHIVE LAB - NIGHT',
        beats: [
          {
            beatId: 'bt_1',
            sequenceIndex: 0,
            kind: 'action',
            beatRole: 'establishing',
            actionDescription: 'Wide establishing shot of the archive lab.',
          },
        ],
      }

      const nextScene = {
        sceneNumber: 2,
        heading: 'EXT. HARBOR PIER - DAWN',
        visualDescription:
          'Dense sea fog rolls across the rusted shipping cranes and wet timber planks of the pier.',
        sceneMovements: [
          {
            index: 0,
            summary: 'Elena confronts Marcus at the edge of the pier.',
            beatStart: 0,
            beatEnd: 1,
          },
        ],
        beats: [
          {
            beatId: 'bt_d1',
            sequenceIndex: 0,
            kind: 'dialogue',
            movementIndex: 0,
            character: 'ELENA',
            line: '[urgent] The ferry already left without the manifest.',
          },
          {
            beatId: 'bt_d2',
            sequenceIndex: 1,
            kind: 'dialogue',
            movementIndex: 0,
            character: 'MARCUS',
            line: '[cold] Then we swim.',
          },
        ] satisfies SceneBeat[],
      }

      const res = ensureSceneHasEstablishingShot(nextScene, prevScene, 1)
      expect(res.injected).toBe(true)

      const beats = res.scene.beats as SceneBeat[]
      expect(beats).toHaveLength(3)
      expect(beats[0].kind).toBe('action')
      expect(beats[0].beatRole).toBe('establishing')
      expect(beats[0].sequenceIndex).toBe(0)
      expect(beats[0].beatDirection?.shotType).toMatch(/Establishing Shot/i)
      expect(beats[0].beatDirection?.castInFrame).toEqual([])
      expect(beats[0].actionDescription).toMatch(/HARBOR PIER/i)
      expect(beats[1].beatId).toBe('bt_d1')
      expect(beats[1].sequenceIndex).toBe(1)
      expect(beats[2].beatId).toBe('bt_d2')
      expect(beats[2].sequenceIndex).toBe(2)

      // Movement range shifted to cover the prepended beat
      const movements = res.scene.sceneMovements as Array<{ beatStart: number; beatEnd: number }>
      expect(movements[0]).toMatchObject({ beatStart: 0, beatEnd: 2 })
    })

    it('tags an existing Beat 0 wide action beat as establishing instead of injecting a duplicate', () => {
      const scene = {
        sceneNumber: 1,
        heading: 'INT. CATHEDRAL NAVE - NIGHT',
        beats: [
          {
            beatId: 'bt_open',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription:
              'Moonlight slants through towering stained-glass windows across the empty stone nave.',
            beatDirection: {
              castInFrame: [],
              shotType: 'Wide Shot',
              frozenMoment: 'Moonlight slants across the empty stone cathedral nave.',
              transition: 'CUT',
              generatedBy: 'llm',
            },
          },
          {
            beatId: 'bt_d1',
            sequenceIndex: 1,
            kind: 'dialogue',
            character: 'ELENA',
            line: '[whispering] Are you still here?',
          },
        ] satisfies SceneBeat[],
      }

      const res = ensureSceneHasEstablishingShot(scene, null, 0)
      expect(res.injected).toBe(false)
      expect(res.tagged).toBe(true)

      const beats = res.scene.beats as SceneBeat[]
      expect(beats).toHaveLength(2)
      expect(beats[0].beatId).toBe('bt_open')
      expect(beats[0].beatRole).toBe('establishing')
    })

    it('prepends an establishing shot when Beat 0 on a location change is a tight Close-Up or Insert', () => {
      const prevScene = {
        sceneNumber: 1,
        heading: 'INT. CORRIDOR - NIGHT',
        beats: [
          {
            beatId: 'bt_1',
            sequenceIndex: 0,
            kind: 'action',
            beatRole: 'establishing',
            actionDescription: 'Wide shot of the corridor.',
          },
        ],
      }
      const nextScene = {
        sceneNumber: 2,
        heading: 'INT. REACTOR CHAMBER - NIGHT',
        beats: [
          {
            beatId: 'bt_cu',
            sequenceIndex: 0,
            kind: 'action',
            actionDescription: 'Extreme close-up on a cracked pressure gauge needle hitting red.',
            beatDirection: {
              castInFrame: [],
              shotType: 'Extreme Close-Up',
              frozenMoment: 'Cracked pressure gauge needle pinned in the red zone.',
              transition: 'CUT',
              generatedBy: 'llm',
            },
          },
        ] satisfies SceneBeat[],
      }

      expect(isBeatEstablishingShot(nextScene.beats[0], true)).toBe(false)
      const res = ensureSceneHasEstablishingShot(nextScene, prevScene, 1)
      expect(res.injected).toBe(true)
      const beats = res.scene.beats as SceneBeat[]
      expect(beats).toHaveLength(2)
      expect(beats[0].beatRole).toBe('establishing')
      expect(beats[1].beatId).toBe('bt_cu')
    })

    it('walks a multi-scene script and only injects where location/time changes', () => {
      const scenes = [
        {
          sceneNumber: 1,
          heading: 'INT. COMMAND BRIDGE - NIGHT',
          beats: [
            {
              beatId: 's1_d1',
              sequenceIndex: 0,
              kind: 'dialogue',
              character: 'CAPTAIN',
              line: '[stern] Hold course.',
            },
          ],
        },
        {
          sceneNumber: 2,
          heading: 'INT. COMMAND BRIDGE - CONTINUOUS',
          beats: [
            {
              beatId: 's2_d1',
              sequenceIndex: 0,
              kind: 'dialogue',
              character: 'HELMSMAN',
              line: '[tense] Engines responding.',
            },
          ],
        },
        {
          sceneNumber: 3,
          heading: 'EXT. LUNAR CRATER RIM - NIGHT',
          beats: [
            {
              beatId: 's3_d1',
              sequenceIndex: 0,
              kind: 'dialogue',
              character: 'SCOUT',
              line: '[awestruck] I see the beacon.',
            },
          ],
        },
      ]

      const result = ensureEstablishingShotsAcrossScenes(scenes)
      expect(result.injectedCount).toBe(2) // Scene 1 (opening) and Scene 3 (new location), NOT Scene 2 (continuous)
      expect((result.scenes[0].beats as SceneBeat[])[0].beatRole).toBe('establishing')
      expect(result.scenes[1].beats as SceneBeat[]).toHaveLength(1)
      expect((result.scenes[2].beats as SceneBeat[])[0].beatRole).toBe('establishing')
    })
  })

  describe('parseLlmBeats & dedupeRedundantActionBeats preservation', () => {
    it('preserves beatRole from LLM output and auto-tags Beat 0 establishing shotType', () => {
      const parsed = parseLlmBeats([
        {
          kind: 'action',
          actionDescription: 'Wide establishing shot of the neon-lit alley.',
          beatDirection: {
            castInFrame: [],
            shotType: 'Wide Establishing Shot',
            frozenMoment: 'Rain-slicked neon alley at midnight.',
            transition: 'CUT',
          },
        },
      ])
      expect(parsed[0].beatRole).toBe('establishing')
    })

    it('never strips a Beat 0 establishing shot in dedupeRedundantActionBeats even with lexical overlap', () => {
      const beats: SceneBeat[] = [
        {
          beatId: 'bt_est',
          sequenceIndex: 0,
          kind: 'action',
          beatRole: 'establishing',
          actionDescription: 'Elena stands at the rain-streaked glass table in the penthouse.',
          beatDirection: {
            castInFrame: ['Elena'],
            shotType: 'Wide Establishing Shot',
          },
        },
        {
          beatId: 'bt_dlg',
          sequenceIndex: 1,
          kind: 'dialogue',
          character: 'ELENA',
          line: '[quiet] Look at this rain-streaked glass table in the penthouse.',
        },
      ]

      const deduped = dedupeRedundantActionBeats(beats)
      expect(deduped).toHaveLength(2)
      expect(deduped[0].beatId).toBe('bt_est')
    })

    it('preserves user exclusion (beat.excluded = true) on an establishing shot through ensureSceneBeats', () => {
      const estBeat = buildEstablishingActionBeatForScene({
        heading: 'EXT. DESERT OUTPOST - DAY',
      })
      const scene = {
        heading: 'EXT. DESERT OUTPOST - DAY',
        beats: [
          { ...estBeat, excluded: true },
          {
            beatId: 'bt_dlg',
            sequenceIndex: 1,
            kind: 'dialogue',
            character: 'ELENA',
            line: '[calm] We made it.',
          },
        ],
      }

      const ensured = ensureSceneBeats(scene)
      const beats = ensured.beats as SceneBeat[]
      expect(beats[0].beatRole).toBe('establishing')
      expect(beats[0].excluded).toBe(true)
    })
  })

  describe('runScriptQA & autoFixScript integration', () => {
    it('flags a scene that changes location without an establishing shot and auto-fixes it', () => {
      const scenes = [
        {
          sceneNumber: 1,
          heading: 'INT. BRIEFING ROOM - DAY',
          action: 'Wide establishing shot of the briefing room.',
          duration: 60,
          beats: [
            {
              beatId: 'b1',
              sequenceIndex: 0,
              kind: 'action' as const,
              beatRole: 'establishing',
              actionDescription: 'Wide establishing shot of the briefing room.',
            },
            {
              beatId: 'b2',
              sequenceIndex: 1,
              kind: 'dialogue' as const,
              character: 'ELENA',
              line: '[serious] The coordinates are locked.',
            },
          ],
          dialogue: [{ character: 'ELENA', line: '[serious] The coordinates are locked.' }],
        },
        {
          sceneNumber: 2,
          heading: 'EXT. ARCTIC ICE SHELF - DAY',
          action: 'Elena checks her compass.',
          duration: 60,
          beats: [
            {
              beatId: 'b3',
              sequenceIndex: 0,
              kind: 'dialogue' as const,
              character: 'ELENA',
              line: '[shivering] Zero visibility ahead.',
            },
          ],
          dialogue: [{ character: 'ELENA', line: '[shivering] Zero visibility ahead.' }],
        },
      ]

      const qa = runScriptQA(scenes, [{ name: 'Elena' }])
      const estIssue = qa.issues.find((i) =>
        i.message.includes('without an opening establishing shot beat')
      )
      expect(estIssue).toBeDefined()
      expect(estIssue?.sceneIndex).toBe(1)
      expect(estIssue?.autoFixable).toBe(true)

      const fixed = autoFixScript(scenes, [{ name: 'Elena' }], qa)
      expect(fixed.fixedCount).toBeGreaterThanOrEqual(1)
      expect(fixed.scenes[1].beats?.[0]?.kind).toBe('action')
      expect(fixed.scenes[1].beats?.[0]?.beatRole).toBe('establishing')
    })
  })
})

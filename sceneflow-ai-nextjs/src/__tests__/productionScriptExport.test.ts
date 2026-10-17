import { describe, expect, it } from 'vitest'
import {
  buildProductionScriptData,
  exportScriptByFormat,
  exportToFDX,
  exportToFountain,
  exportToJSON,
  exportToMarkdown,
  exportToText,
  visionPhaseToScriptData,
} from '@/lib/script/scriptExporter'

describe('Production Stage Script Export', () => {
  const sampleCharacters = [
    {
      id: 'char-kael',
      name: 'Kael Vance',
      role: 'protagonist',
      description: 'Former orbital salvage engineer haunted by the Europa signal.',
      appearanceDescription: '30s, weathered skin, cybernetic left iris.',
      defaultWardrobe: 'Standard EVA utility jumpsuit',
      wardrobes: [
        {
          id: 'ward-1',
          name: 'Thermal Trench Coat',
          description: 'Heavy charcoal coat with reflective collar',
          accessories: 'Wrist dosimeter, cracked data slate',
          appearanceNotes: 'Frost buildup on shoulders in exterior shots',
          isDefault: true,
          sceneNumbers: [1, 2],
        },
      ],
    },
    {
      id: 'char-mira',
      name: 'Dr. Mira Solis',
      role: 'supporting',
      description: 'Astrophysicist decoding the deep-ice resonance.',
      defaultWardrobe: 'Cryo-lab tunic',
      wardrobes: [
        {
          id: 'ward-2',
          name: 'Field Hazard Suit',
          description: 'High-visibility amber suit with helmet visor',
          sceneNumbers: [1],
        },
      ],
    },
  ]

  const sampleBlueprintBeats = [
    {
      title: 'The Signal Beneath the Ice',
      intent: 'Establish the eerie discovery at Outpost Nine',
      synopsis: 'Kael and Mira uncover an ancient transmitter buried under the glacier.',
      minutes: 4,
    },
  ]

  const sampleScenes = [
    {
      id: 'scene-1',
      sceneNumber: 1,
      blueprintBeatIndex: 0,
      blueprintBeatTitle: 'The Signal Beneath the Ice',
      heading: 'EXT. EUROPA GLACIER TRENCH - NIGHT',
      visualDescription: 'A vast chasm of bioluminescent blue ice under Jupiter.',
      narration: 'Beneath twenty kilometers of ice, something was still broadcasting.',
      duration: 14,
      sceneDirection: {
        sceneDescription:
          'Kael and Mira descend into the glacial fissure as the sub-ice beacon pulses to life.',
        scene: {
          location: 'Europa Sub-Surface Fissure',
          atmosphere: 'Sub-zero mist, eerie indigo glow, claustrophobic canyon walls',
          keyProps: ['Sub-surface resonance beacon', 'Ice tether winch'],
        },
        camera: {
          shots: ['Wide Establishing', 'Medium Two-Shot'],
          angle: 'Low angle looking up at Jupiter',
          movement: 'Slow crane descent into trench',
          lensChoice: '24mm Anamorphic',
          focus: 'Rack focus from frost crystals to beacon core',
        },
        lighting: {
          overallMood: 'Cold sci-fi noir',
          timeOfDay: 'Eternal orbital night',
          keyLight: 'Pulsing cyan glow from buried transmitter',
          fillLight: 'Helmet LED bounce off ice walls',
          colorTemperature: '3200K amber visors vs 7500K ice',
        },
        talent: {
          blocking: 'Kael leads down the ice ledge; Mira scans with the telemetry rig',
          keyActions: ['Brushing frost from alien glyph', 'Activating signal decoder'],
          emotionalBeat: 'Awe mixed with rising dread',
        },
        audio: {
          priorities: 'Clean helmet comms over low-frequency ice groans',
          considerations: 'Sub-bass pulse synced to beacon light',
        },
      },
      beatsMigratedAt: '2026-10-18T00:00:00.000Z',
      beats: [
        {
          beatId: 'beat-1',
          sequenceIndex: 0,
          kind: 'dialogue',
          character: 'KAEL VANCE',
          characterId: 'char-kael',
          voiceDirection: 'over helmet comm, breathless',
          line: 'Mira, check the frequency. That is not natural seismic noise.',
          actionDescription:
            'Kael rappels onto the narrow ice shelf and wipes frost off the beacon lens.',
          durationSeconds: 8,
          referenceSelection: {
            characterIds: ['char-kael', 'char-mira'],
            objectRefIds: [],
            characterWardrobes: [
              { characterId: 'char-kael', wardrobeId: 'ward-1' },
              { characterId: 'char-mira', wardrobeId: 'ward-2' },
            ],
          },
          beatDirection: {
            shotType: 'Wide Shot',
            cameraAngle: 'Low Angle',
            cameraMovement: 'Slow Crane Down',
            transition: 'CUT',
            frozenMoment: 'Kael’s gloved hand hovering inches above the glowing cyan core.',
            castInFrame: ['Kael Vance', 'Dr. Mira Solis'],
            blocking: 'Kael kneels foreground left; Mira stands on ridge background right.',
            spatialRelationship: 'Separated by a glowing fissure of thin ice.',
            emotion: 'Tense realization',
            gaze: 'Kael looks down at the core, then up toward Mira.',
            lightingAccent: 'Sharp cyan rim light on Kael’s visor',
            keyProps: ['Resonance beacon', 'Cracked data slate'],
            propInteraction: 'Kael holds the data slate against the beacon surface.',
            lensEnergy: '24mm anamorphic, slow handheld tension',
            audioCue: 'Deep metallic hum followed by a crystalline chime',
          },
        },
        {
          beatId: 'beat-2',
          sequenceIndex: 1,
          kind: 'narration',
          character: 'KAEL',
          voiceDirection: 'low, reflective V.O.',
          line: 'We were told Outpost Nine went dark forty years ago.',
          durationSeconds: 6,
          beatDirection: {
            shotType: 'Extreme Close-Up',
            cameraAngle: 'Eye-Level',
            cameraMovement: 'Static',
            frozenMoment: 'Reflection of pulsing alien glyphs across Kael’s visor.',
            castInFrame: ['Kael Vance'],
          },
        },
      ],
    },
  ]

  it('extracts characters & wardrobe, chapters, scene descriptions, scene direction, shot direction, and shot dialogue/action', () => {
    const scriptData = buildProductionScriptData({
      projectTitle: 'Europa Echo',
      projectLogline: 'Two researchers discover an ancient signal beneath the ice of Europa.',
      script: { metadata: { author: 'Brian Anderson' } },
      scenes: sampleScenes,
      characters: sampleCharacters,
      blueprintBeats: sampleBlueprintBeats,
    })

    // 1. Characters & Wardrobe
    expect(scriptData.characters).toHaveLength(2)
    expect(scriptData.characters?.[0].name).toBe('Kael Vance')
    expect(scriptData.characters?.[0].wardrobes).toHaveLength(1)
    expect(scriptData.characters?.[0].wardrobes?.[0].name).toBe('Thermal Trench Coat')
    expect(scriptData.characters?.[0].wardrobes?.[0].accessories).toContain('Wrist dosimeter')

    // 2. Chapter Descriptions
    expect(scriptData.chapters).toHaveLength(1)
    expect(scriptData.chapters?.[0].chapterHeading).toBe('Chapter One')
    expect(scriptData.chapters?.[0].title).toBe('The Signal Beneath the Ice')
    expect(scriptData.chapters?.[0].description).toContain(
      'ancient transmitter buried under the glacier'
    )

    // 3. Scene Descriptions & Scene Direction
    const scene = scriptData.scenes[0]
    expect(scene.chapter?.title).toBe('The Signal Beneath the Ice')
    expect(scene.sceneDescription).toContain('Kael and Mira descend into the glacial fissure')
    expect(scene.sceneDirection?.location).toContain('Europa Sub-Surface Fissure')
    expect(scene.sceneDirection?.camera).toContain('24mm Anamorphic')
    expect(scene.sceneDirection?.lighting).toContain('Cold sci-fi noir')
    expect(scene.sceneDirection?.talent).toContain('Awe mixed with rising dread')
    expect(scene.sceneDirection?.audio).toContain('Clean helmet comms')

    // 4. Shot Direction & Shot Dialogue/Action
    expect(scene.shots).toHaveLength(2)
    const shot = scene.shots?.[0]!
    expect(shot.shotNumber).toBe(1)
    expect(shot.kind).toBe('dialogue')
    expect(shot.shotDirection?.cameraSummary).toContain('Wide Shot')
    expect(shot.shotDirection?.stillDescription).toContain('gloved hand hovering inches above')
    expect(shot.shotDirection?.castWardrobes).toEqual([
      {
        characterName: 'Kael Vance',
        wardrobeName: 'Thermal Trench Coat',
        description: 'Heavy charcoal coat with reflective collar',
      },
      {
        characterName: 'Dr. Mira Solis',
        wardrobeName: 'Field Hazard Suit',
        description: 'High-visibility amber suit with helmet visor',
      },
    ])
    expect(shot.shotDirection?.blocking).toContain('Kael kneels foreground left')
    expect(shot.shotDirection?.emotion).toBe('Tense realization')
    expect(shot.shotDirection?.lighting).toContain('Sharp cyan rim light')
    expect(shot.shotDirection?.audio).toContain('Deep metallic hum')

    // 5. Shot Dialogue & Action lines
    expect(shot.actionDescription).toContain('Kael rappels onto the narrow ice shelf')
    expect(shot.character).toBe('KAEL VANCE')
    expect(shot.voiceDirection).toBe('over helmet comm, breathless')
    expect(shot.line).toContain('That is not natural seismic noise')
  })

  it('formats readable Plain Text, Markdown, Fountain, Final Draft (.fdx), and JSON with all production sections', () => {
    const scriptData = visionPhaseToScriptData(
      {
        title: 'Europa Echo',
        logline: 'Two researchers discover an ancient signal beneath the ice of Europa.',
        characters: sampleCharacters,
        scenes: sampleScenes,
        blueprintBeats: sampleBlueprintBeats,
      },
      'Europa Echo'
    )

    // Plain Text
    const txt = exportToText(scriptData)
    expect(txt).toContain('CHARACTERS & WARDROBE')
    expect(txt).toContain('Kael Vance (protagonist)')
    expect(txt).toContain('Thermal Trench Coat')
    expect(txt).toContain('CHAPTER ONE — THE SIGNAL BENEATH THE ICE')
    expect(txt).toContain('SCENE DIRECTION:')
    expect(txt).toContain('[SHOT 1 • DIALOGUE')
    expect(txt).toContain('That is not natural seismic noise.')

    // Markdown
    const md = exportToMarkdown(scriptData)
    expect(md).toContain('# Europa Echo')
    expect(md).toContain('## Characters & Wardrobe')
    expect(md).toContain('### Kael Vance *(protagonist)*')
    expect(md).toContain('## Chapter One: The Signal Beneath the Ice')
    expect(md).toContain('##### Shot 1 [DIALOGUE]')
    expect(md).toContain('**KAEL VANCE** *(over helmet comm, breathless)*')

    // Fountain
    const fountain = exportToFountain(scriptData)
    expect(fountain).toContain('Title: Europa Echo')
    expect(fountain).toContain('# CHAPTER ONE: THE SIGNAL BENEATH THE ICE')
    expect(fountain).toContain('EUROPA GLACIER TRENCH - NIGHT #1#')
    expect(fountain).toContain('KAEL VANCE')
    expect(fountain).toContain('(over helmet comm, breathless)')

    // Final Draft (.fdx)
    const fdx = exportToFDX(scriptData)
    expect(fdx).toContain('<?xml version="1.0" encoding="UTF-8"')
    expect(fdx).toContain('<FinalDraft DocumentType="Script"')
    expect(fdx).toContain('<Paragraph Type="Scene Heading"')
    expect(fdx).toContain('<Paragraph Type="Shot">')
    expect(fdx).toContain('<Paragraph Type="Character">')
    expect(fdx).toContain('<Paragraph Type="Parenthetical">')
    expect(fdx).toContain('<Paragraph Type="Dialogue">')

    // JSON
    const jsonRaw = exportToJSON(scriptData)
    const parsed = JSON.parse(jsonRaw)
    expect(parsed.title).toBe('Europa Echo')
    expect(parsed.characters).toHaveLength(2)
    expect(parsed.chapters).toHaveLength(1)
    expect(parsed.scenes[0].shots).toHaveLength(2)
  })

  it('respects section filter options when exporting', () => {
    const scriptData = buildProductionScriptData({
      projectTitle: 'Europa Echo',
      scenes: sampleScenes,
      characters: sampleCharacters,
      blueprintBeats: sampleBlueprintBeats,
    })

    const { content: screenplayOnlyTxt } = exportScriptByFormat(scriptData, 'text', {
      includeCharacterList: false,
      includeChapters: false,
      includeSceneDescriptions: true,
      includeSceneDirection: false,
      includeShotDirection: false,
      includeShotActionDialogue: true,
    })

    expect(screenplayOnlyTxt).not.toContain('CHARACTERS & WARDROBE')
    expect(screenplayOnlyTxt).not.toContain('SCENE DIRECTION:')
    expect(screenplayOnlyTxt).not.toContain('Still:')
    expect(screenplayOnlyTxt).toContain('That is not natural seismic noise.')
  })
})

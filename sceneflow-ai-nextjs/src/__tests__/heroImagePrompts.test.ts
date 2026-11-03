import { describe, it, expect } from 'vitest'
import {
  POSTER_SHOT_TYPES,
  deriveHeroPromptPreset,
  buildHeroImagePrompt,
  resolveHeroContinuityReferences,
  type HeroPromptBlueprintInput,
  type PosterShotTypeId,
} from '@/lib/treatment/heroImagePrompts'
import type { SharedContinuitySource } from '@/lib/blueprint/blueprintContinuity'

const SAMPLE_BLUEPRINT: HeroPromptBlueprintInput = {
  title: 'Inverted Echo',
  logline:
    'A disgraced acoustic physicist must infiltrate a subterranean resonance vault before her former mentor weaponizes citywide infrasound.',
  synopsis:
    'Dr. Mara Vance discovers that the Catenary Nine transit array is a planetary tuning fork built by Director Julian Kael.',
  genre: 'Sci-Fi Thriller',
  setting: 'Subterranean Catenary Nine Resonance Vault beneath Neo-Zurich',
  tone: 'Dark, tense, cerebral noir',
  themes: ['Truth vs Control', 'Acoustic Memory', 'Betrayal'],
  visual_style: 'Anamorphic rain-slicked industrial noir with copper and cyan practicals',
  artStyle: 'photorealistic',
  aspectRatio: '2.39:1',
  protagonist: 'Dr. Mara Vance',
  antagonist: 'Director Julian Kael',
  opening_hook:
    'Mara sprints across the shattering glass catwalk as an infrasonic shockwave implodes the turbine ring behind her.',
  character_descriptions: [
    {
      name: 'Dr. Mara Vance',
      role: 'protagonist',
      ethnicity: 'East Asian',
      build: 'lean athletic',
      hairColor: 'jet-black',
      hairStyle: 'shoulder-length asymmetrical bob',
      eyeColor: 'dark amber',
      keyFeature: 'thin silver cochlear scar behind left ear',
      defaultWardrobe: 'charcoal acoustic-shielded trench coat over slate field vest',
      wardrobeAccessories: 'brass bone-conduction headset',
      externalGoal: 'shut down the Catenary Nine primary resonator',
      internalNeed: 'forgive herself for the Zurich Lab collapse',
      fatalFlaw: 'obsessive self-reliance',
      arcStartingState: 'isolated and hunted fugitive scientist',
    },
    {
      name: 'Director Julian Kael',
      role: 'antagonist',
      ethnicity: 'Northern European',
      build: 'tall imposing',
      hairColor: 'silver-white',
      hairStyle: 'swept-back',
      eyeColor: 'ice-blue',
      defaultWardrobe: 'tailored obsidian mandarin-collar overcoat',
      externalGoal: 'trigger the global harmonic lock',
    },
    {
      name: 'Soren Reyes',
      role: 'supporting',
      ethnicity: 'Latino',
      defaultWardrobe: 'oil-stained tunnel engineer coveralls',
      description: 'Underground transit signalman and Mara’s sole ally',
    },
    {
      name: 'Archivist Nyx',
      role: 'supporting',
      ethnicity: 'South Asian',
      defaultWardrobe: 'ivory cleanroom shroud',
      description: 'Keeper of the analog frequency cylinders',
    },
  ],
  scene_descriptions: [
    {
      id: 'loc-vault',
      name: 'Catenary Nine Resonance Vault',
      type: 'INT',
      location: 'Cavernous brutalist acoustic chamber suspended over subterranean floodwaters',
      atmosphere: 'Low-frequency mist, suspended water droplets, amber sodium beacons',
      furniture_props: 'Giant bronze parabolic dishes, analog oscilloscope consoles',
    },
  ],
  prop_descriptions: [
    {
      id: 'prop-fork',
      name: 'Harmonic Core Cylinder',
      category: 'technology',
      description: 'Etched iridium-glass cylinder glowing with standing golden soundwaves',
      significance: 'The master key capable of neutralizing or amplifying the Catenary array',
      importance: 'critical',
    },
  ],
  beats: [
    {
      title: 'The Sub-Bass Breach',
      intent: 'Establish stakes',
      synopsis: 'Mara infiltrates the flooded intake tunnel.',
    },
    {
      title: 'Catwalk Shockwave Clash',
      intent: 'Midpoint action peak',
      synopsis:
        'Mara leaps across the collapsing bronze gantry while Julian fires the primary infrasonic cannon, shattering the observation dome.',
    },
  ],
}

const SAMPLE_CONTINUITY_SOURCE: SharedContinuitySource = {
  seriesId: 'b3da87a2-dac3-4de7-9f68-ab5d9ac67f85',
  seriesTitle: 'Catenary Nine',
  bibleCharacters: [
    {
      id: 'char-mara',
      name: 'Dr. Mara Vance',
      role: 'protagonist',
      referenceImage: 'https://storage.googleapis.com/sceneflow/cast/mara-vance.png',
    },
    {
      id: 'char-julian',
      name: 'Director Julian Kael',
      role: 'antagonist',
      referenceImage: 'https://storage.googleapis.com/sceneflow/cast/julian-kael.png',
    },
    {
      id: 'char-soren',
      name: 'Soren Reyes',
      role: 'supporting',
      referenceImage: 'https://storage.googleapis.com/sceneflow/cast/soren-reyes.png',
    },
  ],
  bibleLocations: [
    {
      id: 'loc-vault',
      name: 'Catenary Nine Resonance Vault',
      referenceImage: 'https://storage.googleapis.com/sceneflow/locations/resonance-vault.png',
    },
  ],
  bibleProps: [
    {
      id: 'prop-fork',
      name: 'Harmonic Core Cylinder',
      referenceImage: 'https://storage.googleapis.com/sceneflow/props/harmonic-cylinder.png',
      importance: 'critical',
    },
  ],
}

describe('Blueprint Hero Image Prompts & Continuity Integration', () => {
  it('defines all 8 required poster shot types with exact titles and descriptions', () => {
    const expected: Array<{ id: PosterShotTypeId; name: string; description: string }> = [
      {
        id: 'hero-portrait',
        name: 'Hero Portrait',
        description: 'Single character dominant, dramatic pose',
      },
      {
        id: 'ensemble',
        name: 'Ensemble Shot',
        description: 'Multiple characters arranged cinematically',
      },
      {
        id: 'dramatic-silhouette',
        name: 'Dramatic Silhouette',
        description: 'Backlit figure, mysterious mood',
      },
      {
        id: 'key-art',
        name: 'Key Art',
        description: 'Iconic imagery representing the story',
      },
      {
        id: 'environment-hero',
        name: 'Environment Hero',
        description: 'Setting as main focus with character integration',
      },
      {
        id: 'confrontation',
        name: 'Confrontation',
        description: 'Hero vs antagonist visual tension',
      },
      {
        id: 'action-moment',
        name: 'Action Moment',
        description: 'Frozen peak action sequence',
      },
      {
        id: 'intimate-portrait',
        name: 'Intimate Portrait',
        description: 'Close emotional character study',
      },
    ]

    expect(POSTER_SHOT_TYPES.map((t) => ({ id: t.id, name: t.name, description: t.description }))).toEqual(
      expected
    )
  })

  it('produces distinct, tailored prompts for each of the 8 poster shot types matching the current Blueprint', () => {
    const promptsByType = new Map<PosterShotTypeId, string>()

    for (const shotType of POSTER_SHOT_TYPES) {
      const derived = deriveHeroPromptPreset({
        treatment: SAMPLE_BLUEPRINT,
        posterType: shotType.id,
      })
      const prompt = buildHeroImagePrompt({
        treatment: SAMPLE_BLUEPRINT,
        structure: derived.structure,
      })
      promptsByType.set(shotType.id, prompt)

      // Every prompt must include the composition layer, subject layer, environment layer, lighting layer, and cinematography layer
      expect(prompt).toContain(`(Composition — ${shotType.name}):`)
      expect(prompt).toContain('(Subject):')
      expect(prompt).toContain('(Environment):')
      expect(prompt).toContain('(Lighting/Mood):')
      expect(prompt).toContain('(Cinematography):')
    }

    // All 8 prompts must be distinct
    const uniquePrompts = new Set(promptsByType.values())
    expect(uniquePrompts.size).toBe(8)

    // 1. Hero Portrait: single dominant character, low-angle, SINGLE SUBJECT ONLY
    const heroPortrait = promptsByType.get('hero-portrait')!
    expect(heroPortrait).toContain('SINGLE SUBJECT ONLY: Feature ONLY Dr. Mara Vance')
    expect(heroPortrait).toContain('charcoal acoustic-shielded trench coat')
    expect(heroPortrait).toContain('heroic low-angle perspective')

    // 2. Ensemble Shot: multiple characters arranged cinematically in tiered depth planes
    const ensemble = promptsByType.get('ensemble')!
    expect(ensemble).toContain('SUBJECT COUNT: Feature EXACTLY 4 characters')
    expect(ensemble).toContain('Dr. Mara Vance')
    expect(ensemble).toContain('Director Julian Kael')
    expect(ensemble).toContain('Soren Reyes')
    expect(ensemble).toContain('Archivist Nyx')
    expect(ensemble).toContain('tiered depth planes')

    // 3. Dramatic Silhouette: backlit figure, mysterious mood
    const silhouette = promptsByType.get('dramatic-silhouette')!
    expect(silhouette).toContain('High-Contrast Chiaroscuro Silhouette Key Art')
    expect(silhouette).toContain('contra-jour backlighting')
    expect(silhouette).toContain('mysterious, enigmatic, and shadow-drenched atmosphere')

    // 4. Key Art: iconic imagery representing the story (central prop + themes)
    const keyArt = promptsByType.get('key-art')!
    expect(keyArt).toContain('Iconic Symbolic Theatrical Key Art')
    expect(keyArt).toContain('Harmonic Core Cylinder')
    expect(keyArt).toContain('Truth vs Control')

    // 5. Environment Hero: setting as main focus (75%+) with character integration
    const envHero = promptsByType.get('environment-hero')!
    expect(envHero).toContain('75%+ of the frame')
    expect(envHero).toContain('Subterranean Catenary Nine Resonance Vault')
    expect(envHero).toContain('Low-frequency mist')

    // 6. Confrontation: Hero vs antagonist visual tension
    const confrontation = promptsByType.get('confrontation')!
    expect(confrontation).toContain('SUBJECT COUNT: Feature EXACTLY 2 characters (Dr. Mara Vance, Director Julian Kael)')
    expect(confrontation).toContain('split-plane confrontation')
    expect(confrontation).toContain('Dutch-angle')

    // 7. Action Moment: Frozen peak action sequence from Blueprint beats/hook
    const actionMoment = promptsByType.get('action-moment')!
    expect(actionMoment).toContain('Frozen Peak Kinetic Action Key Art')
    expect(actionMoment).toContain('Mara leaps across the collapsing bronze gantry')

    // 8. Intimate Portrait: Close emotional character study (85mm shallow DOF + internalNeed)
    const intimate = promptsByType.get('intimate-portrait')!
    expect(intimate).toContain('85mm f/1.4')
    expect(intimate).toContain('forgive herself for the Zurich Lab collapse')
    expect(intimate).toContain('soft diffused Rembrandt key lighting')
  })

  it('updates prompt dynamically when the current Blueprint is modified', () => {
    const updatedBlueprint: HeroPromptBlueprintInput = {
      ...SAMPLE_BLUEPRINT,
      title: 'Solaris Reef',
      setting: 'Bioluminescent Coral Observatory beneath the Pacific Trench',
      protagonist: 'Captain Elena Rostova',
      character_descriptions: [
        {
          name: 'Captain Elena Rostova',
          role: 'protagonist',
          defaultWardrobe: 'titanium deep-sea exo-suit with cobalt visor',
          externalGoal: 'seal the thermal rift before the trench collapses',
        },
      ],
    }

    const derived = deriveHeroPromptPreset({
      treatment: updatedBlueprint,
      posterType: 'hero-portrait',
    })
    const prompt = buildHeroImagePrompt({
      treatment: updatedBlueprint,
      structure: derived.structure,
    })

    expect(prompt).toContain('Captain Elena Rostova')
    expect(prompt).toContain('titanium deep-sea exo-suit')
    expect(prompt).toContain('Bioluminescent Coral Observatory beneath the Pacific Trench')
    expect(prompt).not.toContain('Dr. Mara Vance')
  })

  it('resolves Continuity Library reference images for characters, locations, and props per posterType', () => {
    // 1. Confrontation attaches Protagonist + Antagonist + Location + Prop references
    const confrontationRefs = resolveHeroContinuityReferences({
      treatment: SAMPLE_BLUEPRINT,
      posterType: 'confrontation',
      sharedContinuitySource: SAMPLE_CONTINUITY_SOURCE,
    })

    expect(confrontationRefs.referenceImages.length).toBe(4)
    expect(confrontationRefs.referenceImages[0].imageUrl).toContain('mara-vance.png')
    expect(confrontationRefs.referenceImages[1].imageUrl).toContain('julian-kael.png')
    expect(confrontationRefs.referenceImages[2].imageUrl).toContain('resonance-vault.png')
    expect(confrontationRefs.referenceImages[3].imageUrl).toContain('harmonic-cylinder.png')
    expect(confrontationRefs.referenceBindingPromptBlock).toContain('[CONTINUITY LIBRARY REFERENCES]')
    expect(confrontationRefs.referenceBindingPromptBlock).toContain('Dr. Mara Vance')
    expect(confrontationRefs.referenceBindingPromptBlock).toContain('Director Julian Kael')

    // 2. Environment Hero places Location reference first
    const envHeroRefs = resolveHeroContinuityReferences({
      treatment: SAMPLE_BLUEPRINT,
      posterType: 'environment-hero',
      sharedContinuitySource: SAMPLE_CONTINUITY_SOURCE,
    })
    expect(envHeroRefs.referenceImages[0].imageUrl).toContain('resonance-vault.png')
    expect(envHeroRefs.referenceImages[0].subjectDescription).toContain('Primary environment & architecture reference')

    // 3. Key Art places Central Symbolic Prop reference first alongside protagonist
    const keyArtRefs = resolveHeroContinuityReferences({
      treatment: SAMPLE_BLUEPRINT,
      posterType: 'key-art',
      sharedContinuitySource: SAMPLE_CONTINUITY_SOURCE,
    })
    expect(keyArtRefs.referenceImages[0].imageUrl).toContain('harmonic-cylinder.png')
    expect(keyArtRefs.referenceImages[1].imageUrl).toContain('mara-vance.png')

    // 4. Ensemble attaches all available cast references
    const ensembleRefs = resolveHeroContinuityReferences({
      treatment: SAMPLE_BLUEPRINT,
      posterType: 'ensemble',
      sharedContinuitySource: SAMPLE_CONTINUITY_SOURCE,
    })
    const ensembleUrls = ensembleRefs.referenceImages.map((r) => r.imageUrl)
    expect(ensembleUrls).toContain('https://storage.googleapis.com/sceneflow/cast/mara-vance.png')
    expect(ensembleUrls).toContain('https://storage.googleapis.com/sceneflow/cast/julian-kael.png')
    expect(ensembleUrls).toContain('https://storage.googleapis.com/sceneflow/cast/soren-reyes.png')
  })
})

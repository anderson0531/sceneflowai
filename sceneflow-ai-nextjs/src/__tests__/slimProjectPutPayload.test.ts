import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { calculateBase64Size } from '@/lib/storage/mediaStorage'
import {
  compactProjectPutAck,
  fitProjectPutPayload,
  fitProjectResponseMetadata,
  projectPutWouldExceedBodyLimit,
  slimProjectPutPayload,
  slimProjectResponseMetadata,
  splitScriptPutIntoFittingBatches,
  stringifyProjectPut,
  visionPhasePut,
  VERCEL_FUNCTION_BODY_LIMIT_BYTES,
  VERCEL_FUNCTION_RESPONSE_BUDGET_BYTES,
} from '@/lib/projects/slimProjectPutPayload'

const scenes = [
  { id: 'sc_1', beats: [{ beatId: 'bt_1', storyboardImagePrompt: 'Wide shot.' }] },
]

function fullMetadata() {
  return {
    lookbook: { title: 'The Vault' },
    visionPhase: {
      script: { script: { scenes } },
      scenes,
      production: {
        scenes: {
          sc_1: {
            segments: [
              {
                takes: [{ assetUrl: 'https://blob.example/take.mp4' }],
              },
            ],
          },
        },
      },
      characters: [{ name: 'Piper Hayes' }],
    },
  }
}

describe('slimProjectPutPayload', () => {
  it('drops the production blob and the legacy scene mirror', () => {
    const slimmed = slimProjectPutPayload({ metadata: fullMetadata() })

    expect(slimmed.persistProduction).toBeUndefined()
    expect(slimmed.metadata?.visionPhase.production).toBeUndefined()
    expect(slimmed.metadata?.visionPhase.scenes).toBeUndefined()
    expect(slimmed.metadata?.visionPhase.script.script.scenes).toEqual(scenes)
    expect(slimmed.metadata?.visionPhase.characters).toEqual([{ name: 'Piper Hayes' }])
    expect(slimmed.metadata?.lookbook).toEqual({ title: 'The Vault' })
  })

  it('keeps production when the caller actually rewrote it', () => {
    const metadata = fullMetadata()
    const slimmed = slimProjectPutPayload({
      metadata,
      persistProduction: true,
    })

    expect(slimmed.metadata?.visionPhase.production).toEqual(
      metadata.visionPhase.production
    )
    expect(slimmed.persistProduction).toBeUndefined()
  })

  it('strips a base64 image that would 413 on its own', () => {
    const slimmed = slimProjectPutPayload({
      metadata: {
        visionPhase: {
          characters: [
            {
              name: 'Piper Hayes',
              referenceImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=',
            },
          ],
        },
      },
    })

    expect(slimmed.metadata?.visionPhase.characters[0].referenceImage).toBe('deferred')
  })

  it('leaves a body without metadata untouched', () => {
    expect(slimProjectPutPayload({ title: 'The Vault' })).toEqual({ title: 'The Vault' })
  })

  it('knows when a body is large enough for Vercel to 413 it', () => {
    expect(projectPutWouldExceedBodyLimit({ small: true })).toBe(false)
    const oversized = 'x'.repeat(VERCEL_FUNCTION_BODY_LIMIT_BYTES)
    expect(projectPutWouldExceedBodyLimit({ blob: oversized })).toBe(true)
  })
})

describe('vision page slims every project PUT', () => {
  const page = readFileSync(
    join(process.cwd(), 'src/app/dashboard/workflow/vision/[projectId]/page.tsx'),
    'utf8'
  )

  it('runs the payload through fitProjectPutPayload before fetch', () => {
    const fit = page.indexOf('const fitted = fitProjectPutPayload(payloadBody)')
    const stringify = page.indexOf('JSON.stringify(fitted.body)')
    const fetchCall = page.indexOf('fetch(`/api/projects/${projectId}`')
    expect(fit).toBeGreaterThan(-1)
    expect(stringify).toBeGreaterThan(fit)
    expect(fetchCall).toBeGreaterThan(stringify)
  })

  it('does not fetch a project PUT that is still over 4.5MB after fit', () => {
    const putOne = page.indexOf('const putOne = async')
    const exceeds = page.indexOf('if (fitted.exceedsLimit)', putOne)
    const synthetic = page.indexOf("status: 413", putOne)
    const fetchCall = page.indexOf('fetch(`/api/projects/${projectId}`', putOne)
    expect(putOne).toBeGreaterThan(-1)
    expect(exceeds).toBeGreaterThan(putOne)
    expect(synthetic).toBeGreaterThan(exceeds)
    expect(fetchCall).toBeGreaterThan(synthetic)
    expect(page).toContain('not sending (Vercel 413 over 4.5MB)')
    expect(page).toContain('splitScriptPutIntoFittingBatches')
  })

  it('does not re-send production, characters, or the scene mirror on a script persist', () => {
    const persist = page.indexOf('const persistVisionScriptScenes = useCallback')
    const persistEnd = page.indexOf('}, [serializedProjectSave])', persist)
    const persistFn = page.slice(persist, persistEnd)
    expect(persistFn).toContain('persistSceneIdsForChangedScenes')
    expect(persistFn).toContain('persistSceneIds')
    const saveCall = persistFn.indexOf('serializedProjectSave(')
    const optionsStart = persistFn.indexOf('{ refreshLiveScript:', saveCall)
    const putBody = persistFn.slice(saveCall, optionsStart)
    expect(putBody).toContain('script: putScript')
    expect(putBody).toContain('scriptUpdatedAt:')
    expect(putBody).not.toContain('characters')
    expect(putBody).not.toContain('scenes: updatedScenes')
    expect(putBody).not.toContain('production:')
  })

  it('keeps production on the load-time migration that rewrites it', () => {
    expect(page).toMatch(/queuePersist\(\s*\{\s*metadata: finalMetadata,\s*persistProduction: true\s*\}/)
  })

  it('syncs Express references as a visionPhase patch, not the full metadata blob', () => {
    const start = page.indexOf('const syncVisionReferencesForExpress')
    const end = page.indexOf("throw new Error('Failed to sync references for Library Agent')", start)
    const fn = page.slice(start, end)
    expect(fn).toContain("serializedProjectSave(")
    expect(fn).toContain('visionPhasePut({')
    expect(fn).toContain("'syncVisionReferencesForExpress'")
    expect(fn).not.toContain('...existingMetadata')
    expect(fn).not.toContain('JSON.stringify(payload)')
  })

  it('persists the object and location library as a visionPhase patch', () => {
    const start = page.indexOf('const persistObjectLibrary = useCallback')
    const end = page.indexOf('const persistVisionCharacters = useCallback')
    const fn = page.slice(start, end)
    const saveCall = fn.slice(fn.indexOf('return serializedProjectSave'))
    expect(saveCall).toContain('visionPhasePut({')
    expect(saveCall).toContain('references,')
    expect(saveCall).not.toContain('...nextMetadata')
    expect(page).toContain("debugLabel: 'persistLocationReferences'")
    expect(page).toContain('fetch(`/api/projects/${projectId}/production`')
  })
})

describe('visionPhasePut', () => {
  it('sends only the fields this write is changing', () => {
    const body = visionPhasePut({
      characters: [{ name: 'Piper Hayes' }],
      references: { objectReferences: [] },
    })
    const slimmed = slimProjectPutPayload(body)
    expect(slimmed.metadata?.visionPhase).toEqual({
      characters: [{ name: 'Piper Hayes' }],
      references: { objectReferences: [] },
    })
    expect(JSON.parse(stringifyProjectPut(body)).metadata.visionPhase.production).toBeUndefined()
  })
})

describe('project API slims GET/PUT echoes', () => {
  const route = readFileSync(join(process.cwd(), 'src/app/api/projects/[id]/route.ts'), 'utf8')
  const productionRoute = readFileSync(
    join(process.cwd(), 'src/app/api/projects/[id]/production/route.ts'),
    'utf8'
  )
  const generateImage = readFileSync(
    join(process.cwd(), 'src/app/api/scene/generate-image/route.ts'),
    'utf8'
  )
  const generateFrames = readFileSync(
    join(process.cwd(), 'src/app/api/production/generate-segment-frames/route.ts'),
    'utf8'
  )

  it('GET/PUT omit production and return a compact PUT ack', () => {
    expect(route).toContain('slimProjectResponseMetadata')
    expect(route).toContain('fitProjectResponseMetadata')
    expect(route).toContain("searchParams.get('include') === 'production'")
    expect(route).toContain('compactProjectPutAck')
    expect(route).toContain('truncated')
    expect(route).not.toMatch(/return NextResponse\.json\(\{\s*success: true,\s*project,/)
  })

  it('serves production on its own GET', () => {
    expect(productionRoute).toContain('export async function GET')
    expect(productionRoute).toContain('production')
  })

  it('overlays location scale at the same still send sites as identity crop', () => {
    expect(generateImage).toContain('overlayLocationScaleOnReferenceImages')
    expect(generateFrames).toContain('overlayLocationScaleOnReferenceImages')
  })
})

describe('slimProjectResponseMetadata', () => {
  it('strips base64, drops production, and drops the legacy scene mirror', () => {
    const slimmed = slimProjectResponseMetadata({
      ...fullMetadata(),
      visionPhase: {
        ...fullMetadata().visionPhase,
        characters: [
          {
            name: 'Piper Hayes',
            referenceImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=',
          },
        ],
      },
    })
    expect(slimmed.visionPhase.production).toBeUndefined()
    expect(slimmed.visionPhase.scenes).toBeUndefined()
    expect(slimmed.visionPhase.script.script.scenes).toEqual(scenes)
    expect(slimmed.visionPhase.characters[0].referenceImage).toBe('deferred')
  })

  it('keeps production when includeProduction is set', () => {
    const metadata = fullMetadata()
    const slimmed = slimProjectResponseMetadata(metadata, { includeProduction: true })
    expect(slimmed.visionPhase.production).toEqual(metadata.visionPhase.production)
  })

  it('strips beat stills, end stills, version URLs, and combinedCharacterRefUrl data URIs', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE='
    const slimmed = slimProjectResponseMetadata({
      visionPhase: {
        characters: [{ name: 'Piper Hayes', combinedCharacterRefUrl: dataUri }],
        script: {
          script: {
            scenes: [
              {
                id: 'sc_1',
                beats: [
                  {
                    beatId: 'bt_1',
                    storyboardImageUrl: dataUri,
                    storyboardEndImageUrl: dataUri,
                    storyboardImageVersions: [{ id: 'v1', url: dataUri, prompt: 'Wide shot.' }],
                    storyboardEndImageVersions: [{ id: 'v2', url: dataUri }],
                  },
                ],
                dialogue: [{ lineId: 'ln_1', storyboardImageUrl: dataUri }],
                storyboardFrames: [{ id: 'fr_1', imageUrl: dataUri }],
              },
            ],
          },
        },
      },
    })
    const scene = slimmed.visionPhase.script.script.scenes[0]
    expect(slimmed.visionPhase.characters[0].combinedCharacterRefUrl).toBe('deferred')
    expect(scene.beats[0].storyboardImageUrl).toBe('deferred')
    expect(scene.beats[0].storyboardEndImageUrl).toBe('deferred')
    expect(scene.beats[0].storyboardImageVersions[0].url).toBe('deferred')
    expect(scene.beats[0].storyboardEndImageVersions[0].url).toBe('deferred')
    expect(scene.dialogue[0].storyboardImageUrl).toBe('deferred')
    expect(scene.storyboardFrames[0].imageUrl).toBe('deferred')
  })

  it('counts beat and combined-character data URIs in calculateBase64Size', () => {
    const dataUri = `data:image/png;base64,${'A'.repeat(1200)}`
    const size = calculateBase64Size({
      visionPhase: {
        characters: [{ combinedCharacterRefUrl: dataUri }],
        script: {
          script: {
            scenes: [
              {
                beats: [
                  {
                    storyboardImageUrl: dataUri,
                    storyboardImageVersions: [{ url: dataUri }],
                  },
                ],
              },
            ],
          },
        },
      },
    })
    expect(size).toBeGreaterThan(0)
  })

  it('strips MediaVersion prompts and keeps restore identity fields', () => {
    const slimmed = slimProjectResponseMetadata({
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                id: 'sc_1',
                beats: [
                  {
                    beatId: 'bt_1',
                    storyboardImageUrl: 'https://blob.example/still.jpg',
                    storyboardImageVersions: [
                      {
                        id: 'v1',
                        url: 'https://blob.example/still.jpg',
                        createdAt: '2026-09-19T00:00:00.000Z',
                        source: 'generate',
                        prompt: 'A'.repeat(5000),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    })
    const version =
      slimmed.visionPhase.script.script.scenes[0].beats[0].storyboardImageVersions[0]
    expect(version).toEqual({
      id: 'v1',
      url: 'https://blob.example/still.jpg',
      createdAt: '2026-09-19T00:00:00.000Z',
      source: 'generate',
    })
    expect(version.prompt).toBeUndefined()
  })
})

describe('fitProjectResponseMetadata', () => {
  it('fits a 5MB version-prompt blob under the Function limit', () => {
    const metadata = {
      visionPhase: {
        script: {
          script: {
            scenes: [
              {
                id: 'sc_1',
                beats: [
                  {
                    beatId: 'bt_1',
                    storyboardImageUrl: 'https://blob.example/still.jpg',
                    beatDirection: { shotType: 'MCU' },
                    storyboardImageVersions: [
                      {
                        id: 'v1',
                        url: 'https://blob.example/still.jpg',
                        createdAt: '2026-09-19T00:00:00.000Z',
                        source: 'generate',
                        prompt: 'p'.repeat(5 * 1024 * 1024),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    }
    const slimmed = slimProjectResponseMetadata(metadata)
    const fitted = fitProjectResponseMetadata(slimmed)
    const beat = fitted.metadata.visionPhase.script.script.scenes[0].beats[0]
    expect(beat.storyboardImageUrl).toBe('https://blob.example/still.jpg')
    expect(beat.beatDirection).toEqual({ shotType: 'MCU' })
    expect(beat.storyboardImageVersions[0].prompt).toBeUndefined()
    expect(fitted.bytes).toBeLessThan(VERCEL_FUNCTION_RESPONSE_BUDGET_BYTES)
    expect(JSON.stringify({ success: true, project: { metadata: fitted.metadata } }).length).toBeLessThan(
      VERCEL_FUNCTION_BODY_LIMIT_BYTES
    )
  })

  it('drops version arrays before reviewHistory when URLs alone exceed the budget', () => {
    const metadata = {
      visionPhase: {
        reviewHistory: [{ note: 'keep unless needed' }],
        script: {
          script: {
            scenes: [
              {
                id: 'sc_1',
                beats: [
                  {
                    beatId: 'bt_1',
                    storyboardImageUrl: 'https://blob.example/still.jpg',
                    beatDirection: { shotType: 'MCU' },
                    storyboardImageVersions: [
                      { id: 'v1', url: 'u'.repeat(Math.ceil(VERCEL_FUNCTION_RESPONSE_BUDGET_BYTES + 1024)) },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    }
    const fitted = fitProjectResponseMetadata(metadata)
    const beat = fitted.metadata.visionPhase.script.script.scenes[0].beats[0]
    expect(fitted.omitted).toContain('versionArrays')
    expect(fitted.omitted).not.toContain('reviewHistory')
    expect(beat.storyboardImageVersions).toBeUndefined()
    expect(beat.storyboardImageUrl).toBe('https://blob.example/still.jpg')
    expect(beat.beatDirection).toEqual({ shotType: 'MCU' })
    expect(fitted.metadata.visionPhase.reviewHistory).toEqual([{ note: 'keep unless needed' }])
    expect(fitted.bytes).toBeLessThan(VERCEL_FUNCTION_RESPONSE_BUDGET_BYTES)
  })

  it('drops reviewHistory and translations if still over budget', () => {
    const metadata = {
      visionPhase: {
        reviewHistory: { blob: 'r'.repeat(2 * 1024 * 1024) },
        translations: { es: { blob: 't'.repeat(2 * 1024 * 1024) } },
        script: { script: { scenes: [{ id: 'sc_1', beats: [{ beatId: 'bt_1', line: 'Hi.' }] }] } },
      },
    }
    const fitted = fitProjectResponseMetadata(metadata, { budgetBytes: 50_000 })
    expect(fitted.omitted).toEqual(['reviewHistory', 'translations'])
    expect(fitted.metadata.visionPhase.reviewHistory).toBeUndefined()
    expect(fitted.metadata.visionPhase.translations).toBeUndefined()
    expect(fitted.metadata.visionPhase.script.script.scenes[0].beats[0].line).toBe('Hi.')
    expect(fitted.bytes).toBeLessThan(50_000)
  })
})

describe('fitProjectPutPayload', () => {
  it('strips MediaVersion prompts and keeps live still URL and beatDirection', () => {
    const fitted = fitProjectPutPayload({
      metadata: {
        visionPhase: {
          script: {
            script: {
              scenes: [
                {
                  id: 'sc_1',
                  beats: [
                    {
                      beatId: 'bt_1',
                      storyboardImageUrl: 'https://blob.example/still.jpg',
                      beatDirection: { shotType: 'MCU' },
                      storyboardImageVersions: [
                        {
                          id: 'v1',
                          url: 'https://blob.example/still.jpg',
                          createdAt: '2026-09-19T00:00:00.000Z',
                          source: 'generate',
                          prompt: 'A'.repeat(5000),
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    })
    const beat = fitted.body.metadata?.visionPhase.script.script.scenes[0].beats[0]
    expect(fitted.omitted).toContain('versionPrompts')
    expect(fitted.exceedsLimit).toBe(false)
    expect(beat.storyboardImageUrl).toBe('https://blob.example/still.jpg')
    expect(beat.beatDirection).toEqual({ shotType: 'MCU' })
    expect(beat.storyboardImageVersions[0].prompt).toBeUndefined()
    expect(beat.storyboardImageVersions[0]).toEqual({
      id: 'v1',
      url: 'https://blob.example/still.jpg',
      createdAt: '2026-09-19T00:00:00.000Z',
      source: 'generate',
    })
  })

  it('fits a 5MB version-prompt script PUT under the Function body limit', () => {
    const fitted = fitProjectPutPayload({
      metadata: {
        visionPhase: {
          script: {
            script: {
              scenes: [
                {
                  id: 'sc_1',
                  beats: [
                    {
                      beatId: 'bt_1',
                      storyboardImageUrl: 'https://blob.example/still.jpg',
                      beatDirection: { shotType: 'MCU' },
                      storyboardImageVersions: [
                        {
                          id: 'v1',
                          url: 'https://blob.example/still.jpg',
                          createdAt: '2026-09-19T00:00:00.000Z',
                          source: 'generate',
                          prompt: 'p'.repeat(5 * 1024 * 1024),
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    })
    const beat = fitted.body.metadata?.visionPhase.script.script.scenes[0].beats[0]
    expect(fitted.omitted).toContain('versionPrompts')
    expect(fitted.exceedsLimit).toBe(false)
    expect(fitted.bytes).toBeLessThan(VERCEL_FUNCTION_BODY_LIMIT_BYTES)
    expect(beat.storyboardImageUrl).toBe('https://blob.example/still.jpg')
    expect(beat.beatDirection).toEqual({ shotType: 'MCU' })
    expect(beat.storyboardImageVersions[0].prompt).toBeUndefined()
  })

  it('drops version arrays when URLs alone exceed the budget', () => {
    const fitted = fitProjectPutPayload(
      {
        metadata: {
          visionPhase: {
            script: {
              script: {
                scenes: [
                  {
                    id: 'sc_1',
                    beats: [
                      {
                        beatId: 'bt_1',
                        storyboardImageUrl: 'https://blob.example/still.jpg',
                        beatDirection: { shotType: 'MCU' },
                        storyboardImageVersions: [
                          { id: 'v1', url: `https://blob.example/${'u'.repeat(8 * 1024)}` },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      { budgetBytes: 4_000 }
    )
    const beat = fitted.body.metadata?.visionPhase.script.script.scenes[0].beats[0]
    expect(fitted.omitted).toContain('versionArrays')
    expect(fitted.exceedsLimit).toBe(false)
    expect(beat.storyboardImageVersions).toBeUndefined()
    expect(beat.storyboardImageUrl).toBe('https://blob.example/still.jpg')
    expect(beat.beatDirection).toEqual({ shotType: 'MCU' })
  })
})

describe('splitScriptPutIntoFittingBatches', () => {
  it('splits two scenes that fit alone but not together', () => {
    const blob = 'x'.repeat(3_000)
    const body = {
      metadata: {
        visionPhase: {
          script: {
            script: {
              scenes: [
                { id: 'sc_1', blob },
                { id: 'sc_2', blob },
              ],
            },
          },
          scriptUpdatedAt: '2026-09-19T00:00:00.000Z',
        },
      },
    }
    const batches = splitScriptPutIntoFittingBatches(body, {
      budgetBytes: 5_000,
      nowIso: () => '2026-09-20T00:00:00.000Z',
    })
    expect(batches).toHaveLength(2)
    expect(batches![0].metadata?.visionPhase.script.script.scenes.map((s: { id: string }) => s.id)).toEqual([
      'sc_1',
    ])
    expect(batches![1].metadata?.visionPhase.script.script.scenes.map((s: { id: string }) => s.id)).toEqual([
      'sc_2',
    ])
    expect(batches![0].metadata?.visionPhase.scriptUpdatedAt).toBe('2026-09-20T00:00:00.000Z')
  })

  it('returns null when a single scene cannot fit', () => {
    const body = {
      metadata: {
        visionPhase: {
          script: {
            script: {
              scenes: [
                { id: 'sc_1', blob: 'x'.repeat(8_000) },
                { id: 'sc_2', blob: 'y' },
              ],
            },
          },
          scriptUpdatedAt: '2026-09-19T00:00:00.000Z',
        },
      },
    }
    expect(splitScriptPutIntoFittingBatches(body, { budgetBytes: 1_000 })).toBeNull()
  })
})

describe('compactProjectPutAck', () => {
  it('returns a small success body without the project blob', () => {
    expect(compactProjectPutAck({ scriptUpdatedAt: '2026-09-19T00:00:00.000Z' })).toEqual({
      success: true,
      scriptUpdatedAt: '2026-09-19T00:00:00.000Z',
    })
  })

  it('includes the server script only when a stale write was blocked', () => {
    const script = { script: { scenes: [{ id: 'kept' }] } }
    const ack = compactProjectPutAck({
      staleScriptWriteBlocked: true,
      scriptUpdatedAt: '2026-09-19T00:00:00.000Z',
      script,
    })
    expect(ack.staleScriptWriteBlocked).toBe(true)
    expect(ack.project).toEqual({
      metadata: {
        visionPhase: {
          scriptUpdatedAt: '2026-09-19T00:00:00.000Z',
          script,
        },
      },
    })
  })
})

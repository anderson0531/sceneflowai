import { describe, expect, it } from 'vitest'
import {
  isScriptWriterPut,
  mergeLiveScriptWithQueuedMedia,
  persistSceneIdsForChangedScenes,
  putResponseIndicatesStaleScriptWrite,
  refreshQueuedScriptPut,
  scenesToPersistForScriptPut,
} from '@/lib/projects/refreshQueuedScriptPut'

const QUEUED_SCRIPT = { script: { scenes: [{ id: 'old-block' }] } }
const LIVE_SCRIPT = { script: { scenes: [{ id: 'block-removed' }] } }
const QUEUED_AT = '2026-09-14T09:23:07.794Z'
const SEND_AT = '2026-09-14T09:23:28.000Z'

function scriptPut(script: unknown = QUEUED_SCRIPT, scriptUpdatedAt = QUEUED_AT) {
  return {
    metadata: {
      visionPhase: {
        script,
        scriptUpdatedAt,
      },
    },
  }
}

describe('refreshQueuedScriptPut', () => {
  it('rebuilds script and scriptUpdatedAt at send time from the live script', () => {
    const sent = refreshQueuedScriptPut(scriptPut(), {
      liveScript: LIVE_SCRIPT,
      nowIso: SEND_AT,
    })

    expect(sent.metadata.visionPhase.script).toEqual(LIVE_SCRIPT)
    expect(sent.metadata.visionPhase.scriptUpdatedAt).toBe(SEND_AT)
  })

  it('keeps queued still versions when the live script still points at the original', () => {
    const originalUrl =
      'https://x.public.blob.vercel-storage.com/images/frames/p/old/1779500000000.jpeg'
    const regenUrl =
      'https://x.public.blob.vercel-storage.com/images/frames/p/new/1779527367355-AbCdEf.jpeg'
    const versions = [
      {
        id: 'mv_old',
        url: originalUrl,
        createdAt: '2026-01-01T00:00:00.000Z',
        source: 'generate',
      },
      {
        id: 'mv_new',
        url: regenUrl,
        createdAt: '2026-06-01T00:00:00.000Z',
        source: 'generate',
      },
    ]
    const queuedScript = {
      script: {
        scenes: [
          {
            id: 's1',
            heading: 'INT. LAB',
            beats: [
              {
                beatId: 'bt_1',
                kind: 'action',
                actionDescription: 'Wide void',
                storyboardImageUrl: regenUrl,
                storyboardImageVersionId: 'mv_new',
                storyboardImageVersions: versions,
              },
            ],
          },
        ],
      },
    }
    const liveScript = {
      script: {
        scenes: [
          {
            id: 's1',
            heading: 'INT. LAB — NIGHT',
            beats: [
              {
                beatId: 'bt_1',
                kind: 'action',
                actionDescription: 'Wide void',
                storyboardImageUrl: originalUrl,
              },
            ],
          },
        ],
      },
    }

    const sent = refreshQueuedScriptPut(scriptPut(queuedScript), {
      liveScript,
      nowIso: SEND_AT,
    })
    const beat = sent.metadata.visionPhase.script.script.scenes[0].beats[0]

    expect(sent.metadata.visionPhase.script.script.scenes[0].heading).toBe('INT. LAB — NIGHT')
    expect(beat.storyboardImageUrl).toBe(regenUrl)
    expect(beat.storyboardImageVersionId).toBe('mv_new')
    expect(beat.storyboardImageVersions.map((v: { url: string }) => v.url).sort()).toEqual(
      [originalUrl, regenUrl].sort()
    )
  })

  it('mergeLiveScriptWithQueuedMedia does not revive a scene the live script deleted', () => {
    const queuedScript = {
      script: {
        scenes: [
          { id: 'keep', heading: 'A' },
          { id: 'removed', heading: 'B' },
        ],
      },
    }
    const liveScript = {
      script: {
        scenes: [{ id: 'keep', heading: 'A-edited' }],
      },
    }

    const merged = mergeLiveScriptWithQueuedMedia(liveScript, queuedScript) as {
      script: { scenes: Array<{ id: string; heading: string }> }
    }
    expect(merged.script.scenes.map((scene) => scene.id)).toEqual(['keep'])
    expect(merged.script.scenes[0].heading).toBe('A-edited')
  })

  it('mints a fresh timestamp without replacing script when asked', () => {
    const queued = scriptPut()
    const sent = refreshQueuedScriptPut(queued, {
      liveScript: LIVE_SCRIPT,
      nowIso: SEND_AT,
      replaceScript: false,
    })

    expect(sent.metadata.visionPhase.script).toEqual(QUEUED_SCRIPT)
    expect(sent.metadata.visionPhase.scriptUpdatedAt).toBe(SEND_AT)
  })

  it('leaves non-script PUTs unchanged', () => {
    const body = { metadata: { visionPhase: { characters: [] } } }
    expect(refreshQueuedScriptPut(body, { liveScript: LIVE_SCRIPT, nowIso: SEND_AT })).toBe(body)
    expect(isScriptWriterPut(body)).toBe(false)
  })

  it('keeps a scoped persist to the requested scene after live refresh', () => {
    const queued = {
      metadata: {
        visionPhase: {
          script: {
            script: {
              scenes: [{ id: 'sc_2', heading: 'TUNNEL — queued' }],
            },
          },
          scriptUpdatedAt: QUEUED_AT,
        },
      },
    }
    const liveScript = {
      script: {
        scenes: [
          { id: 'sc_1', heading: 'OPENING' },
          { id: 'sc_2', heading: 'TUNNEL — live' },
          { id: 'sc_3', heading: 'CLOSE' },
        ],
      },
    }

    const sent = refreshQueuedScriptPut(queued, {
      liveScript,
      nowIso: SEND_AT,
      persistSceneIds: ['sc_2'],
    })

    expect(sent.metadata.visionPhase.scriptUpdatedAt).toBe(SEND_AT)
    expect(sent.metadata.visionPhase.script.script.scenes).toEqual([
      { id: 'sc_2', heading: 'TUNNEL — live' },
    ])
  })
})

describe('scenesToPersistForScriptPut', () => {
  it('sends only the replaced scene identity', () => {
    const previous = [{ id: 'sc_1' }, { id: 'sc_2' }, { id: 'sc_3' }]
    const next = [previous[0], { id: 'sc_2', patched: true }, previous[2]]
    expect(scenesToPersistForScriptPut(previous, next)).toEqual([{ id: 'sc_2', patched: true }])
    expect(persistSceneIdsForChangedScenes(previous, next)).toEqual({
      scenes: [{ id: 'sc_2', patched: true }],
      persistSceneIds: ['sc_2'],
    })
  })

  it('sends the full list when every scene is a new object', () => {
    const previous = [{ id: 'sc_1' }, { id: 'sc_2' }]
    const next = [{ id: 'sc_2' }, { id: 'sc_1' }]
    expect(scenesToPersistForScriptPut(previous, next)).toBe(next)
    expect(persistSceneIdsForChangedScenes(previous, next).persistSceneIds).toBeUndefined()
  })
})

describe('putResponseIndicatesStaleScriptWrite', () => {
  it('treats the PUT flag as a blocked save', () => {
    expect(putResponseIndicatesStaleScriptWrite({ staleScriptWriteBlocked: true }, SEND_AT)).toBe(
      true
    )
  })

  it('treats a newer server timestamp as a blocked save', () => {
    expect(
      putResponseIndicatesStaleScriptWrite(
        {
          project: {
            metadata: { visionPhase: { scriptUpdatedAt: '2026-09-14T09:23:28.494Z' } },
          },
        },
        QUEUED_AT
      )
    ).toBe(true)
  })

  it('does not treat an equal timestamp as blocked', () => {
    expect(
      putResponseIndicatesStaleScriptWrite(
        { project: { metadata: { visionPhase: { scriptUpdatedAt: SEND_AT } } } },
        SEND_AT
      )
    ).toBe(false)
  })
})

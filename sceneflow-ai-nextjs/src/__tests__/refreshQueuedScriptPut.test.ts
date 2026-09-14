import { describe, expect, it } from 'vitest'
import {
  isScriptWriterPut,
  putResponseIndicatesStaleScriptWrite,
  refreshQueuedScriptPut,
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

    expect(sent.metadata.visionPhase.script).toBe(LIVE_SCRIPT)
    expect(sent.metadata.visionPhase.scriptUpdatedAt).toBe(SEND_AT)
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

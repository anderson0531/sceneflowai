import { describe, expect, it } from 'vitest'
import { composeBeatActionFraming } from '@/lib/intelligence/beat-sequence-planner-fallback'
import {
  connectObjectReference,
  disconnectObjectReference,
  objectReferenceClause,
} from '@/lib/vision/beatReferenceConnections'
import type { BeatReferenceSelection } from '@/lib/script/segmentTypes'

const selection: BeatReferenceSelection = {
  characterIds: ['ada'],
  objectRefIds: [],
  source: 'auto',
}

describe('connectObjectReference', () => {
  it('locks the object, adds the key prop, and appends the clause only when the override omits the name', () => {
    const connected = connectObjectReference({
      direction: {
        shotType: 'Insert Shot',
        framePrompt: 'Close on the mantel.',
        videoPrompt: 'The framed photo stays in focus.',
      },
      selection,
      objectId: 'photo-1',
      objectName: 'Framed photo',
      resolvedAt: '2026-09-24T00:00:00.000Z',
    })

    expect(connected.selection.objectRefIds).toEqual(['photo-1'])
    expect(connected.selection.source).toBe('user')
    expect(connected.direction.keyProps).toEqual(['Framed photo'])
    expect(connected.direction.framePrompt).toBe(
      `Close on the mantel. ${objectReferenceClause('Framed photo')}`
    )
    expect(connected.direction.videoPrompt).toBe('The framed photo stays in focus.')
  })

  it('leaves a composed prompt alone when there is no override', () => {
    const connected = connectObjectReference({
      direction: { shotType: 'Close-Up' },
      selection,
      objectId: 'photo-1',
      objectName: 'Framed photo',
      resolvedAt: '2026-09-24T00:00:00.000Z',
    })
    expect(connected.direction.framePrompt).toBeUndefined()
    expect(connected.direction.videoPrompt).toBeUndefined()
    expect(connected.direction.keyProps).toEqual(['Framed photo'])
  })
})

describe('composeBeatActionFraming connected props', () => {
  it('names Framed Photo of Sarah when the action still says Sepia photograph', () => {
    const framing = composeBeatActionFraming({
      beatId: 'bt_photo',
      sequenceIndex: 0,
      kind: 'action',
      actionDescription: 'A finger rests on the glass edge of the Sepia photograph.',
      beatDirection: {
        shotType: 'Insert Shot',
        cameraAngle: 'high angle',
        keyProps: ['Framed Photo of Sarah'],
      },
    })

    expect(framing).toContain('Sepia photograph')
    expect(framing).toContain('Props: Framed Photo of Sarah')
  })
})

describe('disconnectObjectReference', () => {
  it('removes the id, the key prop, and the clause only', () => {
    const connected = connectObjectReference({
      direction: {
        shotType: 'Insert Shot',
        keyProps: ['Letter'],
        framePrompt: 'Close on the mantel.',
        videoPrompt: 'Hold on the desk.',
      },
      selection,
      objectId: 'photo-1',
      objectName: 'Framed photo',
      resolvedAt: '2026-09-24T00:00:00.000Z',
    })
    const disconnected = disconnectObjectReference({
      direction: connected.direction,
      selection: connected.selection,
      objectId: 'photo-1',
      objectName: 'Framed photo',
      resolvedAt: '2026-09-24T00:00:01.000Z',
    })

    expect(disconnected.selection.objectRefIds).toEqual([])
    expect(disconnected.direction.keyProps).toEqual(['Letter'])
    expect(disconnected.direction.framePrompt).toBe('Close on the mantel.')
    expect(disconnected.direction.videoPrompt).toBe('Hold on the desk.')
    expect(disconnected.direction.shotType).toBe('Insert Shot')
  })
})

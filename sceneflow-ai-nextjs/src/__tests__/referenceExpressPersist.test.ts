import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/models', () => ({}))
vi.mock('@/models/Project', () => ({ Project: { findByPk: vi.fn() } }))
vi.mock('@/config/database', () => ({
  sequelize: {
    transaction: vi.fn(
      async (fn: (t: unknown) => unknown) => fn({ LOCK: { UPDATE: 'UPDATE' } })
    ),
  },
}))

import { Project } from '@/models/Project'
import { persistReferenceImage } from '@/lib/vision/referenceExpress/persistReferenceImage'
import {
  castFingerprint,
  locationFingerprint,
} from '@/lib/vision/referenceExpress/planItems'

const mockFindByPk = vi.mocked(Project.findByPk)

const MIRA = { id: 'c1', name: 'Mira', description: 'A tired courier' }
const DOCKYARD = {
  id: 'l1',
  location: 'Dockyard',
  intExt: 'EXT',
  timeOfDay: 'NIGHT',
  description: 'Rusted cranes',
}

/** A project whose script and sibling references must survive every write. */
function fakeProject() {
  const project = {
    metadata: {
      visionPhase: {
        script: { scenes: [{ heading: 'EXT. DOCKYARD - NIGHT' }] },
        characters: [{ ...MIRA }, { id: 'c2', name: 'Bo', referenceImage: 'https://cdn/bo.png' }],
        references: {
          locationReferences: [{ ...DOCKYARD }],
          objectReferences: [
            { id: 'p1', name: 'Brass key', description: 'Worn smooth' },
            { id: 'p2', name: 'Ledger', imageUrl: 'https://cdn/ledger.png' },
          ],
          sceneReferences: [{ id: 's1', imageUrl: 'https://cdn/s1.png' }],
        },
      },
      audienceReview: { overallScore: 78 },
    } as Record<string, any>,
    changed: vi.fn(),
    save: vi.fn(async () => undefined),
  }
  mockFindByPk.mockResolvedValue(project as never)
  return project
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('persistReferenceImage', () => {
  it('writes only the target character and leaves the script alone', async () => {
    const project = fakeProject()
    const before = project.metadata.visionPhase.script

    const outcome = await persistReferenceImage({
      projectId: 'proj-1',
      kind: 'cast',
      targetId: 'c1',
      expectedFingerprint: castFingerprint(MIRA),
      patch: { referenceImage: 'https://cdn/mira.png' },
    })

    expect(outcome).toEqual({ saved: true, staleSource: false })
    expect(project.save).toHaveBeenCalledOnce()

    const vision = project.metadata.visionPhase
    expect(vision.script).toBe(before)
    expect(vision.characters[0]).toMatchObject({
      name: 'Mira',
      referenceImage: 'https://cdn/mira.png',
    })
    expect(vision.characters[1]).toEqual({
      id: 'c2',
      name: 'Bo',
      referenceImage: 'https://cdn/bo.png',
    })
    expect(project.metadata.audienceReview).toEqual({ overallScore: 78 })
  })

  it('writes only the target reference and leaves siblings untouched', async () => {
    const project = fakeProject()

    await persistReferenceImage({
      projectId: 'proj-1',
      kind: 'location',
      targetId: 'l1',
      expectedFingerprint: locationFingerprint(DOCKYARD),
      patch: { imageUrl: 'https://cdn/dock.png', generationPrompt: 'wide, night' },
    })

    const references = project.metadata.visionPhase.references
    expect(references.locationReferences[0]).toMatchObject({
      location: 'Dockyard',
      imageUrl: 'https://cdn/dock.png',
      generationPrompt: 'wide, night',
    })
    expect(references.objectReferences).toHaveLength(2)
    expect(references.objectReferences[0]).toEqual({
      id: 'p1',
      name: 'Brass key',
      description: 'Worn smooth',
    })
    expect(references.sceneReferences).toEqual([{ id: 's1', imageUrl: 'https://cdn/s1.png' }])
  })

  it('still saves an image whose source was edited mid-run, but flags it', async () => {
    const project = fakeProject()

    const outcome = await persistReferenceImage({
      projectId: 'proj-1',
      kind: 'cast',
      targetId: 'c1',
      expectedFingerprint: castFingerprint({ ...MIRA, description: 'A cheerful courier' }),
      patch: { referenceImage: 'https://cdn/mira.png' },
    })

    expect(outcome).toEqual({ saved: true, staleSource: true })
    expect(project.metadata.visionPhase.characters[0].referenceImage).toBe(
      'https://cdn/mira.png'
    )
  })

  it('does not save when the target was deleted while the batch ran', async () => {
    const project = fakeProject()

    const outcome = await persistReferenceImage({
      projectId: 'proj-1',
      kind: 'prop',
      targetId: 'gone',
      expectedFingerprint: 'whatever',
      patch: { imageUrl: 'https://cdn/orphan.png' },
    })

    expect(outcome).toEqual({ saved: false, staleSource: false })
    expect(project.save).not.toHaveBeenCalled()
  })

  it('does not save when the project itself is gone', async () => {
    mockFindByPk.mockResolvedValue(null as never)

    await expect(
      persistReferenceImage({
        projectId: 'missing',
        kind: 'cast',
        targetId: 'c1',
        expectedFingerprint: 'whatever',
        patch: { referenceImage: 'https://cdn/mira.png' },
      })
    ).resolves.toEqual({ saved: false, staleSource: false })
  })

  it('takes a row lock so a concurrent save cannot interleave', async () => {
    fakeProject()

    await persistReferenceImage({
      projectId: 'proj-1',
      kind: 'cast',
      targetId: 'c1',
      expectedFingerprint: castFingerprint(MIRA),
      patch: { referenceImage: 'https://cdn/mira.png' },
    })

    expect(mockFindByPk).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({ lock: 'UPDATE' })
    )
  })
})

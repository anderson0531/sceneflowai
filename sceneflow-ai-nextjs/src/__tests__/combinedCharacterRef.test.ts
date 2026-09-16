import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/models', () => ({}))
vi.mock('@/models/Project', () => ({ Project: { findByPk: vi.fn() } }))
vi.mock('@/config/database', () => ({
  sequelize: { transaction: vi.fn() },
}))

vi.mock('@/lib/storage/blob', () => ({
  uploadImageToBlob: vi.fn(async () => 'https://blob.example/combined.jpg'),
}))

vi.mock('@/lib/character/composeIdentityWardrobeDiptych', () => ({
  composeIdentityWardrobeDiptych: vi.fn(async () => ({
    base64: 'aaa',
    mimeType: 'image/jpeg',
    dataUrl: 'data:image/jpeg;base64,aaa',
    width: 1920,
    height: 1080,
  })),
  composeIdentityWardrobePipFromDiptychUrl: vi.fn(),
}))

vi.mock('@/lib/vision/referenceExpress/persistReferenceImage', () => ({
  persistReferenceImage: vi.fn(async () => ({ saved: true, staleSource: false })),
}))

import { uploadImageToBlob } from '@/lib/storage/blob'
import { composeIdentityWardrobeDiptych } from '@/lib/character/composeIdentityWardrobeDiptych'
import { persistReferenceImage } from '@/lib/vision/referenceExpress/persistReferenceImage'
import {
  combinedCharacterRefUploadPath,
  composeUploadAndPersistCombinedCharacterRef,
  recomposeCombinedCharacterRefsForCast,
} from '@/lib/character/combinedCharacterRef'

describe('combinedCharacterRef', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('names the upload after project, character, and wardrobe', () => {
    const path = combinedCharacterRefUploadPath({
      projectId: 'p1',
      characterId: 'c1',
      wardrobeId: 'w1',
    })
    expect(path).toContain('characters/p1/c1/wardrobes/w1/combined-')
    expect(path.endsWith('.jpg')).toBe(true)
  })

  it('composes, uploads, and persists combinedCharacterRefUrl on the wardrobe', async () => {
    const url = await composeUploadAndPersistCombinedCharacterRef({
      projectId: 'p1',
      characterId: 'c1',
      wardrobeId: 'w1',
      identityUrl: 'https://example.com/face.jpg',
      wardrobeUrl: 'https://example.com/body.jpg',
      expectedFingerprint: 'fp',
      label: 'Marcus',
    })

    expect(url).toBe('https://blob.example/combined.jpg')
    expect(composeIdentityWardrobeDiptych).toHaveBeenCalledWith({
      identityUrl: 'https://example.com/face.jpg',
      wardrobeUrl: 'https://example.com/body.jpg',
      label: 'Marcus',
    })
    expect(uploadImageToBlob).toHaveBeenCalled()
    expect(persistReferenceImage).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p1',
        kind: 'cast',
        targetId: 'c1',
        wardrobeId: 'w1',
        patch: { combinedCharacterRefUrl: 'https://blob.example/combined.jpg' },
      })
    )
  })

  it('recomposes every wardrobe that already has a full-body still', async () => {
    await recomposeCombinedCharacterRefsForCast({
      projectId: 'p1',
      characterId: 'c1',
      identityUrl: 'https://example.com/face.jpg',
      characterName: 'Marcus',
      wardrobes: [
        { id: 'w1', fullBodyUrl: 'https://example.com/body-1.jpg', description: 'suit' },
        { id: 'w2', description: 'no still yet' },
        { id: 'w3', fullBodyUrl: 'https://example.com/body-3.jpg' },
      ],
    })

    expect(composeIdentityWardrobeDiptych).toHaveBeenCalledTimes(2)
    expect(persistReferenceImage).toHaveBeenCalledTimes(2)
  })
})

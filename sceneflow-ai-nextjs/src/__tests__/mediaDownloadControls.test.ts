import { describe, expect, it, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildSuggestedImageFilename,
  buildSuggestedVideoFilename,
  saveImageFile,
  saveVideoFile,
} from '@/lib/download/saveFile'

describe('saveFile image and video helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('builds suggested image filenames from scene, shot, and label', () => {
    expect(
      buildSuggestedImageFilename({
        url: 'https://blob.vercel-storage.com/frames/frame-1.png',
        sceneNumber: 2,
        beatNumber: 4,
        label: 'Wide Establishing Shot',
      })
    ).toBe('scene-2-shot-4-Wide_Establishing_Shot.png')

    expect(
      buildSuggestedImageFilename({
        url: 'https://blob.vercel-storage.com/refs/cast.webp?token=123',
        label: 'cast-Elena Vance',
      })
    ).toBe('cast-Elena_Vance.webp')
  })

  it('builds suggested video filenames from scene, shot, and label', () => {
    expect(
      buildSuggestedVideoFilename({
        url: 'https://blob.vercel-storage.com/clips/shot-3.mp4',
        sceneNumber: 1,
        beatNumber: 3,
      })
    ).toBe('scene-1-shot-3-clip.mp4')

    expect(
      buildSuggestedVideoFilename({
        url: 'https://blob.vercel-storage.com/clips/take.webm',
        beatNumber: 2,
        label: 'Action Cut',
      })
    ).toBe('shot-2-Action_Cut.webm')
  })

  it('saves images and videos via showSaveFilePicker when available', async () => {
    const fakeBlob = new Blob(['test-bytes'], { type: 'image/png' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(fakeBlob),
    })
    vi.stubGlobal('fetch', fetchMock)

    const writeMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const showSaveFilePickerMock = vi.fn().mockResolvedValue({
      createWritable: () =>
        Promise.resolve({
          write: writeMock,
          close: closeMock,
        }),
    })
    vi.stubGlobal('window', {
      showSaveFilePicker: showSaveFilePickerMock,
    })

    const imageSaved = await saveImageFile({
      url: 'https://example.com/still.png',
      sceneNumber: 1,
      beatNumber: 2,
      label: 'still',
    })
    expect(imageSaved).toBe(true)
    expect(showSaveFilePickerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: 'scene-1-shot-2-still.png',
      })
    )
    expect(writeMock).toHaveBeenCalledWith(fakeBlob)
    expect(closeMock).toHaveBeenCalled()

    const videoSaved = await saveVideoFile({
      url: 'https://example.com/clip.mp4',
      beatNumber: 2,
      label: 'clip',
    })
    expect(videoSaved).toBe(true)
    expect(showSaveFilePickerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: 'shot-2-clip.mp4',
      })
    )
  })

  it('wires download controls into still, clip, and continuity components', () => {
    const root = path.resolve(__dirname, '..')
    const filesWithImageDownload = [
      'components/vision/SceneImageFrame.tsx',
      'components/vision/SceneStoryboardFrameViewer.tsx',
      'components/vision/scene-production/BeatStillClipViewer.tsx',
      'components/vision/SceneReferencesPanel.tsx',
      'components/vision/LocationLibrary.tsx',
      'components/vision/CharacterLibrary.tsx',
      'components/vision/VisionReferencesSidebar.tsx',
      'components/vision/SceneReferenceCard.tsx',
    ]

    for (const relPath of filesWithImageDownload) {
      const content = fs.readFileSync(path.join(root, relPath), 'utf8')
      expect(content, `${relPath} should import saveImageFile`).toContain('saveImageFile')
    }

    const filesWithVideoDownload = [
      'components/vision/scene-production/BeatVideoGallery.tsx',
      'components/vision/scene-production/BeatStillClipViewer.tsx',
    ]

    for (const relPath of filesWithVideoDownload) {
      const content = fs.readFileSync(path.join(root, relPath), 'utf8')
      expect(content, `${relPath} should import saveVideoFile`).toContain('saveVideoFile')
    }
  })
})

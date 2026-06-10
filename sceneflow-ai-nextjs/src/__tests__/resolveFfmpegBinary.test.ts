import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { constants } from 'fs'

const existsSyncMock = vi.fn()
const accessSyncMock = vi.fn()

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    existsSync: (...args: Parameters<typeof actual.existsSync>) => existsSyncMock(...args),
    accessSync: (...args: Parameters<typeof actual.accessSync>) => accessSyncMock(...args),
  }
})

describe('resolveFfmpegBinary', () => {
  const originalFfmpegBin = process.env.FFMPEG_BIN

  beforeEach(() => {
    vi.resetModules()
    existsSyncMock.mockReset()
    accessSyncMock.mockReset()
    delete process.env.FFMPEG_BIN
    accessSyncMock.mockImplementation(() => undefined)
  })

  afterEach(() => {
    if (originalFfmpegBin === undefined) {
      delete process.env.FFMPEG_BIN
    } else {
      process.env.FFMPEG_BIN = originalFfmpegBin
    }
  })

  it('prefers FFMPEG_BIN when executable', async () => {
    process.env.FFMPEG_BIN = '/custom/ffmpeg'
    existsSyncMock.mockImplementation((path) => path === '/custom/ffmpeg')

    const { resolveFfmpegBinary } = await import('@/lib/ffmpeg/resolveFfmpegBinary')
    expect(resolveFfmpegBinary()).toBe('/custom/ffmpeg')
  })

  it('falls back to ffmpeg-static package path when env is missing', async () => {
    existsSyncMock.mockImplementation((path) => {
      if (typeof path === 'string' && path.includes('ffmpeg-static')) {
        return true
      }
      return false
    })

    const { resolveFfmpegBinary } = await import('@/lib/ffmpeg/resolveFfmpegBinary')
    const resolved = resolveFfmpegBinary()
    expect(resolved).toContain('ffmpeg-static')
  })

  it('falls back to cwd node_modules path when package path is unavailable', async () => {
    const cwdPath = `${process.cwd()}/node_modules/ffmpeg-static/ffmpeg`
    existsSyncMock.mockImplementation((path) => path === cwdPath)

    vi.doMock('ffmpeg-static', () => null)

    const { resolveFfmpegBinary } = await import('@/lib/ffmpeg/resolveFfmpegBinary')
    expect(resolveFfmpegBinary()).toBe(cwdPath)
  })

  it('throws a clear error when no candidate is executable', async () => {
    existsSyncMock.mockReturnValue(false)

    const { resolveFfmpegBinary, FFMPEG_NOT_FOUND_MESSAGE } = await import(
      '@/lib/ffmpeg/resolveFfmpegBinary'
    )

    expect(() => resolveFfmpegBinary()).toThrow(FFMPEG_NOT_FOUND_MESSAGE)
  })

  it('skips env path when file exists but is not executable', async () => {
    process.env.FFMPEG_BIN = '/custom/ffmpeg'
    const cwdPath = `${process.cwd()}/node_modules/ffmpeg-static/ffmpeg`

    existsSyncMock.mockImplementation((path) => {
      return path === '/custom/ffmpeg' || path === cwdPath
    })
    accessSyncMock.mockImplementation((path, mode) => {
      if (path === '/custom/ffmpeg' && mode === constants.X_OK) {
        throw new Error('not executable')
      }
    })

    const { resolveFfmpegBinary } = await import('@/lib/ffmpeg/resolveFfmpegBinary')
    expect(resolveFfmpegBinary()).toBe(cwdPath)
  })
})

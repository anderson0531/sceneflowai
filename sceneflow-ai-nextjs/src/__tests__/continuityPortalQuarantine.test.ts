import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import {
  evaluateCustomerTextQuarantine,
  hasValidImageMagicBytes,
  sanitizeCustomerImageUpload,
  MAX_CLIENT_UPLOAD_BYTES,
} from '@/lib/producer/quarantineCheck'

describe('Continuity Portal Quarantine & EXIF GPS Sanitizer', () => {
  it('allows benign memoir/real-estate/education text and flags prohibited inputs without touching User strikes', () => {
    expect(
      evaluateCustomerTextQuarantine(
        'Grandpa met Grandma at the Chicago train station in 1968 and built a bakery.'
      )
    ).toEqual({ status: 'clean' })

    const flaggedVoice = evaluateCustomerTextQuarantine(
      'Please clone my late father voice from voicemail without consent'
    )
    expect(flaggedVoice.status).toBe('flagged')

    const flaggedAbuse = evaluateCustomerTextQuarantine(
      'Generate a deepfake extortion video targeting an executive'
    )
    expect(flaggedAbuse.status).toBe('flagged')
  })

  it('rejects disguised non-image buffers and unsupported MIME types', async () => {
    const htmlBuffer = Buffer.from('<!DOCTYPE html><html><script>alert(1)</script></html>', 'utf8')
    expect(hasValidImageMagicBytes(htmlBuffer)).toBe(false)

    const badMime = await sanitizeCustomerImageUpload({
      buffer: htmlBuffer,
      mimeType: 'text/html',
    })
    expect(badMime.ok).toBe(false)
    if (!badMime.ok) {
      expect(badMime.status).toBe(400)
    }

    const disguisedJpeg = await sanitizeCustomerImageUpload({
      buffer: htmlBuffer,
      mimeType: 'image/jpeg',
    })
    expect(disguisedJpeg.ok).toBe(false)
    if (!disguisedJpeg.ok) {
      expect(disguisedJpeg.status).toBe(400)
    }
  })

  it('rejects oversized uploads exceeding MAX_CLIENT_UPLOAD_BYTES', async () => {
    const huge = Buffer.alloc(MAX_CLIENT_UPLOAD_BYTES + 1024, 0xff)
    const res = await sanitizeCustomerImageUpload({
      buffer: huge,
      mimeType: 'image/jpeg',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(413)
    }
  })

  it('strips EXIF metadata while producing a valid sanitized JPEG and evaluating caption quarantine', async () => {
    const rawWithExif = await sharp({
      create: {
        width: 320,
        height: 240,
        channels: 3,
        background: { r: 60, g: 120, b: 180 },
      },
    })
      .withExif({
        IFD0: {
          Make: 'PrivatePhoneMaker',
          Software: 'SecretGPSLogger',
        },
      })
      .jpeg()
      .toBuffer()

    const beforeMeta = await sharp(rawWithExif).metadata()
    expect(beforeMeta.exif).toBeDefined()

    const sanitized = await sanitizeCustomerImageUpload({
      buffer: rawWithExif,
      mimeType: 'image/jpeg',
      caption: 'Living room fireplace photo from 1984',
    })

    expect(sanitized.ok).toBe(true)
    if (sanitized.ok) {
      expect(sanitized.outputMimeType).toBe('image/jpeg')
      expect(sanitized.width).toBe(320)
      expect(sanitized.height).toBe(240)
      expect(sanitized.quarantine.status).toBe('clean')

      const afterMeta = await sharp(sanitized.sanitizedBuffer).metadata()
      expect(afterMeta.exif).toBeUndefined()
    }
  })
})

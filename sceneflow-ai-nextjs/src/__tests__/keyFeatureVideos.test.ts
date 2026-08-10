import { describe, it, expect } from 'vitest'
import { KEY_FEATURE_ICON_KEYS } from '@/components/landing/keyFeatureIcons'
import {
  KEY_FEATURE_VIDEO_LABELS,
  getDefaultKeyFeatureVideoLocale,
  getKeyFeatureVideoBlobManifest,
  getKeyFeatureVideoLocales,
  hasKeyFeatureVideo,
  keyFeatureVideoBlobPath,
} from '@/config/landing/keyFeatureVideos'
import { VIDEO_LOCALE_ORDER } from '@/config/landing/videoLocales'

describe('keyFeatureVideos', () => {
  it('registers blob paths for every key feature icon and locale', () => {
    const manifest = getKeyFeatureVideoBlobManifest()

    expect(Object.keys(manifest).sort()).toEqual([...KEY_FEATURE_ICON_KEYS].sort())
    for (const icon of KEY_FEATURE_ICON_KEYS) {
      expect(Object.keys(manifest[icon]).sort()).toEqual([...VIDEO_LOCALE_ORDER].sort())
      expect(manifest[icon].en).toBe(keyFeatureVideoBlobPath(icon, 'en'))
    }
  })

  it('maps every icon key to a human-readable video label', () => {
    for (const icon of KEY_FEATURE_ICON_KEYS) {
      expect(KEY_FEATURE_VIDEO_LABELS[icon]).toBeTruthy()
    }
  })

  it('returns seven locale slots per feature; BYOK English, Spanish, Portuguese, Hindi, Chinese, and Arabic are produced', () => {
    for (const icon of KEY_FEATURE_ICON_KEYS) {
      const locales = getKeyFeatureVideoLocales(icon)
      expect(locales.map((locale) => locale.id)).toEqual(VIDEO_LOCALE_ORDER)
      expect(getDefaultKeyFeatureVideoLocale(icon)).toBe('en')
    }

    expect(hasKeyFeatureVideo('byok')).toBe(true)
    const byokLocales = getKeyFeatureVideoLocales('byok')
    expect(byokLocales.find((locale) => locale.id === 'en')?.available).toBe(true)
    expect(byokLocales.find((locale) => locale.id === 'en')?.src).toContain(
      'BYOK-English.mp4'
    )
    expect(byokLocales.find((locale) => locale.id === 'es')?.available).toBe(true)
    expect(byokLocales.find((locale) => locale.id === 'es')?.src).toContain(
      'BYOK%20(Spanish).mp4'
    )
    expect(byokLocales.find((locale) => locale.id === 'pt')?.available).toBe(true)
    expect(byokLocales.find((locale) => locale.id === 'pt')?.src).toContain(
      'BYOK%20(Portuguese).mp4'
    )
    expect(byokLocales.find((locale) => locale.id === 'hi')?.available).toBe(true)
    expect(byokLocales.find((locale) => locale.id === 'hi')?.src).toContain(
      'BYOK%20(Hindi).mp4'
    )
    expect(byokLocales.find((locale) => locale.id === 'zh')?.available).toBe(true)
    expect(byokLocales.find((locale) => locale.id === 'zh')?.src).toContain(
      'BYOK%20(Chinese).mp4'
    )
    expect(byokLocales.find((locale) => locale.id === 'ar')?.available).toBe(true)
    expect(byokLocales.find((locale) => locale.id === 'ar')?.src).toContain(
      'BYOK%20(Arabic).mp4'
    )
    expect(
      byokLocales
        .filter((locale) => !['en', 'es', 'pt', 'hi', 'zh', 'ar'].includes(locale.id))
        .every((locale) => !locale.available)
    ).toBe(true)

    for (const icon of KEY_FEATURE_ICON_KEYS.filter((key) => key !== 'byok')) {
      expect(hasKeyFeatureVideo(icon)).toBe(false)
      expect(getKeyFeatureVideoLocales(icon).every((locale) => !locale.available)).toBe(true)
    }
  })

  it('uses predictable blob paths for BYOK and other features', () => {
    expect(keyFeatureVideoBlobPath('byok', 'en')).toBe('features/byok/BYOK (English).mp4')
    expect(keyFeatureVideoBlobPath('byok', 'es')).toBe('features/byok/BYOK (Spanish).mp4')
    expect(keyFeatureVideoBlobPath('byok', 'pt')).toBe('features/byok/BYOK (Portuguese).mp4')
    expect(keyFeatureVideoBlobPath('byok', 'hi')).toBe('features/byok/BYOK (Hindi).mp4')
    expect(keyFeatureVideoBlobPath('byok', 'zh')).toBe('features/byok/BYOK (Chinese).mp4')
    expect(keyFeatureVideoBlobPath('byok', 'ar')).toBe('features/byok/BYOK (Arabic).mp4')
    expect(keyFeatureVideoBlobPath('writersRoom', 'th')).toBe(
      "features/writersRoom/Writer's Room (Thai).mp4"
    )
  })
})

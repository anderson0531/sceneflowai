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

  it('returns seven locale slots per feature with placeholders until produced', () => {
    for (const icon of KEY_FEATURE_ICON_KEYS) {
      const locales = getKeyFeatureVideoLocales(icon)
      expect(locales.map((locale) => locale.id)).toEqual(VIDEO_LOCALE_ORDER)
      expect(locales.every((locale) => !locale.available)).toBe(true)
      expect(hasKeyFeatureVideo(icon)).toBe(false)
      expect(getDefaultKeyFeatureVideoLocale(icon)).toBe('en')
    }
  })

  it('uses predictable blob paths for BYOK and other features', () => {
    expect(keyFeatureVideoBlobPath('byok', 'en')).toBe('features/byok/BYOK (English).mp4')
    expect(keyFeatureVideoBlobPath('byok', 'es')).toBe('features/byok/BYOK (Spanish).mp4')
    expect(keyFeatureVideoBlobPath('writersRoom', 'th')).toBe(
      "features/writersRoom/Writer's Room (Thai).mp4"
    )
  })
})

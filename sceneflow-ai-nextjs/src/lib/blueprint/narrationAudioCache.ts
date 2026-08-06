import { createHash } from 'crypto'
import { head, put } from '@vercel/blob'

/**
 * Persistent cache for Blueprint narration clips.
 *
 * Narration is replayed constantly — a creator listens to the same Narrative
 * Reasoning while editing around it — and every replay used to re-synthesize
 * from scratch. Clips are immutable for a given script, voice, notes and
 * language, so they are stored under a hash of exactly those inputs and reused
 * platform-wide. This is the same content-hash reuse the share pipeline already
 * relies on in `generateShareSectionAudio.ts`.
 */

export interface NarrationAudioKey {
  /** The text actually spoken, i.e. after any translation. */
  text: string
  voiceId: string
  directorNotes?: string
  languageCode: string
  model: string
}

/**
 * Content hash for one narration clip.
 *
 * Every input that changes the audio belongs in the key. Leaving out the voice
 * or the director notes would serve a clip in the wrong performance, which is
 * worse than a cache miss.
 */
export function hashNarrationAudio(key: NarrationAudioKey): string {
  const parts = [
    key.text.trim(),
    key.voiceId.trim(),
    (key.directorNotes ?? '').trim(),
    key.languageCode.trim(),
    key.model.trim(),
  ]
  return createHash('sha256').update(parts.join('|')).digest('hex')
}

export function narrationAudioPathname(hash: string): string {
  return `audio/blueprint-narration/${hash}.mp3`
}

/** Blob storage is optional: local development runs without a token. */
export function isNarrationAudioCacheConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
}

/** Stored clip URL, or null when this is a miss or the lookup failed. */
export async function findCachedNarrationAudio(pathname: string): Promise<string | null> {
  if (!isNarrationAudioCacheConfigured()) return null
  try {
    const existing = await head(pathname)
    return existing?.url ?? null
  } catch {
    // A miss throws BlobNotFoundError, and a transient failure should cost a
    // regeneration rather than the whole request.
    return null
  }
}

/** Store a clip and return its public URL, or null when storage is unavailable. */
export async function storeNarrationAudio(
  pathname: string,
  audio: Buffer
): Promise<string | null> {
  if (!isNarrationAudioCacheConfigured()) return null
  try {
    const blob = await put(pathname, audio, {
      access: 'public',
      contentType: 'audio/mpeg',
      addRandomSuffix: false,
    })
    return blob.url
  } catch (error) {
    console.warn('[narrationAudioCache] store failed:', (error as Error)?.message)
    return null
  }
}

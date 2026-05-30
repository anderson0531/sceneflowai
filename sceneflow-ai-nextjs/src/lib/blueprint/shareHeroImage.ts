import crypto from 'crypto'
import { put } from '@vercel/blob'
import {
  downloadGcsAssetFromHttpsUrl,
  parseGcsHttpsUrl,
} from '@/lib/storage/gcsAssets'

const GCS_ASSETS_BUCKET = (process.env.GCS_ASSETS_BUCKET || 'sceneflow-assets').trim()

export function isPublicBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

export function isGcsAssetUrl(url: string): boolean {
  const parsed = parseGcsHttpsUrl(url)
  return parsed?.bucketName === GCS_ASSETS_BUCKET
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'png'
}

/** Copy private GCS hero images to public Vercel Blob for share/review pages. */
export async function mirrorBlueprintHeroToBlob(
  sourceUrl: string,
  projectId: string
): Promise<string> {
  const trimmed = sourceUrl.trim()
  if (!trimmed || !projectId.trim()) return trimmed

  if (isPublicBlobUrl(trimmed)) return trimmed
  if (!isGcsAssetUrl(trimmed)) return trimmed

  try {
    const { buffer, contentType } = await downloadGcsAssetFromHttpsUrl(trimmed)
    const hash = crypto.createHash('sha256').update(trimmed).digest('hex').slice(0, 16)
    const ext = extensionForContentType(contentType)
    const pathname = `blueprint-share/${projectId}/hero-${hash}.${ext}`

    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    console.log('[shareHeroImage] Mirrored hero to Blob:', blob.url)
    return blob.url
  } catch (error) {
    console.error('[shareHeroImage] Failed to mirror hero to Blob:', error)
    return trimmed
  }
}

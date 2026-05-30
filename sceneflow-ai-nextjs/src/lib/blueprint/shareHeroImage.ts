import crypto from 'crypto'
import { put } from '@vercel/blob'
import Project from '@/models/Project'
import {
  pickBestHeroImageUrl,
  resolveBlueprintHeroImageUrl,
} from '@/lib/blueprint/resolveBlueprintHeroImage'
import type { BlueprintSessionPayload } from '@/lib/blueprint/shareTypes'
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

function getPublicBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  return token || undefined
}

function findProjectVariantHeroUrl(
  metadata: Record<string, unknown> | null | undefined,
  variantId?: string
): string | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined

  const variants = metadata.treatmentVariants
  if (Array.isArray(variants) && variantId) {
    const match = variants.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        (item as { id?: unknown }).id === variantId
    ) as Record<string, unknown> | undefined
    const fromMatch = resolveBlueprintHeroImageUrl(match)
    if (fromMatch) return fromMatch
  }

  const filmTreatmentVariant = metadata.filmTreatmentVariant
  if (filmTreatmentVariant && typeof filmTreatmentVariant === 'object') {
    return resolveBlueprintHeroImageUrl(filmTreatmentVariant as Record<string, unknown>)
  }

  if (Array.isArray(variants) && variants.length > 0) {
    const first = variants[0]
    if (first && typeof first === 'object') {
      return resolveBlueprintHeroImageUrl(first as Record<string, unknown>)
    }
  }

  return undefined
}

export function applyHeroUrlToPayload(
  payload: BlueprintSessionPayload,
  heroImageUrl: string | undefined
): BlueprintSessionPayload {
  if (!heroImageUrl) return payload

  const treatment =
    payload.treatment && typeof payload.treatment === 'object'
      ? { ...payload.treatment }
      : {}

  const existingHero = treatment.heroImage
  const heroImage =
    existingHero && typeof existingHero === 'object' && existingHero !== null
      ? { ...(existingHero as Record<string, unknown>), url: heroImageUrl, status: 'ready' }
      : { url: heroImageUrl, status: 'ready' }

  return {
    ...payload,
    heroImageUrl,
    treatment: {
      ...treatment,
      heroImage,
    },
  }
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
    const token = getPublicBlobToken()

    const blob = await put(pathname, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      ...(token ? { token } : {}),
    })

    console.log('[shareHeroImage] Mirrored hero to Blob:', blob.url)
    return blob.url
  } catch (error) {
    console.error('[shareHeroImage] Failed to mirror hero to Blob:', error)
    return trimmed
  }
}

export async function resolveShareHeroImageUrl(
  payload: BlueprintSessionPayload
): Promise<string | undefined> {
  const payloadHero = pickBestHeroImageUrl(
    resolveBlueprintHeroImageUrl(payload),
    resolveBlueprintHeroImageUrl(payload.treatment as Record<string, unknown> | undefined)
  )

  let projectHero: string | undefined
  if (payload.projectId) {
    try {
      const project = await Project.findByPk(payload.projectId)
      const metadata = (project as { metadata?: Record<string, unknown> } | null)?.metadata
      projectHero = findProjectVariantHeroUrl(metadata, payload.variantId)
    } catch (error) {
      console.error('[shareHeroImage] Failed to load project hero:', error)
    }
  }

  const best = pickBestHeroImageUrl(projectHero, payloadHero)
  if (!best || !payload.projectId) return best

  const mirrored = await mirrorBlueprintHeroToBlob(best, payload.projectId)
  return isPublicBlobUrl(mirrored) ? mirrored : best
}

export function shouldPersistShareHeroUpdate(
  payload: BlueprintSessionPayload,
  heroImageUrl: string | undefined
): boolean {
  if (!heroImageUrl || !isPublicBlobUrl(heroImageUrl)) return false
  const current = resolveBlueprintHeroImageUrl(payload)
  return current !== heroImageUrl
}

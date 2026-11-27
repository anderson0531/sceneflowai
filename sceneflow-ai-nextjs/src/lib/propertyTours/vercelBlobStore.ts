/**
 * Vercel Blob Storage Backend for Property Tours (100% Vercel-native, zero GCP dependency).
 *
 * Stores:
 * - Published tours: `property-tours/published/{slug}.json`
 * - Uploaded / AI-staged room plates: `property-tours/assets/{slug}/{filename}`
 * - Buyer leads: `property-tours/leads/{slug}/{leadId}.json`
 */

import { list, put } from '@vercel/blob'
import type { PropertyTourDTO } from './types'

const PUBLISHED_PREFIX = 'property-tours/published/'
const ASSETS_PREFIX = 'property-tours/assets/'
const LEADS_PREFIX = 'property-tours/leads/'

export function isVercelBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())
}

export function sanitizeSlugForBlob(slug: string): string {
  return (slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export async function savePublishedTourToVercelBlob(
  tour: PropertyTourDTO
): Promise<{ url: string; pathname: string }> {
  if (!isVercelBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const safeSlug = sanitizeSlugForBlob(tour.slug)
  if (!safeSlug) {
    throw new Error('Invalid tour slug')
  }
  const pathname = `${PUBLISHED_PREFIX}${safeSlug}.json`
  const blob = await put(pathname, JSON.stringify(tour), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  })
  return { url: blob.url, pathname: blob.pathname }
}

export async function loadPublishedTourFromVercelBlob(
  slug: string
): Promise<PropertyTourDTO | null> {
  if (!isVercelBlobConfigured()) return null
  const safeSlug = sanitizeSlugForBlob(slug)
  if (!safeSlug) return null

  const targetPath = `${PUBLISHED_PREFIX}${safeSlug}.json`
  try {
    const result = await list({ prefix: targetPath, limit: 5 })
    const match = result.blobs.find((b) => b.pathname === targetPath) || result.blobs[0]
    if (!match?.url) return null

    const response = await fetch(match.url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) return null
    const parsed = (await response.json()) as PropertyTourDTO & { blueprintRooms?: PropertyTourDTO['rooms'] }
    const normalizedRooms = Array.isArray(parsed?.rooms)
      ? parsed.rooms
      : Array.isArray(parsed?.blueprintRooms)
        ? parsed.blueprintRooms
        : null
    if (!parsed || !parsed.slug || !normalizedRooms) {
      return null
    }
    return { ...parsed, rooms: normalizedRooms }
  } catch (err) {
    console.warn('[VercelBlobStore] Failed to load published tour:', safeSlug, err)
    return null
  }
}

export async function uploadDataUrlImageToVercelBlob(args: {
  dataUrl: string
  slug: string
  filenamePrefix: string
}): Promise<string> {
  if (!isVercelBlobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
  const match = args.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid base64 image data URL')
  }
  const mimeType = match[1]
  const base64Data = match[2]
  const buffer = Buffer.from(base64Data, 'base64')
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error('Image exceeds 10MB upload limit')
  }

  const ext = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
      ? 'webp'
      : 'jpg'
  const safeSlug = sanitizeSlugForBlob(args.slug) || 'demo'
  const safePrefix = args.filenamePrefix.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 60)
  const pathname = `${ASSETS_PREFIX}${safeSlug}/${safePrefix}-${Date.now()}.${ext}`

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: mimeType,
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 30,
  })
  return blob.url
}

export interface VercelBlobTourLead {
  id: string
  slug: string
  tourTitle: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string | null
  inquiryType: string
  message: string | null
  selectedRoomName: string | null
  selectedStyle: string | null
  createdAt: string
}

export async function saveLeadToVercelBlob(lead: VercelBlobTourLead): Promise<string | null> {
  if (!isVercelBlobConfigured()) return null
  const safeSlug = sanitizeSlugForBlob(lead.slug) || 'demo'
  const pathname = `${LEADS_PREFIX}${safeSlug}/${lead.id}.json`
  try {
    const blob = await put(pathname, JSON.stringify(lead), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return blob.url
  } catch (err) {
    console.warn('[VercelBlobStore] Failed to save lead:', err)
    return null
  }
}

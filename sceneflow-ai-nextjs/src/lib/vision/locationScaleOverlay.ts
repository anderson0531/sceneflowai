/**
 * Send-time architectural scale overlay for location plates.
 *
 * Stored location stills stay measure-free (library, versions, pin). Beat
 * generation composites a right-margin scale strip onto a copy so Pro sees
 * a 6ft figure / door / ceiling lock in the same 560-token slot.
 *
 * Isolated from `vertexImageClient` — this file imports `sharp`.
 */

import sharp from 'sharp'
import { fetchReferenceImageAsBase64 } from '@/lib/storage/fetchReferenceImage'
import {
  extractLocationCanonicalScale,
  type LocationCanonicalScale,
} from '@/lib/imagen/locationScaleClause'

export interface OverlayableLocationReference {
  name?: string
  imageUrl?: string
  base64Image?: string
  mimeType?: string
  role?: string
  locationName?: string
  locationDescription?: string
  canonicalScale?: Partial<LocationCanonicalScale>
}

export function isLocationReferencePartName(name?: string, role?: string, locationName?: string): boolean {
  if (role === 'location' || Boolean(locationName?.trim())) return true
  if (!name) return false
  const lower = name.toLowerCase()
  if (/\bwardrobe\b/.test(lower) || /\bidentity\b/.test(lower) || /\bprop\b/.test(lower)) {
    return false
  }
  return /\blocation\b/.test(lower)
}

function yForFeet(height: number, feet: number, ceilingHeightFt: number): number {
  const usableTop = Math.round(height * 0.06)
  const usableBottom = Math.round(height * 0.94)
  const span = Math.max(1, usableBottom - usableTop)
  const t = Math.min(1, Math.max(0, feet / Math.max(ceilingHeightFt, 1)))
  return Math.round(usableBottom - t * span)
}

export function buildLocationScaleOverlaySvg(
  width: number,
  height: number,
  scale: LocationCanonicalScale
): string {
  const stripW = Math.max(48, Math.round(width * 0.08))
  const x0 = width - stripW
  const figureTop = yForFeet(height, scale.figureHeightFt, scale.ceilingHeightFt)
  const figureBottom = yForFeet(height, 0, scale.ceilingHeightFt)
  const figureH = Math.max(8, figureBottom - figureTop)
  const cx = x0 + stripW * 0.38
  const headR = Math.max(3, Math.round(figureH * 0.07))
  const ticks = [
    { ft: 0, label: '0' },
    { ft: scale.figureHeightFt, label: `${scale.figureHeightFt}ft` },
    { ft: scale.doorHeightFt, label: `${scale.doorHeightFt}ft door` },
    { ft: scale.ceilingHeightFt, label: `${scale.ceilingHeightFt}ft ceil` },
  ]
  const uniqueTicks = ticks.filter(
    (tick, index, all) => all.findIndex((other) => other.ft === tick.ft) === index
  )
  const tickLines = uniqueTicks
    .map((tick) => {
      const y = yForFeet(height, tick.ft, scale.ceilingHeightFt)
      return (
        `<line x1="${x0 + 4}" y1="${y}" x2="${width - 6}" y2="${y}" stroke="#f4f1ea" stroke-width="2"/>` +
        `<text x="${width - 8}" y="${y - 4}" fill="#f4f1ea" font-size="${Math.max(10, Math.round(stripW * 0.22))}" ` +
        `font-family="sans-serif" text-anchor="end">${escapeXml(tick.label)}</text>`
      )
    })
    .join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<rect x="${x0}" y="0" width="${stripW}" height="${height}" fill="rgb(12,14,18)" fill-opacity="0.92"/>` +
    `<circle cx="${cx}" cy="${figureTop + headR}" r="${headR}" fill="none" stroke="#f4f1ea" stroke-width="2"/>` +
    `<line x1="${cx}" y1="${figureTop + headR * 2}" x2="${cx}" y2="${figureTop + figureH * 0.55}" stroke="#f4f1ea" stroke-width="2"/>` +
    `<line x1="${cx - headR * 1.6}" y1="${figureTop + figureH * 0.32}" x2="${cx + headR * 1.6}" y2="${figureTop + figureH * 0.32}" stroke="#f4f1ea" stroke-width="2"/>` +
    `<line x1="${cx}" y1="${figureTop + figureH * 0.55}" x2="${cx - headR * 1.4}" y2="${figureBottom}" stroke="#f4f1ea" stroke-width="2"/>` +
    `<line x1="${cx}" y1="${figureTop + figureH * 0.55}" x2="${cx + headR * 1.4}" y2="${figureBottom}" stroke="#f4f1ea" stroke-width="2"/>` +
    tickLines +
    `</svg>`
  )
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function overlayLocationScaleOnBuffer(
  buffer: Buffer,
  scale: LocationCanonicalScale
): Promise<Buffer> {
  const image = sharp(buffer)
  const meta = await image.metadata()
  const width = meta.width || 0
  const height = meta.height || 0
  if (width < 32 || height < 32) return buffer
  const svg = Buffer.from(buildLocationScaleOverlaySvg(width, height, scale))
  return sharp(buffer)
    .composite([{ input: svg, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer()
}

export async function overlayLocationScaleOnReferenceImages<T extends OverlayableLocationReference>(
  refs: T[]
): Promise<T[]> {
  const next: T[] = []
  for (const ref of refs) {
    if (!isLocationReferencePartName(ref.name, ref.role, ref.locationName)) {
      next.push(ref)
      continue
    }
    try {
      let base64Data = ref.base64Image
      if (!base64Data && ref.imageUrl) {
        const downloaded = await fetchReferenceImageAsBase64(ref.imageUrl, { label: ref.name })
        base64Data = downloaded.base64
      }
      if (!base64Data) {
        next.push(ref)
        continue
      }
      if (base64Data.includes(',')) base64Data = base64Data.split(',')[1] || base64Data
      const scale = extractLocationCanonicalScale(
        ref.locationDescription,
        ref.locationName || ref.name,
        ref.canonicalScale
      )
      const overlaid = await overlayLocationScaleOnBuffer(Buffer.from(base64Data, 'base64'), scale)
      next.push({
        ...ref,
        base64Image: overlaid.toString('base64'),
        mimeType: 'image/jpeg',
      })
      console.log(
        `[Location scale] Overlayed margin ticks on ${ref.name || ref.locationName || 'location'} ` +
          `(door=${scale.doorHeightFt}ft ceiling=${scale.ceilingHeightFt}ft)`
      )
    } catch (error) {
      console.warn(
        `[Location scale] Overlay failed for ${ref.name || ref.locationName || 'location'}:`,
        error
      )
      next.push(ref)
    }
  }
  return next
}

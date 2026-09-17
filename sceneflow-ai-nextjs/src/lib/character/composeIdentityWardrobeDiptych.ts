/**
 * Runtime identity + wardrobe helpers for beat-frame generation.
 *
 * Dual refs (portrait + full-body) are the beat-frame attachment path.
 * Stored PiP cards (full-body canvas + circular face badge) leak a framed
 * inset into stills and are no longer attached. Leftover LEFT|RIGHT sheets
 * are split into two slots rather than recomposed as a badge.
 *
 * Isolated from client-safe still-prompt modules: this file imports `sharp`
 * and fetches Blob URLs, which must not enter the browser bundle.
 */

import sharp from 'sharp'
import { fetchReferenceImageAsBase64 } from '@/lib/storage/fetchReferenceImage'

export const COMBINED_CHARACTER_REF_WIDTH = 1920
export const COMBINED_CHARACTER_REF_HEIGHT = 1080
/** @deprecated Use COMBINED_CHARACTER_REF_WIDTH. */
export const IDENTITY_WARDROBE_DIPTYCH_WIDTH = COMBINED_CHARACTER_REF_WIDTH
/** @deprecated Use COMBINED_CHARACTER_REF_HEIGHT. */
export const IDENTITY_WARDROBE_DIPTYCH_HEIGHT = COMBINED_CHARACTER_REF_HEIGHT

const LETTERBOX = { r: 20, g: 20, b: 20, alpha: 1 }

/** ~17% of 1920×1080, within the 15–20% badge-area target. */
const CANVAS_AREA = COMBINED_CHARACTER_REF_WIDTH * COMBINED_CHARACTER_REF_HEIGHT
export const FACE_BADGE_AREA_RATIO = 0.17
export const FACE_BADGE_DIAMETER = Math.round(
  2 * Math.sqrt((CANVAS_AREA * FACE_BADGE_AREA_RATIO) / Math.PI)
)
export const FACE_BADGE_RING_PX = 10
export const FACE_BADGE_PADDING_PX = 36

const DUAL_WARDROBE_TEXT =
  ', wearing the outfit shown in their wardrobe reference image'

const DIPTYCH_WARDROBE_TEXT =
  ', copy outfit from the RIGHT panel of their wardrobe diptych reference only — do not describe clothing in text'

const COMBINED_WARDROBE_TEXT =
  ', wearing the outfit shown in their character reference'

export interface IdentityWardrobeDiptych {
  base64: string
  mimeType: 'image/jpeg'
  dataUrl: string
  width: number
  height: number
}

export interface DualRefForDiptychConsolidation {
  name?: string
  hasDualReferences?: boolean
  hasWardrobeDiptych?: boolean
  identityImageUrl?: string
  wardrobeImageUrl?: string
  wardrobeDiptychImageUrl?: string
  identityReferenceId?: number
  wardrobeReferenceId?: number
  diptychReferenceId?: number
  referenceId?: number
  imageUrl?: string
  description?: string
  hasCostumeReference?: boolean
  defaultWardrobe?: string
  wardrobeAccessories?: string
  wardrobeDescription?: string
  /** Stored PiP Blob URL — skip per-beat compose. */
  isStoredPip?: boolean
  characterId?: string
  wardrobeId?: string
}

export function isSixteenByNine(width: number, height: number): boolean {
  if (width < 8 || height < 8) return false
  const ratio = width / height
  return ratio > 1.6 && ratio < 1.95
}

function columnMean(
  data: Buffer,
  info: { width: number; height: number; channels: number },
  x: number
): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  const channels = info.channels
  for (let y = 0; y < info.height; y += 1) {
    const i = (y * info.width + x) * channels
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const n = info.height
  return [r / n, g / n, b / n]
}

function rgbDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}

/**
 * Conservative vertical-seam detector for character sheets only.
 * Location establishing shots must never go through this.
 */
export async function hasVerticalCenterSeam(buffer: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buffer)
    .resize(64, 36, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const mid = Math.floor(info.width / 2)
  let neighborSum = 0
  let neighborCount = 0
  for (let x = 1; x < info.width; x += 1) {
    if (x === mid) continue
    neighborSum += rgbDist(
      columnMean(data, info, x - 1),
      columnMean(data, info, x)
    )
    neighborCount += 1
  }
  if (neighborCount === 0) return false
  const avg = neighborSum / neighborCount
  const center = rgbDist(columnMean(data, info, mid - 1), columnMean(data, info, mid))
  return center > avg * 3 && center > 40
}

export async function looksLikeHorizontalDiptych(buffer: Buffer): Promise<boolean> {
  const meta = await sharp(buffer).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!isSixteenByNine(width, height)) return false
  return hasVerticalCenterSeam(buffer)
}

export async function splitHorizontalDiptychBuffer(
  buffer: Buffer
): Promise<{ identity: Buffer; wardrobe: Buffer }> {
  const meta = await sharp(buffer).metadata()
  const width = meta.width ?? COMBINED_CHARACTER_REF_WIDTH
  const height = meta.height ?? COMBINED_CHARACTER_REF_HEIGHT
  const mid = Math.floor(width / 2)
  const identity = await sharp(buffer)
    .extract({ left: 0, top: 0, width: mid, height })
    .toBuffer()
  const wardrobe = await sharp(buffer)
    .extract({ left: mid, top: 0, width: width - mid, height })
    .toBuffer()
  return { identity, wardrobe }
}

async function jpegDataUrl(buffer: Buffer): Promise<string> {
  const jpeg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer()
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}

/** Split a leftover LEFT|RIGHT sheet into two JPEG data URLs. */
export async function splitLeftoverDiptychUrl(args: {
  diptychUrl: string
  label?: string
}): Promise<{ identityDataUrl: string; wardrobeDataUrl: string } | null> {
  const tag = args.label ? ` for ${args.label}` : ''
  try {
    const fetched = await fetchReferenceImageAsBase64(args.diptychUrl, {
      label: `${args.label || 'character'} leftover wardrobe sheet`,
    })
    const source = Buffer.from(fetched.base64, 'base64')
    const { identity, wardrobe } = await splitHorizontalDiptychBuffer(source)
    return {
      identityDataUrl: await jpegDataUrl(identity),
      wardrobeDataUrl: await jpegDataUrl(wardrobe),
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`[Scene Image] Failed to split leftover wardrobe sheet${tag}: ${reason}`)
    return null
  }
}

async function circularFaceBadge(identityBuffer: Buffer, diameter: number): Promise<Buffer> {
  const resized = await sharp(identityBuffer)
    .resize(diameter, diameter, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .toBuffer()

  const radius = diameter / 2
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}">` +
      `<circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/></svg>`
  )

  return sharp(resized)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

function badgeRingSvg(outer: number, innerDiameter: number): Buffer {
  const cx = outer / 2
  const outerR = outer / 2
  const innerR = innerDiameter / 2 + 2
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outer}" height="${outer}">` +
      `<circle cx="${cx}" cy="${cx}" r="${outerR}" fill="#f4f1ea"/>` +
      `<circle cx="${cx}" cy="${cx}" r="${innerR}" fill="#1a1a1a"/>` +
      `</svg>`
  )
}

/**
 * Full-body wardrobe as the canvas, identity close-up as a circular corner badge.
 * `contain` on the wardrobe keeps a multi-pose turnaround from being cropped
 * into a random panel.
 */
export async function composeIdentityWardrobePipBuffers(
  identityBuffer: Buffer,
  wardrobeBuffer: Buffer
): Promise<Buffer> {
  const base = await sharp(wardrobeBuffer)
    .resize(COMBINED_CHARACTER_REF_WIDTH, COMBINED_CHARACTER_REF_HEIGHT, {
      fit: 'contain',
      background: LETTERBOX,
    })
    .toBuffer()

  const diameter = FACE_BADGE_DIAMETER
  const ring = FACE_BADGE_RING_PX
  const outer = diameter + ring * 2
  const circular = await circularFaceBadge(identityBuffer, diameter)
  const left = COMBINED_CHARACTER_REF_WIDTH - FACE_BADGE_PADDING_PX - outer
  const top = FACE_BADGE_PADDING_PX

  return sharp(base)
    .composite([
      { input: badgeRingSvg(outer, diameter), left, top },
      { input: circular, left: left + ring, top: top + ring },
    ])
    .jpeg({ quality: 90 })
    .toBuffer()
}

/** @deprecated PiP replaced the two-panel stitch; kept as an alias. */
export const stitchIdentityWardrobeBuffers = composeIdentityWardrobePipBuffers

export async function composePipFromDiptychBuffer(diptychBuffer: Buffer): Promise<Buffer> {
  const { identity, wardrobe } = await splitHorizontalDiptychBuffer(diptychBuffer)
  return composeIdentityWardrobePipBuffers(identity, wardrobe)
}

function toCompositeResult(composed: Buffer): IdentityWardrobeDiptych {
  const base64 = composed.toString('base64')
  return {
    base64,
    mimeType: 'image/jpeg',
    dataUrl: `data:image/jpeg;base64,${base64}`,
    width: COMBINED_CHARACTER_REF_WIDTH,
    height: COMBINED_CHARACTER_REF_HEIGHT,
  }
}

export async function composeIdentityWardrobeDiptych(args: {
  identityUrl: string
  wardrobeUrl: string
  label?: string
}): Promise<IdentityWardrobeDiptych | null> {
  const tag = args.label ? ` for ${args.label}` : ''
  try {
    const identity = await fetchReferenceImageAsBase64(args.identityUrl, {
      label: `${args.label || 'character'} identity`,
    })
    const wardrobe = await fetchReferenceImageAsBase64(args.wardrobeUrl, {
      label: `${args.label || 'character'} wardrobe`,
    })

    const composed = await composeIdentityWardrobePipBuffers(
      Buffer.from(identity.base64, 'base64'),
      Buffer.from(wardrobe.base64, 'base64')
    )
    return toCompositeResult(composed)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(
      `[Scene Image] Failed to compose identity+wardrobe character reference${tag}: ${reason}`
    )
    return null
  }
}

export async function composeIdentityWardrobePipFromDiptychUrl(args: {
  diptychUrl: string
  label?: string
}): Promise<IdentityWardrobeDiptych | null> {
  const tag = args.label ? ` for ${args.label}` : ''
  try {
    const fetched = await fetchReferenceImageAsBase64(args.diptychUrl, {
      label: `${args.label || 'character'} combined reference`,
    })
    const source = Buffer.from(fetched.base64, 'base64')
    // Tagged wardrobe sheets are LEFT|RIGHT by contract. Always split, then
    // reassemble as a corner badge so the still model never sees two panels.
    const composed = await composePipFromDiptychBuffer(source)
    return toCompositeResult(composed)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(
      `[Scene Image] Failed to convert combined character sheet to PiP${tag}: ${reason}`
    )
    return null
  }
}

function applyCombinedSlot<T extends DualRefForDiptychConsolidation>(
  ref: T,
  composite: IdentityWardrobeDiptych,
  persistedUrl?: string
): T {
  const keepIdentity = Boolean(ref.identityImageUrl)
  const diptychReferenceId = keepIdentity
    ? ref.wardrobeReferenceId ?? ref.diptychReferenceId ?? ref.referenceId
    : ref.identityReferenceId ?? ref.wardrobeReferenceId ?? ref.diptychReferenceId ?? ref.referenceId

  let description = ref.description
  if (typeof description === 'string') {
    description = description
      .replace(DIPTYCH_WARDROBE_TEXT, COMBINED_WARDROBE_TEXT)
      .replace(DUAL_WARDROBE_TEXT, COMBINED_WARDROBE_TEXT)
  }

  const imageUrl = persistedUrl || composite.dataUrl

  return {
    ...ref,
    hasWardrobeDiptych: true,
    hasDualReferences: false,
    hasCostumeReference: true,
    isStoredPip: !!persistedUrl || ref.isStoredPip,
    wardrobeDiptychImageUrl: imageUrl,
    diptychReferenceId,
    identityReferenceId: keepIdentity ? ref.identityReferenceId : undefined,
    wardrobeReferenceId: undefined,
    identityImageUrl: keepIdentity ? ref.identityImageUrl : undefined,
    wardrobeImageUrl: undefined,
    imageUrl,
    description,
  }
}

export interface ConsolidatePipDeps {
  composePair?: typeof composeIdentityWardrobeDiptych
  composeDiptych?: typeof composeIdentityWardrobePipFromDiptychUrl
  /**
   * Upload the composed card and persist `combinedCharacterRefUrl` on the wardrobe.
   * Return the Blob URL so later beats skip compose. Tests may omit this.
   */
  persistCombined?: (args: {
    ref: DualRefForDiptychConsolidation
    composite: IdentityWardrobeDiptych
  }) => Promise<string | null>
}

/**
 * @deprecated Beat frames no longer compose PiP badges. Dual refs stay dual;
 * leftover two-panel sheets go through `expandLeftoverDiptychSheetsIntoDualSlots`.
 */
export async function consolidateBeatCharacterRefsIntoPipBadges<
  T extends DualRefForDiptychConsolidation,
>(
  refs: T[],
  depsOrCompose: ConsolidatePipDeps | typeof composeIdentityWardrobeDiptych = {}
): Promise<T[]> {
  const deps: ConsolidatePipDeps =
    typeof depsOrCompose === 'function' ? { composePair: depsOrCompose } : depsOrCompose
  const composePair = deps.composePair ?? composeIdentityWardrobeDiptych
  const composeDiptych = deps.composeDiptych ?? composeIdentityWardrobePipFromDiptychUrl
  const persistCombined = deps.persistCombined

  const persistSlot = async (ref: T, composite: IdentityWardrobeDiptych): Promise<T> => {
    const persistedUrl = persistCombined
      ? await persistCombined({ ref, composite })
      : null
    return applyCombinedSlot(ref, composite, persistedUrl ?? undefined)
  }

  return Promise.all(
    refs.map(async (ref) => {
      const diptychUrl = ref.wardrobeDiptychImageUrl
      if (
        ref.isStoredPip &&
        diptychUrl &&
        !diptychUrl.startsWith('data:')
      ) {
        return ref
      }

      if (
        ref.hasDualReferences &&
        !ref.hasWardrobeDiptych &&
        ref.identityImageUrl &&
        ref.wardrobeImageUrl
      ) {
        const composite = await composePair({
          identityUrl: ref.identityImageUrl,
          wardrobeUrl: ref.wardrobeImageUrl,
          label: ref.name,
        })
        if (!composite) {
          console.warn(
            `[Scene Image] Combined character compose failed for ${ref.name || 'character'}; keeping dual references`
          )
          return ref
        }
        console.log(
          `[Scene Image] ✓ Consolidated dual references for ${ref.name || 'character'} into a character reference`
        )
        return persistSlot(ref, composite)
      }

      if (ref.hasWardrobeDiptych && diptychUrl && !diptychUrl.startsWith('data:')) {
        const composite = await composeDiptych({
          diptychUrl,
          label: ref.name,
        })
        if (!composite) {
          console.warn(
            `[Scene Image] Combined-sheet conversion failed for ${ref.name || 'character'}; keeping original sheet`
          )
          return ref
        }
        console.log(
          `[Scene Image] ✓ Converted combined character sheet for ${ref.name || 'character'} into a corner-badge reference`
        )
        return persistSlot(ref, composite)
      }

      return ref
    })
  )
}

function applyDualSlotsFromLeftoverSheet<T extends DualRefForDiptychConsolidation>(
  ref: T,
  identityUrl: string,
  wardrobeUrl: string
): T {
  const identityReferenceId =
    ref.identityReferenceId ?? ref.diptychReferenceId ?? ref.referenceId
  const wardrobeReferenceId =
    ref.wardrobeReferenceId ??
    ref.diptychReferenceId ??
    (identityReferenceId != null ? identityReferenceId + 1 : undefined)

  let description = ref.description
  if (typeof description === 'string') {
    description = description.replace(DIPTYCH_WARDROBE_TEXT, DUAL_WARDROBE_TEXT)
  }

  return {
    ...ref,
    hasWardrobeDiptych: false,
    hasDualReferences: true,
    hasCostumeReference: true,
    isStoredPip: false,
    wardrobeDiptychImageUrl: undefined,
    diptychReferenceId: undefined,
    identityReferenceId,
    wardrobeReferenceId,
    identityImageUrl: identityUrl,
    wardrobeImageUrl: wardrobeUrl,
    imageUrl: identityUrl,
    description,
  }
}

function dropLeftoverSheet<T extends DualRefForDiptychConsolidation>(ref: T): T {
  return {
    ...ref,
    hasWardrobeDiptych: false,
    isStoredPip: false,
    wardrobeDiptychImageUrl: undefined,
    diptychReferenceId: undefined,
    imageUrl: ref.identityImageUrl ?? ref.wardrobeImageUrl ?? ref.imageUrl,
  }
}

export interface ExpandLeftoverDiptychDeps {
  splitDiptych?: typeof splitLeftoverDiptychUrl
}

/**
 * Leftover LEFT|RIGHT sheets cannot go out as one image (split-screen leak)
 * and must not be recomposed as a circular PiP badge (inset leak). Split them
 * into identity + wardrobe slots. Prefer the original portrait for identity;
 * use the RIGHT panel for wardrobe. Stored PiP URLs are dropped.
 */
export async function expandLeftoverDiptychSheetsIntoDualSlots<
  T extends DualRefForDiptychConsolidation,
>(
  refs: T[],
  deps: ExpandLeftoverDiptychDeps = {}
): Promise<T[]> {
  const splitDiptych = deps.splitDiptych ?? splitLeftoverDiptychUrl

  return Promise.all(
    refs.map(async (ref) => {
      if (ref.hasDualReferences && ref.identityImageUrl && ref.wardrobeImageUrl) {
        if (!ref.hasWardrobeDiptych && !ref.isStoredPip) return ref
        return dropLeftoverSheet(ref)
      }

      if (ref.isStoredPip) {
        console.warn(
          `[Scene Image] Ignoring stored PiP character card for ${ref.name || 'character'}; using discrete identity/wardrobe slots`
        )
        return dropLeftoverSheet(ref)
      }

      const diptychUrl = ref.wardrobeDiptychImageUrl
      if (!ref.hasWardrobeDiptych || !diptychUrl) return ref

      const split = await splitDiptych({
        diptychUrl,
        label: ref.name,
      })
      if (!split) {
        console.warn(
          `[Scene Image] Leftover sheet split failed for ${ref.name || 'character'}; keeping identity only`
        )
        return dropLeftoverSheet(ref)
      }

      const identityUrl = ref.identityImageUrl || split.identityDataUrl
      console.log(
        `[Scene Image] ✓ Split leftover wardrobe sheet for ${ref.name || 'character'} into identity + wardrobe slots`
      )
      return applyDualSlotsFromLeftoverSheet(ref, identityUrl, split.wardrobeDataUrl)
    })
  )
}

/** @deprecated Use consolidateBeatCharacterRefsIntoPipBadges. */
export const consolidateBeatDualRefsIntoDiptychs = consolidateBeatCharacterRefsIntoPipBadges

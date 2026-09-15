/**
 * Runtime identity + wardrobe composite for beat-frame generation.
 *
 * Dual refs (portrait + turnaround) consume two multimodal slots per person and
 * hit the eco Flash cap of 6 as soon as a two-hander also carries a location
 * and a prop — the lantern is the first thing dropped. Stitching LEFT=face /
 * RIGHT=outfit into one 16:9 card reuses the existing diptych consumption
 * instructions and leaves room for both props.
 *
 * Isolated from client-safe still-prompt modules: this file imports `sharp`
 * and fetches Blob URLs, which must not enter the browser bundle.
 */

import sharp from 'sharp'
import { fetchReferenceImageAsBase64 } from '@/lib/storage/fetchReferenceImage'

export const IDENTITY_WARDROBE_DIPTYCH_WIDTH = 1920
export const IDENTITY_WARDROBE_DIPTYCH_HEIGHT = 1080

const PANEL_WIDTH = IDENTITY_WARDROBE_DIPTYCH_WIDTH / 2
const LETTERBOX = { r: 20, g: 20, b: 20, alpha: 1 }

export interface IdentityWardrobeDiptych {
  base64: string
  mimeType: 'image/jpeg'
  dataUrl: string
  width: number
  height: number
}

const DUAL_WARDROBE_TEXT =
  ', wearing the outfit shown in their wardrobe reference image'

const DIPTYCH_WARDROBE_TEXT =
  ', copy outfit from the RIGHT panel of their wardrobe diptych reference only — do not describe clothing in text'

/**
 * Stitch a portrait (cover, left) and a wardrobe sheet (contain, right) onto
 * a 16:9 canvas. `contain` on the wardrobe side keeps a multi-pose turnaround
 * from being cropped into a random panel.
 */
export async function stitchIdentityWardrobeBuffers(
  identityBuffer: Buffer,
  wardrobeBuffer: Buffer
): Promise<Buffer> {
  const left = await sharp(identityBuffer)
    .resize(PANEL_WIDTH, IDENTITY_WARDROBE_DIPTYCH_HEIGHT, {
      fit: 'cover',
      position: 'center',
    })
    .toBuffer()

  const right = await sharp(wardrobeBuffer)
    .resize(PANEL_WIDTH, IDENTITY_WARDROBE_DIPTYCH_HEIGHT, {
      fit: 'contain',
      background: LETTERBOX,
    })
    .toBuffer()

  return sharp({
    create: {
      width: IDENTITY_WARDROBE_DIPTYCH_WIDTH,
      height: IDENTITY_WARDROBE_DIPTYCH_HEIGHT,
      channels: 3,
      background: { r: LETTERBOX.r, g: LETTERBOX.g, b: LETTERBOX.b },
    },
  })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: PANEL_WIDTH, top: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer()
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

    const composed = await stitchIdentityWardrobeBuffers(
      Buffer.from(identity.base64, 'base64'),
      Buffer.from(wardrobe.base64, 'base64')
    )
    const base64 = composed.toString('base64')
    return {
      base64,
      mimeType: 'image/jpeg',
      dataUrl: `data:image/jpeg;base64,${base64}`,
      width: IDENTITY_WARDROBE_DIPTYCH_WIDTH,
      height: IDENTITY_WARDROBE_DIPTYCH_HEIGHT,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(
      `[Scene Image] Failed to stitch identity+wardrobe diptych${tag}: ${reason}`
    )
    return null
  }
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
}

/**
 * For beat frames, replace a surviving identity+wardrobe pair with one
 * composite slot. Fetch/stitch failure keeps the dual refs so the frame
 * still generates.
 */
export async function consolidateBeatDualRefsIntoDiptychs<
  T extends DualRefForDiptychConsolidation,
>(
  refs: T[],
  compose: typeof composeIdentityWardrobeDiptych = composeIdentityWardrobeDiptych
): Promise<T[]> {
  return Promise.all(
    refs.map(async (ref) => {
      if (
        !ref.hasDualReferences ||
        ref.hasWardrobeDiptych ||
        !ref.identityImageUrl ||
        !ref.wardrobeImageUrl
      ) {
        return ref
      }

      const composite = await compose({
        identityUrl: ref.identityImageUrl,
        wardrobeUrl: ref.wardrobeImageUrl,
        label: ref.name,
      })
      if (!composite) {
        console.warn(
          `[Scene Image] Composite stitch failed for ${ref.name || 'character'}; keeping dual references`
        )
        return ref
      }

      const diptychReferenceId =
        ref.identityReferenceId ?? ref.wardrobeReferenceId ?? ref.referenceId
      console.log(
        `[Scene Image] ✓ Consolidated dual references for ${ref.name || 'character'} into identity+wardrobe composite`
      )

      return {
        ...ref,
        hasWardrobeDiptych: true,
        hasDualReferences: false,
        hasCostumeReference: true,
        wardrobeDiptychImageUrl: composite.dataUrl,
        diptychReferenceId,
        identityReferenceId: undefined,
        wardrobeReferenceId: undefined,
        identityImageUrl: undefined,
        wardrobeImageUrl: undefined,
        imageUrl: composite.dataUrl,
        defaultWardrobe: undefined,
        wardrobeAccessories: undefined,
        description: typeof ref.description === 'string'
          ? ref.description.replace(DUAL_WARDROBE_TEXT, DIPTYCH_WARDROBE_TEXT)
          : ref.description,
      }
    })
  )
}

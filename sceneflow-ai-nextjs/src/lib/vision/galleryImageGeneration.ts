/** Options passed on manual Pre-Vis gallery generate calls (not Express). */
export const GALLERY_MANUAL_GENERATE_OPTS = {
  generationMode: 'default' as const,
  /** PiP default: combine character facial identity + scene-assigned wardrobe reference. */
  includeWardrobeReferenceImages: true,
  includeWardrobeDiptych: true,
}

export const GALLERY_DIRECT_GENERATE_OPTS = {
  generationMode: 'direct' as const,
  includeWardrobeReferenceImages: true,
  includeWardrobeDiptych: true,
  fromDialog: true,
}

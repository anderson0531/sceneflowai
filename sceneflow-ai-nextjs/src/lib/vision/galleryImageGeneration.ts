/** Options passed on manual Pre-Vis gallery generate calls (not Express). */
export const GALLERY_MANUAL_GENERATE_OPTS = {
  generationMode: 'default' as const,
  /** Identity-first default: send facial identity portrait + consistent wardrobe text description. */
  includeWardrobeReferenceImages: false,
  includeWardrobeDiptych: false,
}

export const GALLERY_DIRECT_GENERATE_OPTS = {
  generationMode: 'direct' as const,
  includeWardrobeReferenceImages: false,
  includeWardrobeDiptych: false,
  fromDialog: true,
}

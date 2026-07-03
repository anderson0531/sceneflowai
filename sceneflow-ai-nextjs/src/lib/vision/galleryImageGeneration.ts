/** Options passed on manual Pre-Vis gallery generate calls (not Express). */
export const GALLERY_MANUAL_GENERATE_OPTS = {
  generationMode: 'default' as const,
  /** Enable full-body wardrobe refs alongside identity headshots (face-first dual refs). */
  includeWardrobeReferenceImages: true,
  includeWardrobeDiptych: true,
}

export const GALLERY_DIRECT_GENERATE_OPTS = {
  generationMode: 'direct' as const,
  includeWardrobeReferenceImages: true,
  includeWardrobeDiptych: true,
  fromDialog: true,
}

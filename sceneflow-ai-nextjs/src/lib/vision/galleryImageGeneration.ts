/** Options passed on manual Pre-Vis gallery generate calls (not Express). */
export const GALLERY_MANUAL_GENERATE_OPTS = {
  generationMode: 'default' as const,
  includeWardrobeReferenceImages: false,
}

export const GALLERY_DIRECT_GENERATE_OPTS = {
  generationMode: 'direct' as const,
  includeWardrobeReferenceImages: false,
  includeWardrobeDiptych: true,
  fromDialog: true,
}

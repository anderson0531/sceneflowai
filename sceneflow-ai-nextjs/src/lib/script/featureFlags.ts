/**
 * Script-related feature flags.
 *
 * Centralised so call sites (UI, API routes, migration loader) can guard
 * new behaviour without sprinkling string literals.
 */

/**
 * SCRIPT_SEGMENTS_V2: the segmented Production Script ships as the
 * primary creative source-of-truth. Legacy flat `scene.dialogue` /
 * `scene.sfx` / `scene.narration` fields are still written during the
 * back-compat window so existing audio + translation lookups keep
 * working; they will be removed in a follow-up pass once all consumers
 * have been ported to read by `lineId` / `sfxId`.
 */
export const SCRIPT_SEGMENTS_V2 = true

/**
 * SCRIPT_SEGMENTS_V2_HIDE_LEGACY_UI: when `true`, hide the standalone
 * Scene Narration card, the flat dialogue list, the per-scene Sound
 * Effects card, and the SegmentBuilder first-time onboarding for any
 * scene that already carries `segments[]`. The Script tab uses this flag
 * (effectively `true`) to render the new Segment cards instead.
 */
export const SCRIPT_SEGMENTS_V2_HIDE_LEGACY_UI = true

/**
 * SceneFlow Golden Evaluation Suite
 *
 * Canonical benchmark fixtures for Admin MIUA Side-by-Side Bake-Offs.
 * Covers the exact workflows where SceneFlow pushes ahead of the model curve:
 *  - Sparse 1–2 sentence Blueprints across diverse non-noir genres (anti-cliché & naming test)
 *  - Dense multi-era / ensemble treatments
 *  - Longform 60-minute script continuity & JSON reliability chunks
 *  - Audience Resonance calibration
 */

export type GoldenFixtureCategory =
  | 'sparse_blueprint'
  | 'dense_blueprint'
  | 'longform_script_chunk'
  | 'audience_resonance'

export interface GoldenEvalFixture {
  id: string
  label: string
  category: GoldenFixtureCategory
  genre: string
  tone: string
  targetAudience: string
  targetMinutes: number
  input: string
  /** Names explicitly supplied by the creator (must be preserved, not treated as AI clichés) */
  userSuppliedNames?: string[]
}

export const GOLDEN_EVAL_SUITE: readonly GoldenEvalFixture[] = [
  {
    id: 'bp-sparse-culinary',
    label: 'Sparse Blueprint: Coastal Bakery Inheritance',
    category: 'sparse_blueprint',
    genre: 'Drama',
    tone: 'Warm and heartwarming',
    targetAudience: 'Families and food-story lovers',
    targetMinutes: 45,
    input: 'A retired maritime mechanic inherits her sister\'s struggling sourdough bakery in a foggy fishing town and has one summer festival to keep the lease.',
  },
  {
    id: 'bp-sparse-scifi',
    label: 'Sparse Blueprint: Orbital Seed Vault',
    category: 'sparse_blueprint',
    genre: 'Sci-Fi',
    tone: 'Cinematic and wondrous',
    targetAudience: 'Thoughtful sci-fi fans',
    targetMinutes: 60,
    input: 'Two botanists aboard a decommissioned lunar greenhouse discover a dormant heirloom plant that responds to human acoustic harmonies.',
  },
  {
    id: 'bp-sparse-comedy',
    label: 'Sparse Blueprint: Community Brass Band',
    category: 'sparse_blueprint',
    genre: 'Comedy',
    tone: 'Light comedic and charming',
    targetAudience: 'All ages',
    targetMinutes: 35,
    input: 'An overly competitive wedding planner gets roped into saving a chaotic small-town brass band before the annual parade competition.',
  },
  {
    id: 'bp-sparse-doc',
    label: 'Sparse Blueprint: Night-Shift Ferry Crews',
    category: 'sparse_blueprint',
    genre: 'Documentary',
    tone: 'Observational and authentic',
    targetAudience: 'Documentary viewers',
    targetMinutes: 40,
    input: 'A documentary portrait of the overnight ferry engineers and deckhands who keep an island archipelago connected through winter storms.',
  },
  {
    id: 'bp-dense-memoir',
    label: 'Dense Blueprint: Three-Generation Watchmaker Saga',
    category: 'dense_blueprint',
    genre: 'Drama',
    tone: 'Nostalgic and emotionally rich',
    targetAudience: 'Adult drama audiences',
    targetMinutes: 90,
    input: 'Spanning 1964 Kyoto, 1991 Osaka, and 2024 Sapporo, master horologist Kenji Morita passes a flawed brass pocket watch across three generations as his granddaughter uncovers why he stopped repairing clocks after the 1995 earthquake.',
    userSuppliedNames: ['Kenji Morita'],
  },
  {
    id: 'bp-dense-heist',
    label: 'Dense Blueprint: Museum Restoration Rivalry',
    category: 'dense_blueprint',
    genre: 'Thriller',
    tone: 'Taut and witty',
    targetAudience: 'Prestige thriller viewers',
    targetMinutes: 75,
    input: 'An art conservator hired to authenticate a disputed Renaissance tapestry realizes the museum\'s head curator forged the provenance report—and the real tapestry is hidden inside the curator\'s upcoming gala exhibit.',
  },
  {
    id: 'script-longform-handoff',
    label: 'Longform Script Chunk: Act II Midpoint Handoff',
    category: 'longform_script_chunk',
    genre: 'Drama',
    tone: 'Cinematic',
    targetAudience: 'Feature drama audiences',
    targetMinutes: 65,
    input: 'Write 2 tightly connected scenes (Scene 14 and Scene 15) continuing from the Rolling Continuity Ledger: Tessa Kowalski just discovered the harbor master hid the storm-surge ledger inside the drydock office; Gideon Okafor refuses to sign the evacuation delay.',
    userSuppliedNames: ['Tessa Kowalski', 'Gideon Okafor'],
  },
  {
    id: 'script-longform-climax',
    label: 'Longform Script Chunk: Ensemble Climax Pressure',
    category: 'longform_script_chunk',
    genre: 'Sci-Fi',
    tone: 'Suspenseful and wondrous',
    targetAudience: 'Feature sci-fi audiences',
    targetMinutes: 90,
    input: 'Write 2 escalating climax scenes (Scene 28 and Scene 29) inside the orbital greenhouse where Nadia Bhatia and Tomas Delgado must synchronize the acoustic vent array before the de-orbit burn triggers.',
    userSuppliedNames: ['Nadia Bhatia', 'Tomas Delgado'],
  },
] as const

export function selectGoldenFixtures(opts?: {
  categories?: GoldenFixtureCategory[]
  limit?: number
}): GoldenEvalFixture[] {
  let list = [...GOLDEN_EVAL_SUITE]
  if (opts?.categories && opts.categories.length > 0) {
    const allowed = new Set(opts.categories)
    list = list.filter((f) => allowed.has(f.category))
  }
  if (opts?.limit && opts.limit > 0) {
    list = list.slice(0, opts.limit)
  }
  return list
}

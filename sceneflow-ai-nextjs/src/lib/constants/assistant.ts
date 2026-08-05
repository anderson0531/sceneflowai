/**
 * Canonical naming for the AI-assisted edit feature.
 *
 * One feature had three names: "Intelligent Assistant Director" in marketing,
 * "Blueprint Editor" in the Blueprint dialog, and "Intelligent Assistant Writer"
 * in the scene script dialog — with triggers labelled Refine, Direct, Open
 * editor, Improve in editor, Open guided revision, and Edit & Apply. Every
 * surface now reads from here so app and marketing cannot drift again.
 */

export const ASSISTANT = {
  /** Marketing, onboarding, and the one place per dialog the brand is stated. */
  full: 'Intelligent Assistant Director',
  abbr: 'IAD',
  /** Button and heading label everywhere in-app. Short enough for a chip. */
  short: 'Assistant',
  tooltip:
    'Intelligent Assistant Director — describe the change in plain words and it revises for you',
} as const

/** Marketing headline form, e.g. the Key Features card title. */
export const ASSISTANT_FULL_WITH_ABBR = `${ASSISTANT.full} (${ASSISTANT.abbr})`

/**
 * The icon lives in ./assistantIcon so this module stays string-only. API routes
 * import these labels, and they should not pull in an icon library to do it.
 */

/** Dialog title for an Assistant surface, e.g. "Assistant · Blueprint". */
export function assistantTitle(context: string): string {
  return `${ASSISTANT.short} · ${context}`
}

/** Accessible name for a scoped trigger, e.g. "Assistant — Beats & Runtime". */
export function assistantAriaLabel(scopeLabel?: string): string {
  return scopeLabel ? `${ASSISTANT.short} — ${scopeLabel}` : ASSISTANT.short
}

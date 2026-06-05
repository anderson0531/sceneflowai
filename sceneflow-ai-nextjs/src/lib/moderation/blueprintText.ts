/**
 * Aggregate blueprint input/output text for Hive text moderation.
 */

function joinParts(parts: Array<string | undefined | null>): string {
  return parts.filter((p) => typeof p === 'string' && p.trim()).join('\n')
}

/** User-provided blueprint analyze input (v2 shape + common variants). */
export function aggregateBlueprintInputText(input: Record<string, unknown>): string {
  const beats = Array.isArray(input.beats) ? input.beats : []
  const beatText = beats
    .map((b: Record<string, unknown>) =>
      joinParts([
        b.beat_title as string,
        b.beat_description as string,
        b.title as string,
        b.description as string,
        b.scene as string,
      ])
    )
    .join('\n')

  const characters = Array.isArray(input.characters) ? input.characters : []
  const charText = characters
    .map((c: Record<string, unknown>) =>
      joinParts([c.name as string, c.role as string, c.description as string])
    )
    .join('\n')

  return joinParts([
    input.title as string,
    input.logline as string,
    input.description as string,
    input.synopsis as string,
    input.input as string,
    input.targetAudience as string,
    input.keyMessage as string,
    input.tone as string,
    input.genre as string,
    beatText,
    charText,
  ])
}

/** Generated blueprint / film treatment text fields. */
export function aggregateBlueprintOutputText(data: unknown): string {
  if (!data) return ''
  const items = Array.isArray(data) ? data : [data]
  return items
    .map((item) => {
      const d = item as Record<string, unknown>
      const beats = Array.isArray(d.beats) ? d.beats : []
      const beatText = beats
        .map((b: Record<string, unknown>) =>
          joinParts([
            b.beat_title as string,
            b.beat_description as string,
            b.title as string,
            b.description as string,
            b.scene as string,
          ])
        )
        .join('\n')
      const characters = Array.isArray(d.characters) ? d.characters : []
      const charText = characters
        .map((c: Record<string, unknown>) =>
          joinParts([c.name as string, c.role as string, c.description as string])
        )
        .join('\n')
      return joinParts([
        d.title as string,
        d.logline as string,
        d.synopsis as string,
        d.content as string,
        beatText,
        charText,
      ])
    })
    .filter(Boolean)
    .join('\n\n')
}

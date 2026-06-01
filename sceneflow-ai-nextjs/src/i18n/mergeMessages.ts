/**
 * Deep-merge locale messages over English base.
 * Locale scalars and arrays win; nested objects are merged recursively.
 */
export function mergeMessages(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      out[key] = mergeMessages(
        base[key] as Record<string, unknown>,
        value as Record<string, unknown>
      )
    } else {
      out[key] = value
    }
  }
  return out
}

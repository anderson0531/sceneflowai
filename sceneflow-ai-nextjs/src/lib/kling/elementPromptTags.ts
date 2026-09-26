/**
 * Place Kling `<<<element>>>` tags on the subject they name.
 * Kept separate from element registration so video prompt assembly does not
 * load the Project model.
 */

export interface ElementPromptBinding {
  tag: string
  /** `person [1]` / `prop [1]` / `location [1]` when the prompt uses those tokens. */
  token?: string
  /** Display names or aliases that may name this subject in the prompt. */
  names: string[]
}

export function buildElementPromptBindings(
  sources: Array<{
    id: string
    name: string
    type: 'character' | 'prop' | 'location'
    matchNames?: string[]
  }>,
  bindings: Array<{ sourceId: string; name: string; elementId: string }>
): ElementPromptBinding[] {
  let person = 0
  let prop = 0
  let location = 0
  const placed: ElementPromptBinding[] = []
  for (const source of sources) {
    const found = bindings.find(
      (binding) => binding.sourceId === source.id || binding.name === source.name
    )
    if (!found?.elementId) continue
    let token: string
    if (source.type === 'prop') token = `prop [${++prop}]`
    else if (source.type === 'location') token = `location [${++location}]`
    else token = `person [${++person}]`
    const names = [
      ...new Set(
        [source.name, found.name, ...(source.matchNames || [])]
          .map((name) => name?.trim())
          .filter(Boolean)
      ),
    ] as string[]
    placed.push({ tag: `<<<${found.elementId}>>>`, token, names })
  }
  return placed
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Put each Kling tag on the subject it names. A token already in the prompt
 * wins; otherwise the display name. Tags with no subject in the text lead the
 * prompt as `person [1] <<<id>>>` instead of a trailing dump.
 */
export function injectElementTagsIntoPrompt(
  prompt: string,
  tagsOrBindings: string[] | ElementPromptBinding[]
): string {
  if (!tagsOrBindings.length) return prompt
  const bindings: ElementPromptBinding[] =
    typeof tagsOrBindings[0] === 'string'
      ? (tagsOrBindings as string[]).map((tag) => ({ tag, names: [] }))
      : (tagsOrBindings as ElementPromptBinding[])
  return placeElementTagsOnSubjects(prompt, bindings)
}

function placeElementTagsOnSubjects(prompt: string, bindings: ElementPromptBinding[]): string {
  let result = prompt
  const unused: string[] = []
  for (const binding of bindings) {
    const tag = binding.tag?.trim()
    if (!tag || result.includes(tag)) continue
    const token = binding.token?.trim()
    if (token && result.includes(token)) {
      result = result.replace(token, `${token} ${tag}`)
      continue
    }
    const name = [...binding.names]
      .sort((a, b) => b.length - a.length)
      .find((candidate) => new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'i').test(result))
    if (name) {
      result = result.replace(
        new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i'),
        `${token || name} ${tag}`
      )
      continue
    }
    const subject = token || binding.names.find((candidate) => candidate.trim())
    unused.push(subject ? `${subject} ${tag}` : tag)
  }
  if (unused.length === 0) return result
  const lead = unused.join('\n')
  return result.trim() ? `${lead}\n${result.trim()}` : lead
}

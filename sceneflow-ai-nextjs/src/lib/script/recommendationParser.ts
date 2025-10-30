export interface ParsedRecommendation {
  problem: string
  effect?: string
  examples: string[]
  actions: string[]
}

/**
 * Parse an unstructured recommendation description into structured parts.
 * Heuristics-based: extracts example scenes and actionable lists if present.
 */
export function parseRecommendationText(text: string): ParsedRecommendation {
  if (!text) {
    return { problem: '', effect: undefined, examples: [], actions: [] }
  }

  let working = text.trim()

  // 1) Prefer JSON block if present
  try {
    const codeBlockJson = working.match(/```json\s*([\s\S]*?)\s*```/i)
    const rawJson = codeBlockJson ? codeBlockJson[1] : null
    const jsonCandidate = rawJson || (working.trim().startsWith('{') ? working : null)
    if (jsonCandidate) {
      const parsed = JSON.parse(jsonCandidate)
      const first = parsed?.recommendations?.[0]
      if (first) {
        return {
          problem: (first.problem || '').toString().trim(),
          effect: (first.impact || '').toString().trim() || undefined,
          examples: Array.isArray(first.examples) ? first.examples.slice(0, 3).map((x: any) => String(x)) : [],
          actions: Array.isArray(first.actions) ? first.actions.map((x: any) => String(x)) : []
        }
      }
    }
  } catch {
    // fall through to tagged parsing
  }

  // 2) Tagged parsing: [Problem], [Impact], [Solution], [Examples]
  const extractTag = (src: string, tag: string): { value: string; rest: string } => {
    const regex = new RegExp(`\\[${tag}\\]\\s*:?(.*?)(?=\\n\\s*\\[[A-Za-z]+\\]\\s*:|$)`, 'is')
    const m = src.match(regex)
    if (m) {
      const value = (m[1] || '').trim()
      const rest = src.replace(m[0], '').trim()
      return { value, rest }
    }
    return { value: '', rest: src }
  }

  let tagged = working
  const prob = extractTag(tagged, 'Problem'); tagged = prob.rest
  const imp = extractTag(tagged, 'Impact'); tagged = imp.rest
  const sol = extractTag(tagged, 'Solution'); tagged = sol.rest
  const ex = extractTag(tagged, 'Examples'); tagged = ex.rest

  const toList = (s: string): string[] => {
    if (!s) return []
    // split by numbered or bullet lines
    const numbered = s.match(/\n?\s*\d+\.[\s\S]*?(?=\n\s*\d+\.|$)/g)
    if (numbered) return numbered.map(i => i.replace(/^\s*\d+\.\s*/, '').trim()).filter(Boolean)
    return s.split(/\n\s*-\s+|\n+/).map(x => x.trim()).filter(Boolean)
  }

  if (prob.value || imp.value || sol.value || ex.value) {
    return {
      problem: prob.value.replace(/\*\*/g, '').trim(),
      effect: imp.value.replace(/\*\*/g, '').trim() || undefined,
      actions: toList(sol.value),
      examples: toList(ex.value).slice(0, 3)
    }
  }

  // Extract Effect section (handles **Effect:** or similar)
  let effect: string | undefined
  const effectHeader = /(\*\*\s*)?effect(\s*\*\*)?\s*:/i
  if (effectHeader.test(working)) {
    const parts = working.split(effectHeader)
    // parts format: [before, (match groups...), afterEffect]
    // Reconstruct problem+examples source from 'before' + remaining after afterEffect removed later
    const tail = parts[parts.length - 1].trim()
    // Effect generally ends before next known header like Actionable or Examples
    const untilNext = tail.split(/(\*\*\s*)?(actionable\s+recommendations?|examples?)(\s*\*\*)?\s*:/i)[0]
    effect = untilNext.replace(/\*\*/g, '').trim()
    // Remove effect portion from working to avoid duplication
    working = working.replace(effectHeader, 'Effect:').replace(`Effect:${tail}`, '').trim()
  }

  // Extract Example Scenes section (handles **Example Scenes:** or similar)
  const examples: string[] = []
  const exampleHeader = /(\*\*\s*)?example\s+scenes?(\s*\*\*)?\s*:/i
  if (exampleHeader.test(working)) {
    const [before, after] = working.split(exampleHeader)
    // after now begins with the content following the header match
    // Split examples by dash bullets like "- **Scene X:** ..."
    const exMatches = after.split(/\s+-\s+/).map(s => s.trim()).filter(Boolean)
    // First item may still contain introductory residue; keep items that look like scenes or sentences
    exMatches.forEach(item => {
      const cleaned = item.replace(/^\*\*|\*\*$/g, '').trim()
      if (cleaned) examples.push(cleaned)
    })
    // Problem becomes the part before examples
    working = before.trim()
  }

  // Extract Actionable Recommendations (handles numbered list like 1. or bullets)
  const actions: string[] = []
  const actionHeader = /(\*\*\s*)?actionable\s+recommendations?(\s*\*\*)?\s*:/i
  if (actionHeader.test(text)) {
    const parts = text.split(actionHeader)
    const tail = parts[parts.length - 1]
    // Match numbered items
    const numberItems = tail.match(/\n?\s*\d+\.[\s\S]*?(?=\n\s*\d+\.|$)/g)
    if (numberItems) {
      numberItems.forEach(item => {
        const cleaned = item.replace(/^\s*\d+\.\s*/, '').trim()
        if (cleaned) actions.push(cleaned)
      })
    } else {
      // Fallback: bullet items
      const bulletItems = tail.split(/\n\s*-\s+/).map(s => s.trim())
      bulletItems.forEach(item => {
        if (item) actions.push(item)
      })
    }
  }

  // Remaining working string is the problem statement (strip bold markers)
  const problem = working.replace(/\*\*/g, '').trim()

  // Limit examples to max 3 for readability
  const limitedExamples = examples.slice(0, 3)

  return { problem, effect, examples: limitedExamples, actions }
}



export interface ParsedRecommendation {
  problem: string
  examples: string[]
  actions: string[]
}

/**
 * Parse an unstructured recommendation description into structured parts.
 * Heuristics-based: extracts example scenes and actionable lists if present.
 */
export function parseRecommendationText(text: string): ParsedRecommendation {
  if (!text) {
    return { problem: '', examples: [], actions: [] }
  }

  let working = text.trim()

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

  return { problem, examples, actions }
}



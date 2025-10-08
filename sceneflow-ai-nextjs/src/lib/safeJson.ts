export const strictJsonPromptSuffix = `\n\nIMPORTANT OUTPUT RULES:\n- Return ONLY valid JSON.\n- Do NOT include markdown fences (e.g., \`\`\`json).\n- Do NOT include backticks, comments, or explanations.\n- Do NOT include any text before or after the JSON object.\n`

function extractFirstFenced(text: string): string | null {
  const start = text.indexOf('```')
  if (start === -1) return null
  const end = text.indexOf('```', start + 3)
  if (end === -1 || end <= start) return null
  let inner = text.slice(start + 3, end).trim()
  const nl = inner.indexOf('\n')
  const firstLine = nl !== -1 ? inner.slice(0, nl) : inner
  if (/^[a-zA-Z]+\s*$/.test(firstLine)) {
    inner = (nl !== -1 ? inner.slice(nl + 1) : '').trim()
  }
  return inner
}

function extractBalancedJson(text: string): string | null {
  let inString = false
  let escape = false
  let depth = 0
  let start = -1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (!inString) {
      if (ch === '{') {
        if (depth === 0) start = i
        depth++
      } else if (ch === '}') {
        depth--
        if (depth === 0 && start !== -1) {
          return text.slice(start, i + 1)
        }
      } else if (ch === '"') {
        inString = true
        escape = false
      }
    } else {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
    }
  }
  return null
}

export function safeParseJsonFromText(text: string): any {
  if (!text) throw new Error('Empty model response')
  let candidate = text.trim()

  // Attempt direct parse first
  try { return JSON.parse(candidate) } catch {}

  // Try extracting fenced block
  const fenced = extractFirstFenced(candidate)
  if (fenced) {
    candidate = fenced
    try { return JSON.parse(candidate) } catch {}
  }

  // Try balanced object extraction across entire text
  const balanced = extractBalancedJson(candidate)
  if (balanced) {
    candidate = balanced
    try { return JSON.parse(candidate) } catch {}
  }

  // Cleanup: normalize quotes and remove trailing commas
  candidate = candidate
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')

  // Last attempt with cleanup
  return JSON.parse(candidate)
}



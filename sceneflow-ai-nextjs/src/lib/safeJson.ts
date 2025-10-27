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
    try { return JSON.parse(candidate) } catch (firstError: any) {
      // Log for debugging in development only
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SafeJSON] Fenced block parse failed:', firstError.message.substring(0, 100))
      }
    }
  }

  // Try balanced object extraction
  const balanced = extractBalancedJson(candidate)
  if (balanced) {
    candidate = balanced
    try { return JSON.parse(candidate) } catch {}
  }

  // ENHANCED SANITIZATION
  try {
    // STEP 1: Remove/escape control characters within strings
    candidate = candidate.replace(
      /"((?:[^"\\]|\\.)*)"/g,
      (match, stringContent) => {
        const fixed = stringContent
          .split('')
          .map((char: string) => {
            const code = char.charCodeAt(0)
            // Replace literal control chars (ASCII 0-31 except valid escapes)
            if (code < 32) {
              if (code === 9) return '\\t'   // tab
              if (code === 10) return '\\n'  // newline
              if (code === 13) return '\\r'  // carriage return
              return ' ' // Replace other control chars with space
            }
            return char
          })
          .join('')
        return `"${fixed}"`
      }
    )

    // STEP 2: Standard JSON fixes
    candidate = candidate
      .replace(/[""]/g, '"')        // Normalize quotes
      .replace(/['']/g, "'")        // Normalize single quotes
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '') // Remove any remaining control chars
      .replace(/:\s*NaN/g, ': null') // Replace NaN with null
      .replace(/:\s*Infinity/g, ': null') // Replace Infinity with null
      .trim()

    // STEP 3: Balance braces/brackets
    const openBraces = (candidate.match(/{/g) || []).length
    const closeBraces = (candidate.match(/}/g) || []).length
    const openBrackets = (candidate.match(/\[/g) || []).length
    const closeBrackets = (candidate.match(/\]/g) || []).length

    while (openBraces > closeBraces) candidate += '}'
    while (openBrackets > closeBrackets) candidate += ']'

    // Try parsing the cleaned version
    return JSON.parse(candidate)

  } catch (sanitizeError: any) {
    // Log error in production for monitoring
    console.error('[SafeJSON] All sanitization attempts failed:', sanitizeError.message)
    throw sanitizeError
  }
}



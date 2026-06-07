/**
 * Final Draft (.fdx) XML → Fountain-style text for scriptParser.
 */

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function extractParagraphText(innerXml: string): string {
  const parts: string[] = []
  const textRegex = /<Text[^>]*>([\s\S]*?)<\/Text>/gi
  let match: RegExpExecArray | null
  while ((match = textRegex.exec(innerXml)) !== null) {
    const stripped = match[1].replace(/<[^>]+>/g, '')
    if (stripped.trim()) parts.push(decodeXmlEntities(stripped))
  }
  if (parts.length === 0) {
    const fallback = innerXml.replace(/<[^>]+>/g, '').trim()
    if (fallback) parts.push(decodeXmlEntities(fallback))
  }
  return parts.join('').trim()
}

export function isFdxContent(text: string, fileName?: string): boolean {
  if (fileName?.toLowerCase().endsWith('.fdx')) return true
  const trimmed = text.trimStart()
  return trimmed.startsWith('<?xml') && /<FinalDraft\b/i.test(text) && /<Paragraph\b/i.test(text)
}

/**
 * Convert Final Draft XML into Fountain-compatible plain text.
 */
export function fdxXmlToFountain(xml: string): string {
  const lines: string[] = []
  const paragraphRegex = /<Paragraph[^>]*\bType="([^"]+)"[^>]*>([\s\S]*?)<\/Paragraph>/gi
  let match: RegExpExecArray | null

  while ((match = paragraphRegex.exec(xml)) !== null) {
    const type = match[1].trim()
    const text = extractParagraphText(match[2])
    if (!text) continue

    switch (type) {
      case 'Scene Heading':
        lines.push('', text.toUpperCase())
        break
      case 'Action':
        lines.push(text)
        break
      case 'Character':
        lines.push('', text.toUpperCase())
        break
      case 'Parenthetical': {
        const inner = text.replace(/^\(|\)$/g, '').trim()
        lines.push(`(${inner})`)
        break
      }
      case 'Dialogue':
        lines.push(text)
        break
      case 'Transition':
        lines.push('', text.toUpperCase())
        break
      default:
        lines.push(text)
    }
  }

  return lines.join('\n').trim()
}

export function normalizeImportedScriptText(text: string, fileName?: string): string {
  if (isFdxContent(text, fileName)) {
    const fountain = fdxXmlToFountain(text)
    if (fountain.trim()) return fountain
  }
  return text
}

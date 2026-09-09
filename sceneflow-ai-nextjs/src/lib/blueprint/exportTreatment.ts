/**
 * Export Blueprint / film treatment variants to interchange formats.
 */

export type BlueprintExportFormat = 'fountain' | 'markdown' | 'json'

export interface TreatmentExportInput {
  title?: string
  logline?: string
  synopsis?: string
  genre?: string
  author_writer?: string
  tone?: string
  setting?: string
  protagonist?: string
  antagonist?: string
  visual_style?: string
  themes?: string[] | string
  beats?: Array<{
    title?: string
    intent?: string
    synopsis?: string
    minutes?: number
  }>
  character_descriptions?: Array<{
    name?: string
    description?: string
    role?: string
  }>
  [key: string]: unknown
}

export function safeExportFilename(title: string): string {
  const base = (title || 'blueprint').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)
  return base || 'blueprint'
}

function formatThemes(themes: string[] | string | undefined): string {
  if (!themes) return ''
  if (Array.isArray(themes)) return themes.filter(Boolean).join(', ')
  return String(themes)
}

export function exportTreatmentToMarkdown(variant: TreatmentExportInput): string {
  const lines: string[] = []
  const title = variant.title?.trim() || 'Untitled Blueprint'
  lines.push(`# ${title}`)
  lines.push('')
  if (variant.author_writer) {
    lines.push(`**Author:** ${variant.author_writer}`)
    lines.push('')
  }
  if (variant.logline) {
    lines.push('## Logline')
    lines.push('')
    lines.push(variant.logline.trim())
    lines.push('')
  }
  if (variant.synopsis) {
    lines.push('## Synopsis')
    lines.push('')
    lines.push(variant.synopsis.trim())
    lines.push('')
  }
  if (variant.genre || variant.tone) {
    lines.push('## Overview')
    lines.push('')
    if (variant.genre) lines.push(`- **Genre:** ${variant.genre}`)
    if (variant.tone) lines.push(`- **Tone:** ${variant.tone}`)
    if (variant.setting) lines.push(`- **Setting:** ${variant.setting}`)
    if (variant.protagonist) lines.push(`- **Protagonist:** ${variant.protagonist}`)
    if (variant.antagonist) lines.push(`- **Antagonist:** ${variant.antagonist}`)
    if (variant.visual_style) lines.push(`- **Visual style:** ${variant.visual_style}`)
    const themes = formatThemes(variant.themes)
    if (themes) lines.push(`- **Themes:** ${themes}`)
    lines.push('')
  }
  const beats = variant.beats || []
  if (beats.length > 0) {
    lines.push('## Story Beats')
    lines.push('')
    beats.forEach((beat, idx) => {
      const mins =
        typeof beat.minutes === 'number' && beat.minutes > 0 ? ` (${beat.minutes} min)` : ''
      lines.push(`### ${idx + 1}. ${beat.title || `Beat ${idx + 1}`}${mins}`)
      if (beat.intent) lines.push(`*${beat.intent}*`)
      lines.push('')
      if (beat.synopsis) {
        lines.push(beat.synopsis.trim())
        lines.push('')
      }
    })
  }
  const chars = variant.character_descriptions || []
  if (chars.length > 0) {
    lines.push('## Characters')
    lines.push('')
    for (const c of chars) {
      lines.push(`### ${c.name || 'Character'}`)
      if (c.role) lines.push(`*${c.role}*`)
      lines.push('')
      if (c.description) lines.push(c.description.trim())
      lines.push('')
    }
  }
  return lines.join('\n').trim() + '\n'
}

/** Fountain-style treatment document (title page + section headings). */
export function exportTreatmentToFountain(variant: TreatmentExportInput): string {
  const lines: string[] = []
  const title = variant.title?.trim() || 'Untitled Blueprint'
  lines.push(`Title: ${title}`)
  if (variant.author_writer) lines.push(`Author: ${variant.author_writer}`)
  if (variant.genre) lines.push(`Genre: ${variant.genre}`)
  lines.push(`Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`)
  lines.push('')
  lines.push('')

  if (variant.logline) {
    lines.push('LOGLINE')
    lines.push('')
    lines.push(variant.logline.trim())
    lines.push('')
  }
  if (variant.synopsis) {
    lines.push('SYNOPSIS')
    lines.push('')
    lines.push(variant.synopsis.trim())
    lines.push('')
  }
  const beats = variant.beats || []
  if (beats.length > 0) {
    lines.push('STORY BEATS')
    lines.push('')
    beats.forEach((beat, idx) => {
      const heading = beat.title || `Beat ${idx + 1}`
      lines.push(`= ${heading} =`)
      if (typeof beat.minutes === 'number') {
        lines.push(`(${beat.minutes} minutes)`)
      }
      lines.push('')
      if (beat.synopsis) lines.push(beat.synopsis.trim())
      else if (beat.intent) lines.push(beat.intent.trim())
      lines.push('')
    })
  }
  const chars = variant.character_descriptions || []
  if (chars.length > 0) {
    lines.push('CHARACTERS')
    lines.push('')
    for (const c of chars) {
      lines.push(c.name?.toUpperCase() || 'CHARACTER')
      if (c.role) lines.push(`(${c.role})`)
      lines.push('')
      if (c.description) lines.push(c.description.trim())
      lines.push('')
    }
  }
  return lines.join('\n').trim() + '\n'
}

export function exportTreatmentToJSON(variant: TreatmentExportInput): string {
  return JSON.stringify(variant, null, 2)
}

export function exportTreatmentContent(
  variant: TreatmentExportInput,
  format: BlueprintExportFormat
): { content: string; filename: string; mimeType: string } {
  const safe = safeExportFilename(variant.title || 'blueprint')
  switch (format) {
    case 'markdown':
      return {
        content: exportTreatmentToMarkdown(variant),
        filename: `${safe}.md`,
        mimeType: 'text/markdown',
      }
    case 'fountain':
      return {
        content: exportTreatmentToFountain(variant),
        filename: `${safe}.fountain`,
        mimeType: 'text/plain',
      }
    case 'json':
    default:
      return {
        content: exportTreatmentToJSON(variant),
        filename: `${safe}.json`,
        mimeType: 'application/json',
      }
  }
}

/**
 * Document builders for the introduction animatic script.
 *
 * The HTML flavor exists so the clipboard can carry `text/html`: Google Docs reads
 * that MIME type on paste and reconstructs real headings and tables, which a plain
 * markdown string cannot do.
 */

import {
  INTRO_ANIMATIC_ACT_ORDER,
  INTRO_ANIMATIC_ACT_TITLES,
  INTRO_ANIMATIC_BEATS,
  INTRO_ANIMATIC_META,
  INTRO_ANIMATIC_REFERENCES,
  INTRO_ANIMATIC_STYLE_LOCK,
  formatIntroAnimaticTimecode,
  getIntroAnimaticBeatsByAct,
  getIntroAnimaticLocale,
  getIntroAnimaticNarration,
  getIntroAnimaticRuntimeSeconds,
  getIntroAnimaticWordCount,
  type IntroAnimaticBeat,
  type IntroAnimaticLocaleId,
} from '@/config/landing/introductionAnimaticScript'

const BEAT_COLUMNS = [
  'Beat',
  'Time',
  'Duration',
  'Narration / Action',
  'Image Illustration Prompt',
  'Motion',
] as const

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Pipes and newlines would break out of a markdown table cell. */
function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function beatRowCells(beat: IntroAnimaticBeat, locale: IntroAnimaticLocaleId): string[] {
  const narration = beat.narration[locale]
  const action = beat.onScreenText ? `${narration} [OVERLAY: ${beat.onScreenText}]` : narration
  return [
    beat.id,
    beat.timecode,
    `${beat.durationSeconds}s`,
    action,
    beat.framePrompt,
    beat.motion,
  ]
}

function buildHeaderFields(
  locale: IntroAnimaticLocaleId
): Array<{ label: string; value: string }> {
  const meta = getIntroAnimaticLocale(locale)
  const runtime = formatIntroAnimaticTimecode(getIntroAnimaticRuntimeSeconds())
  return [
    { label: 'Language', value: `${meta?.label ?? locale} (${meta?.nativeLabel ?? locale})` },
    { label: 'Runtime', value: `~${runtime} across ${INTRO_ANIMATIC_BEATS.length} beats` },
    { label: 'Narration word count', value: `~${getIntroAnimaticWordCount(locale)}` },
    { label: 'Format', value: INTRO_ANIMATIC_META.format },
    { label: 'Narrator', value: INTRO_ANIMATIC_META.narrator },
    {
      label: 'Voice',
      value: `${INTRO_ANIMATIC_META.voiceId} — ${INTRO_ANIMATIC_META.directorNotes}`,
    },
    {
      label: 'Review status',
      value: meta?.reviewed
        ? 'approved'
        : 'machine-drafted narration — pending native-speaker review',
    },
  ]
}

/** Markdown mirroring the beat-table convention in scripts/use-case-scripts/. */
export function buildIntroAnimaticMarkdown(locale: IntroAnimaticLocaleId): string {
  const lines: string[] = []

  lines.push(`# ${INTRO_ANIMATIC_META.title}`, '')
  for (const field of buildHeaderFields(locale)) {
    lines.push(`**${field.label}:** ${field.value}  `)
  }
  lines.push('')

  lines.push('## GLOBAL VISUAL STYLE LOCK', '')
  lines.push('Append this to every image prompt below:', '')
  lines.push(`> ${INTRO_ANIMATIC_STYLE_LOCK}`, '')

  lines.push('## REFERENCES (generate once — lock in Reference Library)', '')
  for (const reference of INTRO_ANIMATIC_REFERENCES) {
    lines.push(`**REF: ${reference.token}** _(${reference.kind})_  `)
    lines.push(reference.prompt, '')
  }

  lines.push('## ANIMATIC BEATS', '')
  lines.push(
    '**Assembly:** Hold each frame through its narration line; Ken Burns motion as noted; cross-dissolve 0.5s between beats.',
    ''
  )

  for (const act of INTRO_ANIMATIC_ACT_ORDER) {
    const beats = getIntroAnimaticBeatsByAct(act)
    if (!beats.length) continue

    lines.push(`### ${INTRO_ANIMATIC_ACT_TITLES[act]}`, '')
    lines.push(`| ${BEAT_COLUMNS.join(' | ')} |`)
    lines.push(`|${BEAT_COLUMNS.map(() => '---').join('|')}|`)
    for (const beat of beats) {
      lines.push(`| ${beatRowCells(beat, locale).map(escapeMarkdownCell).join(' | ')} |`)
    }
    lines.push('')
  }

  lines.push(
    `**Total:** ~${formatIntroAnimaticTimecode(getIntroAnimaticRuntimeSeconds())} of frame holds plus transitions`,
    ''
  )

  lines.push('## NARRATION ONLY', '')
  getIntroAnimaticNarration(locale).forEach((line, index) => {
    lines.push(`${index + 1}. ${line}`)
  })
  lines.push('')

  return lines.join('\n')
}

/**
 * Google Docs-ready HTML. Inline styles are required because Docs discards
 * stylesheets and only honors attributes carried on the elements themselves.
 */
export function buildIntroAnimaticHtml(locale: IntroAnimaticLocaleId): string {
  const meta = getIntroAnimaticLocale(locale)
  const dir = meta?.dir ?? 'ltr'
  const parts: string[] = []

  const cell = (value: string, header = false) => {
    const tag = header ? 'th' : 'td'
    const style = header
      ? 'border:1px solid #999;padding:6px;background:#f1f1f1;text-align:left;font-weight:700;'
      : 'border:1px solid #999;padding:6px;vertical-align:top;'
    return `<${tag} style="${style}">${escapeHtml(value)}</${tag}>`
  }

  parts.push(`<h1>${escapeHtml(INTRO_ANIMATIC_META.title)}</h1>`)

  parts.push('<p>')
  parts.push(
    buildHeaderFields(locale)
      .map((field) => `<strong>${escapeHtml(field.label)}:</strong> ${escapeHtml(field.value)}`)
      .join('<br />')
  )
  parts.push('</p>')

  parts.push('<h2>Global Visual Style Lock</h2>')
  parts.push('<p>Append this to every image prompt below:</p>')
  parts.push(
    `<blockquote style="border-left:3px solid #999;margin:0 0 12px;padding-left:12px;"><em>${escapeHtml(
      INTRO_ANIMATIC_STYLE_LOCK
    )}</em></blockquote>`
  )

  parts.push('<h2>References</h2>')
  parts.push('<p>Generate once and lock in the Reference Library.</p>')
  for (const reference of INTRO_ANIMATIC_REFERENCES) {
    parts.push(
      `<p><strong>REF: ${escapeHtml(reference.token)}</strong> <em>(${escapeHtml(
        reference.kind
      )})</em><br />${escapeHtml(reference.prompt)}</p>`
    )
  }

  parts.push('<h2>Animatic Beats</h2>')
  parts.push(
    '<p><strong>Assembly:</strong> Hold each frame through its narration line; Ken Burns motion as noted; cross-dissolve 0.5s between beats.</p>'
  )

  for (const act of INTRO_ANIMATIC_ACT_ORDER) {
    const beats = getIntroAnimaticBeatsByAct(act)
    if (!beats.length) continue

    parts.push(`<h3>${escapeHtml(INTRO_ANIMATIC_ACT_TITLES[act])}</h3>`)
    parts.push(
      '<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;">'
    )
    parts.push(`<thead><tr>${BEAT_COLUMNS.map((c) => cell(c, true)).join('')}</tr></thead>`)
    parts.push('<tbody>')
    for (const beat of beats) {
      const cells = beatRowCells(beat, locale)
      // Narration is the only right-to-left column; prompts stay LTR English.
      const rendered = cells.map((value, index) =>
        index === 3 && dir === 'rtl'
          ? `<td dir="rtl" style="border:1px solid #999;padding:6px;vertical-align:top;text-align:right;">${escapeHtml(
              value
            )}</td>`
          : cell(value)
      )
      parts.push(`<tr>${rendered.join('')}</tr>`)
    }
    parts.push('</tbody></table>')
  }

  parts.push(
    `<p><strong>Total:</strong> ~${formatIntroAnimaticTimecode(
      getIntroAnimaticRuntimeSeconds()
    )} of frame holds plus transitions</p>`
  )

  parts.push('<h2>Narration Only</h2>')
  parts.push(`<ol${dir === 'rtl' ? ' dir="rtl"' : ''}>`)
  for (const line of getIntroAnimaticNarration(locale)) {
    parts.push(`<li>${escapeHtml(line)}</li>`)
  }
  parts.push('</ol>')

  return `<div dir="ltr" style="font-family:Arial,sans-serif;font-size:11pt;color:#111;">${parts.join(
    ''
  )}</div>`
}

/** Numbered narration lines only — TTS input or a VO booth read sheet. */
export function buildIntroAnimaticNarrationText(locale: IntroAnimaticLocaleId): string {
  const meta = getIntroAnimaticLocale(locale)
  const lines: string[] = [
    `${INTRO_ANIMATIC_META.title} — narration (${meta?.label ?? locale})`,
    '',
  ]
  INTRO_ANIMATIC_BEATS.forEach((beat) => {
    lines.push(`${beat.id}  [${beat.timecode} · ${beat.durationSeconds}s]  ${beat.narration[locale]}`)
  })
  return lines.join('\n')
}

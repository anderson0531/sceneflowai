#!/usr/bin/env npx tsx
/**
 * Fix leaked glossary placeholders in locale message files.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GLOSSARY_TERMS, glossarySlug } from './lib/landingMessageTranslate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = join(__dirname, '..', 'messages')

const SLUG_TO_TERM = new Map(GLOSSARY_TERMS.map((term) => [glossarySlug(term), term]))

function scrubLegacyPlaceholders(text: string): string {
  return text.replace(/__\s*SFTERM_(\d+)\s*__/g, (_, idx) => GLOSSARY_TERMS[Number(idx)] ?? _)
}

function resolveMangledPlaceholder(middle: string): string | null {
  const normalized = middle.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()
  if (SLUG_TO_TERM.has(normalized)) {
    return SLUG_TO_TERM.get(normalized)!
  }

  let best: { term: string; score: number } | null = null
  for (const term of GLOSSARY_TERMS) {
    const slug = glossarySlug(term)
    const overlap =
      slug === normalized ||
      slug.includes(normalized) ||
      normalized.includes(slug) ||
      slug.split('_').some((part) => part.length >= 4 && normalized.includes(part)) ||
      (slug.length >= 4 && normalized.length >= 4 && slug.slice(0, 4) === normalized.slice(0, 4))
    if (!overlap) continue
    const score = Math.min(slug.length, normalized.length) / Math.max(slug.length, normalized.length)
    if (!best || score > best.score) best = { term, score }
  }

  return best && best.score >= 0.35 ? best.term : null
}

function scrubSfaiPlaceholders(text: string): string {
  let out = scrubLegacyPlaceholders(text)

  for (const term of GLOSSARY_TERMS) {
    const exact = `SFAI${glossarySlug(term)}TERM`
    out = out.split(exact).join(term)
    const fuzzy = new RegExp(`SFAI\\s*${glossarySlug(term).replace(/_/g, '[\\s_]*')}\\s*TERM`, 'gi')
    out = out.replace(fuzzy, term)
  }

  out = out.replace(/SFAI([A-Z_ ]+)TERM/gi, (match, middle: string) => {
    return resolveMangledPlaceholder(middle) ?? match
  })

  return out
}

function scrubStrings(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return scrubSfaiPlaceholders(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => scrubStrings(item))
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      out[key] = scrubStrings(value)
    }
    return out
  }
  return obj
}

function main() {
  const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json') && f !== 'en.json' && !f.startsWith('_'))
  for (const file of files) {
    const path = join(MESSAGES_DIR, file)
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    const scrubbed = scrubStrings(parsed)
    writeFileSync(path, `${JSON.stringify(scrubbed, null, 2)}\n`)
    console.log(`Scrubbed ${file}`)
  }
}

main()

#!/usr/bin/env npx tsx
/**
 * Fix leaked glossary placeholders in locale message files.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { GLOSSARY_TERMS } from './lib/landingMessageTranslate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MESSAGES_DIR = join(__dirname, '..', 'messages')

function scrubLegacyPlaceholders(text: string): string {
  return text.replace(/__\s*SFTERM_(\d+)\s*__/g, (_, idx) => GLOSSARY_TERMS[Number(idx)] ?? _)
}

function scrubStrings(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return scrubLegacyPlaceholders(obj)
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
  const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json') && f !== 'en.json')
  for (const file of files) {
    const path = join(MESSAGES_DIR, file)
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    const scrubbed = scrubStrings(parsed)
    writeFileSync(path, `${JSON.stringify(scrubbed, null, 2)}\n`)
    console.log(`Scrubbed ${file}`)
  }
}

main()

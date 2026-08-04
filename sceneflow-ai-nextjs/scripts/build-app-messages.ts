#!/usr/bin/env node
/**
 * Validate the English app catalogs and write per-key fingerprints.
 *
 * The fingerprint file is what makes incremental translation possible. The
 * landing pipeline has no equivalent, so every sync re-translates whole
 * namespaces; at app-chrome scale (thousands of keys across 39 locales) that is
 * both slow and expensive enough to matter.
 *
 * Usage: npx tsx scripts/build-app-messages.ts [--check]
 */

import { createHash } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { APP_SURFACES } from '../src/i18n/appSurfaces.ts'
import { flattenMessages } from './lib/landingMessageTranslate.ts'
import { icuArguments } from '../src/lib/i18n/glossary.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const APP_MESSAGES_DIR = join(ROOT, 'messages', 'app')
const FINGERPRINT_PATH = join(APP_MESSAGES_DIR, '_fingerprints.json')

export interface Fingerprints {
  version: 1
  generatedAt: string
  /** surface -> flat key -> sha256 of the English value. */
  surfaces: Record<string, Record<string, string>>
}

export function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

export function readEnglishSurface(surface: string): Record<string, unknown> {
  const path = join(APP_MESSAGES_DIR, 'en', `${surface}.json`)
  if (!existsSync(path)) {
    throw new Error(`Missing English catalog: messages/app/en/${surface}.json`)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function buildFingerprints(): Fingerprints {
  const surfaces: Record<string, Record<string, string>> = {}

  for (const surface of APP_SURFACES) {
    const flat = flattenMessages(readEnglishSurface(surface))
    surfaces[surface] = Object.fromEntries(
      Object.entries(flat).map(([key, value]) => [key, fingerprint(value)])
    )
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    surfaces,
  }
}

export function readFingerprints(): Fingerprints | null {
  if (!existsSync(FINGERPRINT_PATH)) return null
  try {
    return JSON.parse(readFileSync(FINGERPRINT_PATH, 'utf8')) as Fingerprints
  } catch {
    return null
  }
}

/** Keys whose English text changed (or that are new) since the last build. */
export function changedKeys(
  surface: string,
  previous: Fingerprints | null
): Set<string> | null {
  if (!previous?.surfaces?.[surface]) return null // Translate everything.

  const flat = flattenMessages(readEnglishSurface(surface))
  const before = previous.surfaces[surface]
  const changed = new Set<string>()

  for (const [key, value] of Object.entries(flat)) {
    if (before[key] !== fingerprint(value)) changed.add(key)
  }

  return changed
}

function lintCatalogs(): string[] {
  const problems: string[] = []

  for (const surface of APP_SURFACES) {
    const flat = flattenMessages(readEnglishSurface(surface))
    for (const [key, value] of Object.entries(flat)) {
      if (!value.trim()) {
        problems.push(`${surface}.${key} is empty`)
      }
      // An unbalanced brace throws at format time rather than at build time,
      // which is a bad trade for a message catalog.
      const opens = (value.match(/\{/g) ?? []).length
      const closes = (value.match(/\}/g) ?? []).length
      if (opens !== closes) {
        problems.push(`${surface}.${key} has unbalanced braces: ${value}`)
      }
      if (opens > 0 && icuArguments(value).length === 0) {
        problems.push(`${surface}.${key} has braces that do not parse as ICU: ${value}`)
      }
    }
  }

  return problems
}

function main() {
  const check = process.argv.includes('--check')

  const problems = lintCatalogs()
  if (problems.length > 0) {
    console.error('English app catalogs have problems:')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }

  const next = buildFingerprints()
  const keyCount = Object.values(next.surfaces).reduce(
    (total, keys) => total + Object.keys(keys).length,
    0
  )

  if (check) {
    const previous = readFingerprints()
    const stale = APP_SURFACES.filter((surface) => {
      const changed = changedKeys(surface, previous)
      return changed === null || changed.size > 0
    })
    if (stale.length > 0) {
      console.error(
        `Fingerprints are stale for: ${stale.join(', ')}. Run npm run i18n:app:build-en.`
      )
      process.exit(1)
    }
    console.log(`App catalogs OK — ${keyCount} keys across ${APP_SURFACES.length} surfaces`)
    return
  }

  writeFileSync(FINGERPRINT_PATH, `${JSON.stringify(next, null, 2)}\n`)
  console.log(
    `Wrote messages/app/_fingerprints.json — ${keyCount} keys across ${APP_SURFACES.length} surfaces`
  )
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (invokedDirectly) main()

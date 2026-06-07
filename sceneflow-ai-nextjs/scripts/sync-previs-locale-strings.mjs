#!/usr/bin/env node
/**
 * Sync pre-vis terminology across locale message files from canonical en.json keys.
 * Run after build-landing-messages.ts when MT API is unavailable.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MESSAGES_DIR = join(ROOT, 'messages')

const REPLACEMENTS = [
  [/Express storyboard/gi, 'Express Pre-vis'],
  [/express storyboard/gi, 'Express Pre-vis'],
  [/storyboards/gi, 'pre-vis'],
  [/storyboard/gi, 'pre-vis'],
  [/Storyboards/g, 'Pre-vis'],
  [/Storyboard/g, 'Pre-vis'],
  [/STORYBOARD/g, 'PRE-VIS'],
]

function transformString(value) {
  if (typeof value !== 'string') return value
  let out = value
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement)
  }
  return out
}

function walk(obj) {
  if (Array.isArray(obj)) return obj.map(walk)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, walk(v)]))
  }
  return transformString(obj)
}

const en = JSON.parse(readFileSync(join(MESSAGES_DIR, 'en.json'), 'utf8'))
const enPreVis = en.preVisEngine

const localeFiles = [
  ...readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json') && f !== 'en.json' && !f.startsWith('.')),
  ...readdirSync(join(MESSAGES_DIR, 'tier-a')).map((f) => `tier-a/${f}`),
]

for (const file of localeFiles) {
  const path = join(MESSAGES_DIR, file)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const updated = walk(data)
  if (enPreVis && !updated.preVisEngine) {
    updated.preVisEngine = enPreVis
  }
  if (updated.floatingNav && !updated.floatingNav.preVisEngine) {
    updated.floatingNav.preVisEngine = en.floatingNav.preVisEngine
  }
  writeFileSync(path, `${JSON.stringify(updated, null, 2)}\n`)
  console.log(`Updated ${file}`)
}

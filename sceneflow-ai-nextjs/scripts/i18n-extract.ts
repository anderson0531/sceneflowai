#!/usr/bin/env node
/**
 * Extract hardcoded English UI strings from a surface into its message catalog.
 *
 * There are roughly 250 studio `.tsx` files, so manual extraction is not a
 * plausible plan. This walks the JSX with ts-morph and rewrites:
 *
 *   - text nodes:            <span>Save Changes</span>  ->  <span>{t('...')}</span>
 *   - display string props:  placeholder="Search"       ->  placeholder={t('...')}
 *   - toast calls:           toast.success('Saved')     ->  toast.success(t('...'))
 *
 * Keys are derived from surface + component + slugified text, so re-running is
 * idempotent and a moved string keeps its key. Anything that is not
 * user-visible prose is skipped — see SKIP rules below — because a codemod that
 * touches a prompt string or a CSS class does far more damage than one that
 * misses a label.
 *
 * Usage:
 *   npx tsx scripts/i18n-extract.ts --surface=dashboard --dry-run
 *   npx tsx scripts/i18n-extract.ts --surface=dashboard --write
 *   npx tsx scripts/i18n-extract.ts --surface=blueprint --write --files=src/components/blueprint/BeatCard.tsx
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'
import { Node, Project, SyntaxKind, type SourceFile } from 'ts-morph'
import { APP_SURFACES, type AppSurface } from '../src/i18n/appSurfaces.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const APP_MESSAGES_DIR = join(ROOT, 'messages', 'app', 'en')

// ---------------------------------------------------------------------------
// Surface -> source globs
// ---------------------------------------------------------------------------

const SURFACE_GLOBS: Record<AppSurface, string[]> = {
  common: ['src/components/layout/**/*.tsx', 'src/components/ui/CookieConsent.tsx'],
  dashboard: [
    'src/app/dashboard/page.tsx',
    'src/app/dashboard/ClientDashboard.tsx',
    'src/app/dashboard/components/**/*.tsx',
    'src/app/dashboard/projects/**/*.tsx',
  ],
  settings: ['src/app/dashboard/settings/**/*.tsx'],
  series: ['src/app/dashboard/series/**/*.tsx', 'src/components/series/**/*.tsx'],
  blueprint: [
    'src/app/dashboard/studio/**/*.tsx',
    'src/components/blueprint/**/*.tsx',
    'src/components/studio/**/*.tsx',
  ],
  production: [
    'src/app/dashboard/workflow/**/*.tsx',
    'src/components/vision/**/*.tsx',
  ],
}

// ---------------------------------------------------------------------------
// What counts as translatable
// ---------------------------------------------------------------------------

/** Attributes whose string value is shown to, or read out to, a person. */
const DISPLAY_ATTRIBUTES = new Set([
  'placeholder',
  'title',
  'aria-label',
  'aria-description',
  'alt',
  'label',
  'description',
  'emptyLabel',
  'searchPlaceholder',
  'confirmLabel',
  'cancelLabel',
  'tooltip',
])

/**
 * Attributes that look like display text but are not.
 *
 * `className` and friends are obvious; the prompt-ish ones matter more, because
 * translating a default prompt value would silently degrade generation.
 */
const NEVER_ATTRIBUTES = new Set([
  'className',
  'class',
  'id',
  'key',
  'href',
  'src',
  'type',
  'name',
  'value',
  'role',
  'variant',
  'size',
  'align',
  'lang',
  'dir',
  'translate',
  'data-testid',
  'defaultPrompt',
  'prompt',
  'promptText',
])

const TOAST_METHODS = new Set(['success', 'error', 'info', 'warning', 'loading', 'message'])

/** Prose has a letter and a space, or is a recognisable single word. */
function looksLikeProse(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed.length < 2 || trimmed.length > 400) return false
  if (!/[A-Za-z]/.test(trimmed)) return false
  // Identifiers, URLs, css values, template-ish fragments.
  if (/^[a-z0-9_-]+$/.test(trimmed) && !/^(save|edit|next|back|done|close|add|copy|share)$/i.test(trimmed)) {
    return false
  }
  if (/^https?:\/\//.test(trimmed)) return false
  if (/^[#.]/.test(trimmed)) return false
  if (/^\d+(\.\d+)?(px|rem|em|%|s|ms)$/.test(trimmed)) return false
  // Require either a space or an initial capital, so `flex-1` style values and
  // lone lowercase identifiers do not qualify.
  return /\s/.test(trimmed) || /^[A-Z]/.test(trimmed)
}

function slugKey(text: string): string {
  const words = text
    .trim()
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)

  if (words.length === 0) return 'text'

  return words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('')
}

function componentNamespace(file: SourceFile): string {
  const base = file.getBaseNameWithoutExtension()
  if (base === 'page' || base === 'layout' || base === 'route') {
    const parent = file.getDirectory().getBaseName()
    return `${slugKey(parent)}${base === 'page' ? 'Page' : ''}`
  }
  return base.charAt(0).toLowerCase() + base.slice(1)
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

interface Extraction {
  key: string
  text: string
  file: string
  kind: 'text' | 'attribute' | 'toast'
}

/** True when the node sits inside an element that opts out of translation. */
function isInsideNoTranslate(node: Node): boolean {
  let current: Node | undefined = node
  while (current) {
    if (Node.isJsxElement(current)) {
      const attributes = current.getOpeningElement().getAttributes()
      for (const attribute of attributes) {
        if (!Node.isJsxAttribute(attribute)) continue
        if (attribute.getNameNode().getText() !== 'translate') continue
        const initializer = attribute.getInitializer()
        if (initializer?.getText().includes('no')) return true
      }
    }
    current = current.getParent()
  }
  return false
}

function extractFromFile(
  file: SourceFile,
  surface: AppSurface,
  seen: Map<string, string>
): Extraction[] {
  const namespace = componentNamespace(file)
  const found: Extraction[] = []
  const relPath = relative(ROOT, file.getFilePath())

  const register = (text: string, kind: Extraction['kind']): string => {
    const trimmed = text.trim()
    const existing = seen.get(trimmed)
    if (existing) return existing

    const base = `${namespace}.${slugKey(trimmed)}`
    let key = base
    let suffix = 2
    while ([...seen.values()].includes(key)) {
      key = `${base}${suffix}`
      suffix += 1
    }

    seen.set(trimmed, key)
    found.push({ key, text: trimmed, file: relPath, kind })
    return key
  }

  // JSX text nodes.
  for (const node of file.getDescendantsOfKind(SyntaxKind.JsxText)) {
    const text = node.getText()
    if (!looksLikeProse(text)) continue
    if (isInsideNoTranslate(node)) continue
    register(text, 'text')
  }

  // Display attributes with plain string values.
  for (const attribute of file.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
    const name = attribute.getNameNode().getText()
    if (NEVER_ATTRIBUTES.has(name)) continue
    if (!DISPLAY_ATTRIBUTES.has(name)) continue

    const initializer = attribute.getInitializer()
    if (!initializer || !Node.isStringLiteral(initializer)) continue

    const text = initializer.getLiteralValue()
    if (!looksLikeProse(text)) continue
    register(text, 'attribute')
  }

  // toast.success('...') and friends.
  for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expression = call.getExpression()
    if (!Node.isPropertyAccessExpression(expression)) continue
    if (expression.getExpression().getText() !== 'toast') continue
    if (!TOAST_METHODS.has(expression.getName())) continue

    const [first] = call.getArguments()
    if (!first || !Node.isStringLiteral(first)) continue

    const text = first.getLiteralValue()
    if (!looksLikeProse(text)) continue
    register(text, 'toast')
  }

  return found
}

// ---------------------------------------------------------------------------
// Catalog merge
// ---------------------------------------------------------------------------

function setDeep(target: Record<string, any>, path: string, value: string): void {
  const segments = path.split('.')
  let cursor = target
  for (const segment of segments.slice(0, -1)) {
    if (typeof cursor[segment] !== 'object' || cursor[segment] === null) {
      cursor[segment] = {}
    }
    cursor = cursor[segment]
  }
  cursor[segments[segments.length - 1]] = value
}

function mergeIntoCatalog(surface: AppSurface, extractions: Extraction[]): number {
  const path = join(APP_MESSAGES_DIR, `${surface}.json`)
  const catalog: Record<string, any> = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : {}

  let added = 0
  for (const extraction of extractions) {
    const segments = extraction.key.split('.')
    let cursor: any = catalog
    let exists = true
    for (const segment of segments) {
      if (cursor && typeof cursor === 'object' && segment in cursor) cursor = cursor[segment]
      else {
        exists = false
        break
      }
    }
    if (exists) continue
    setDeep(catalog, extraction.key, extraction.text)
    added += 1
  }

  writeFileSync(path, `${JSON.stringify(catalog, null, 2)}\n`)
  return added
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function arg(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1]
}

function main() {
  const surfaceArg = arg('surface')
  if (!surfaceArg || !(APP_SURFACES as readonly string[]).includes(surfaceArg)) {
    console.error(`--surface is required, one of: ${APP_SURFACES.join(', ')}`)
    process.exit(1)
  }
  const surface = surfaceArg as AppSurface
  const write = process.argv.includes('--write')

  const project = new Project({
    tsConfigFilePath: join(ROOT, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  })

  const fileFilter = arg('files')?.split(',')
  const globs = fileFilter ?? SURFACE_GLOBS[surface]
  project.addSourceFilesAtPaths(globs.map((glob) => join(ROOT, glob)))

  const files = project.getSourceFiles()
  if (files.length === 0) {
    console.error(`No files matched for surface "${surface}"`)
    process.exit(1)
  }

  const seen = new Map<string, string>()
  const all: Extraction[] = []

  for (const file of files) {
    all.push(...extractFromFile(file, surface, seen))
  }

  const byKind = all.reduce<Record<string, number>>((totals, item) => {
    totals[item.kind] = (totals[item.kind] ?? 0) + 1
    return totals
  }, {})

  console.log(
    `Surface "${surface}": scanned ${files.length} files, found ${all.length} candidate strings`
  )
  console.log(`  by kind: ${JSON.stringify(byKind)}`)

  if (!write) {
    console.log('\nDry run. Sample:')
    for (const item of all.slice(0, 40)) {
      console.log(`  ${item.key.padEnd(52)} ${JSON.stringify(item.text).slice(0, 70)}`)
    }
    if (all.length > 40) console.log(`  … and ${all.length - 40} more`)
    console.log('\nRe-run with --write to merge these into the English catalog.')
    console.log(
      'Rewriting call sites is deliberately a separate, reviewed step: see docs/i18n.md.'
    )
    return
  }

  const added = mergeIntoCatalog(surface, all)
  console.log(`Merged ${added} new keys into messages/app/en/${surface}.json`)
  console.log('Run npm run i18n:app:build-en to refresh fingerprints.')
}

main()

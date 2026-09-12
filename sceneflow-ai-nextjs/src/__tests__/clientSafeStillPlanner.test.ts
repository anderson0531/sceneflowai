import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The vision page imports preVisSync, which imports the deterministic planner.
 * Those modules run in the browser. Pulling Vertex / GCS / Gemini into that
 * graph makes Turbopack fail the production build with "Can't resolve
 * 'child_process'" (PR #271, commits 27314d7 / 6eb282f).
 *
 * Walk the import graph from the client-safe planner entries and refuse any
 * module that talks to a Node image or storage client.
 */

const ROOT = join(__dirname, '../..')

const CLIENT_ENTRYPOINTS = [
  'src/lib/storyboard/preVisSync.ts',
  'src/lib/intelligence/beat-sequence-planner-fallback.ts',
  'src/lib/storyboard/syncBeatStillPrompt.ts',
]

const FORBIDDEN_SPECIFIERS = [
  '@/lib/vertexai/',
  '@/lib/vertexai/client',
  '@/lib/vertexai/vertexImageClient',
  '@/lib/storage/gcs',
  '@/lib/gemini/',
  '@/lib/character/sceneCharacterHeadshot',
  '@/lib/generation/editImageWithVertexPolicyRetry',
  '@/lib/generation/vertexImageWithKlingFallback',
  '@google-cloud/storage',
  'google-auth-library',
  'child_process',
]

const IMPORT_FROM =
  /(?:import|export)\s+(?!type\s)[\s\S]*?from\s+['"]([^'"]+)['"]/g

function forbiddenReason(specifier: string): string | undefined {
  if (specifier === 'child_process' || specifier.startsWith('node:child_process')) {
    return specifier
  }
  return FORBIDDEN_SPECIFIERS.find(
    (needle) => specifier === needle || specifier.startsWith(needle)
  )
}

function resolveSpecifier(fromRelative: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return join(ROOT, 'src', specifier.slice(2))
  }
  if (specifier.startsWith('.')) {
    return join(ROOT, dirname(fromRelative), specifier)
  }
  return null
}

function withExtension(base: string): string | null {
  if (existsSync(base) && base.endsWith('.ts')) return base
  for (const suffix of ['.ts', '.tsx', '/index.ts']) {
    const candidate = `${base}${suffix}`
    if (existsSync(candidate)) return candidate
  }
  return existsSync(base) ? base : null
}

function toRelative(absolute: string): string {
  return absolute.slice(ROOT.length + 1)
}

function collectValueImports(source: string): string[] {
  return [...source.matchAll(IMPORT_FROM)].map((match) => match[1])
}

function walkClientPlannerGraph(): { files: string[]; leaks: string[] } {
  const files: string[] = []
  const leaks: string[] = []
  const queue = [...CLIENT_ENTRYPOINTS]
  const seen = new Set<string>()

  while (queue.length > 0) {
    const relative = queue.shift()!
    if (seen.has(relative)) continue
    seen.add(relative)
    files.push(relative)

    const absolute = join(ROOT, relative)
    if (!existsSync(absolute)) {
      leaks.push(`${relative} (missing)`)
      continue
    }

    const source = readFileSync(absolute, 'utf8')
    for (const specifier of collectValueImports(source)) {
      const forbidden = forbiddenReason(specifier)
      if (forbidden) {
        leaks.push(`${relative} imports ${specifier}`)
        continue
      }

      const resolved = resolveSpecifier(relative, specifier)
      if (!resolved) continue
      const withExt = withExtension(resolved)
      if (!withExt) continue
      if (!withExt.startsWith(ROOT)) continue
      queue.push(toRelative(withExt))
    }
  }

  return { files, leaks }
}

describe('the still planner the vision page imports stays client-safe', () => {
  it('does not reach Vertex, GCS, Gemini, or the wardrobe-diptych generator', () => {
    const { files, leaks } = walkClientPlannerGraph()

    expect(files.length).toBeGreaterThan(CLIENT_ENTRYPOINTS.length)
    expect(leaks).toEqual([])
  })

  it('keeps diptych consumption copy in a string-only module', () => {
    const headshot = readFileSync(
      join(ROOT, 'src/lib/character/sceneCharacterHeadshot.ts'),
      'utf8'
    )
    expect(headshot).toContain("from '@/lib/character/wardrobeDiptychConsumption'")
    expect(headshot).not.toContain('CRITICAL — WARDROBE CHARACTER REFERENCE')
  })
})

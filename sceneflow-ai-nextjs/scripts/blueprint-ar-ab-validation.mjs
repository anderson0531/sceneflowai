#!/usr/bin/env node

/**
 * Dev-only A/B validation: compare Blueprint generation time and optional AR scores
 * across thinking budgets before changing default thinking behavior.
 *
 * Prerequisites:
 *   - Local dev server: npm run dev (or set BASE_URL)
 *   - NODE_ENV=development (required for debugThinkingBudget override)
 *   - Optional AR phase: SESSION_COOKIE from browser devtools for authenticated AR calls
 *
 * Usage:
 *   node scripts/blueprint-ar-ab-validation.mjs
 *   node scripts/blueprint-ar-ab-validation.mjs --id thai-cooking-doc
 *   BASE_URL=http://localhost:3000 SESSION_COOKIE="..." node scripts/blueprint-ar-ab-validation.mjs --with-ar
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_PATH = join(__dirname, 'blueprint-ar-ab-fixtures.json')
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const SESSION_COOKIE = process.env.SESSION_COOKIE || ''

const args = process.argv.slice(2)
const withAr = args.includes('--with-ar')
const idFlagIndex = args.indexOf('--id')
const singleId = idFlagIndex >= 0 ? args[idFlagIndex + 1] : null

const THINKING_BUDGETS = [
  { label: 'thorough-default', budget: 1024 },
  { label: 'thinking-disabled', budget: 0 },
]

function loadFixtures() {
  const all = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8'))
  if (singleId) {
    const one = all.find((f) => f.id === singleId)
    if (!one) throw new Error(`Fixture not found: ${singleId}`)
    return [one]
  }
  return all
}

async function generateTreatment(fixture, thinkingBudget) {
  const res = await fetch(`${BASE_URL}/api/ideation/film-treatment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-debug-timing': '1',
    },
    body: JSON.stringify({
      input: fixture.input,
      genre: fixture.genre,
      tone: fixture.tone,
      targetAudience: fixture.targetAudience,
      contentIntent: fixture.contentIntent,
      rigor: 'thorough',
      variants: 1,
      hasExplicitSettings: true,
      debugThinkingBudget: thinkingBudget,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`film-treatment failed (${res.status}): ${err.slice(0, 300)}`)
  }

  const json = await res.json()
  return {
    treatment: json.data,
    timing: json.debug?.timing,
  }
}

async function scoreAudienceResonance(treatment, fixture) {
  if (!SESSION_COOKIE) return null

  const res = await fetch(`${BASE_URL}/api/treatment/audience-resonance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: SESSION_COOKIE,
    },
    body: JSON.stringify({
      treatment: {
        title: treatment.title,
        logline: treatment.logline,
        synopsis: treatment.synopsis,
        genre: treatment.genre || fixture.genre,
        tone_description: treatment.tone_description || treatment.tone,
        visual_style: treatment.visual_style,
        target_audience: treatment.target_audience || fixture.targetAudience,
        protagonist: treatment.protagonist,
        antagonist: treatment.antagonist,
        setting: treatment.setting,
        beats: treatment.beats,
        character_descriptions: treatment.character_descriptions,
      },
      audienceDefinition: {
        profile: {
          region: 'global',
          ageRange: 'general',
          gender: 'all-genders',
          educationLevel: 'general',
          community: 'general',
        },
        source: 'blueprint',
      },
      genre: fixture.genre,
      tone: fixture.tone,
      contentIntent: fixture.contentIntent,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.warn(`  AR scoring failed (${res.status}): ${err.slice(0, 200)}`)
    return null
  }

  const json = await res.json()
  return json.analysis?.overallScore ?? null
}

function summarizeResults(allResults) {
  console.log('\n=== Summary ===\n')
  for (const fixtureResult of allResults) {
    console.log(`Fixture: ${fixtureResult.id}`)
    for (const run of fixtureResult.runs) {
      const ar = run.arScore != null ? ` AR=${run.arScore}` : ''
      const ms = run.timing?.totalMs ?? '?'
      console.log(`  ${run.label}: ${ms}ms (thinking=${run.thinkingBudget})${ar}`)
    }
    const scores = fixtureResult.runs.map((r) => r.arScore).filter((s) => s != null)
    if (scores.length === 2) {
      const delta = scores[0] - scores[1]
      console.log(`  AR delta (default - disabled): ${delta >= 0 ? '+' : ''}${delta}`)
    }
    console.log('')
  }

  const allAr = allResults.flatMap((f) => f.runs.map((r) => r.arScore).filter((s) => s != null))
  if (allAr.length > 0) {
    const min = Math.min(...allAr)
    const avg = Math.round(allAr.reduce((a, b) => a + b, 0) / allAr.length)
    console.log(`AR stats: min=${min} avg=${avg} (production threshold: 80)`)
    if (min < 80) {
      console.warn('WARNING: At least one run scored below production threshold (80)')
    }
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('This script must run with NODE_ENV=development for debugThinkingBudget.')
    process.exit(1)
  }

  const fixtures = loadFixtures()
  console.log(`Blueprint AR A/B validation — ${fixtures.length} fixture(s), base=${BASE_URL}`)
  if (withAr && !SESSION_COOKIE) {
    console.warn('--with-ar set but SESSION_COOKIE missing; AR scores will be skipped.')
  }

  const allResults = []

  for (const fixture of fixtures) {
    console.log(`\n--- ${fixture.id} ---`)
    const runs = []

    for (const { label, budget } of THINKING_BUDGETS) {
      process.stdout.write(`  ${label} (thinking=${budget})... `)
      const start = Date.now()
      const { treatment, timing } = await generateTreatment(fixture, budget)
      const elapsed = Date.now() - start
      console.log(`done ${timing?.totalMs ?? elapsed}ms`)

      let arScore = null
      if (withAr && SESSION_COOKIE) {
        arScore = await scoreAudienceResonance(treatment, fixture)
        if (arScore != null) console.log(`    AR score: ${arScore}`)
      }

      runs.push({ label, thinkingBudget: budget, timing, arScore, title: treatment?.title })
    }

    allResults.push({ id: fixture.id, runs })
  }

  summarizeResults(allResults)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

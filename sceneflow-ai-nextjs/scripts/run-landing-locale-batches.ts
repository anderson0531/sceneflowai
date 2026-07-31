#!/usr/bin/env npx tsx
/**
 * Run landing locale sync in batches to avoid MyMemory rate limits.
 *
 * Usage:
 *   npx tsx scripts/run-landing-locale-batches.ts
 *   npx tsx scripts/run-landing-locale-batches.ts --batch-size 15 --from-batch 2
 */

import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { LANDING_TRANSLATE_LANGUAGES } from '../src/config/landingTranslateLanguages'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SYNC_SCRIPT = join(__dirname, 'sync-landing-locale-messages.ts')

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const batchSize = parsePositiveInt(
    process.argv.find((a) => a.startsWith('--batch-size='))?.split('=')[1] ??
      (process.argv.includes('--batch-size')
        ? process.argv[process.argv.indexOf('--batch-size') + 1]
        : undefined),
    15
  )
  const fromBatch = parsePositiveInt(
    process.argv.find((a) => a.startsWith('--from-batch='))?.split('=')[1] ??
      (process.argv.includes('--from-batch')
        ? process.argv[process.argv.indexOf('--from-batch') + 1]
        : undefined),
    1
  )
  const batchCooldownMs = parsePositiveInt(
    process.argv.find((a) => a.startsWith('--batch-cooldown-ms='))?.split('=')[1],
    90000
  )
  const localeDelayMs = parsePositiveInt(
    process.argv.find((a) => a.startsWith('--locale-delay-ms='))?.split('=')[1],
    5000
  )
  const priorityOnly = process.argv.includes('--priority-only')
  const skipExisting = !process.argv.includes('--no-skip-existing')

  const localeCount = LANDING_TRANSLATE_LANGUAGES.filter((l) => l.code !== 'en').length
  const totalBatches = Math.ceil(localeCount / batchSize)

  console.log(
    `Running ${totalBatches} batches of up to ${batchSize} locales (${localeCount} non-English codes)`
  )

  for (let batch = fromBatch; batch <= totalBatches; batch++) {
    console.log(`\n########## Batch ${batch}/${totalBatches} ##########`)
    const args = [
      SYNC_SCRIPT,
      '--provider=mymemory',
      `--batch-size=${batchSize}`,
      `--batch=${batch}`,
      `--locale-delay-ms=${localeDelayMs}`,
    ]
    if (priorityOnly) args.push('--priority-only')
    if (skipExisting) args.push('--skip-existing')

    const result = spawnSync('npx', ['tsx', ...args], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    })

    if (result.status !== 0) {
      console.error(`Batch ${batch} failed with exit code ${result.status ?? 1}`)
      process.exit(result.status ?? 1)
    }

    if (batch < totalBatches && batchCooldownMs > 0) {
      console.log(`\nBatch cooldown: waiting ${batchCooldownMs}ms before batch ${batch + 1}...`)
      await sleep(batchCooldownMs)
    }
  }

  console.log('\nAll batches completed.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})

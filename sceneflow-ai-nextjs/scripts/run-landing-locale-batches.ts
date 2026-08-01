#!/usr/bin/env npx tsx
/**
 * Run landing locale sync in batches to avoid MyMemory rate limits.
 *
 * Usage:
 *   npx tsx scripts/run-landing-locale-batches.ts
 *   npx tsx scripts/run-landing-locale-batches.ts --batch-size 15 --from-batch 2
 *   npx tsx scripts/run-landing-locale-batches.ts --production-showcase-only --batch-size 10
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

function getArgValue(flag: string, prefix: string): string | undefined {
  const fromEquals = process.argv.find((a) => a.startsWith(`${prefix}=`))?.split('=')[1]
  const fromFlag = process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : undefined
  return fromEquals ?? fromFlag
}

async function main() {
  const batchSize = parsePositiveInt(getArgValue('--batch-size', '--batch-size'), 15)
  const fromBatch = parsePositiveInt(getArgValue('--from-batch', '--from-batch'), 1)
  const batchCooldownMs = parsePositiveInt(getArgValue('--batch-cooldown-ms', '--batch-cooldown-ms'), 90000)
  const localeDelayMs = parsePositiveInt(getArgValue('--locale-delay-ms', '--locale-delay-ms'), 5000)
  const priorityOnly = process.argv.includes('--priority-only')
  const productionShowcaseOnly = process.argv.includes('--production-showcase-only')
  const namespaces = getArgValue('--namespaces', '--namespaces')
  const skipExisting = !process.argv.includes('--no-skip-existing')

  const localeCount = LANDING_TRANSLATE_LANGUAGES.filter((l) => l.code !== 'en').length
  const totalBatches = Math.ceil(localeCount / batchSize)

  console.log(
    `Running ${totalBatches} batches of up to ${batchSize} locales (${localeCount} non-English codes)`
  )

  for (let batch = fromBatch; batch <= totalBatches; batch++) {
    console.log(`\n########## Batch ${batch}/${totalBatches} ##########`)
    const providerArg = getArgValue('--provider', '--provider') ?? 'auto'
    const args = [
      SYNC_SCRIPT,
      `--provider=${providerArg}`,
      `--batch-size=${batchSize}`,
      `--batch=${batch}`,
      `--locale-delay-ms=${localeDelayMs}`,
    ]
    if (priorityOnly) args.push('--priority-only')
    if (productionShowcaseOnly) args.push('--production-showcase-only')
    if (namespaces) args.push(`--namespaces=${namespaces}`)
    if (skipExisting) args.push('--skip-existing')

    const result = spawnSync('npx', ['tsx', ...args], {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        USE_LIBRETRANSLATE: process.env.USE_LIBRETRANSLATE ?? '1',
      },
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

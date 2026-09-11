#!/usr/bin/env node
/**
 * Shim — the Transcoder job lives in transcode-landing-videos.ts.
 *   npm run landing:transcode-hero -- --locale en
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const result = spawnSync(
  'npx',
  ['tsx', join(root, 'transcode-landing-videos.ts'), ...process.argv.slice(2)],
  { stdio: 'inherit', cwd: join(root, '..'), env: process.env }
)
process.exit(result.status ?? 1)

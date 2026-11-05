#!/usr/bin/env node
/**
 * Write front-page-copy-pack.txt at the repo root for easy copy/paste.
 *
 * Usage: npm run landing:export-copy-pack
 */

import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { formatFrontPageCopyPack } from '../src/config/landing/frontPageCopyPack.ts'

const sceneflowRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(sceneflowRoot, '..')
const outPath = join(repoRoot, 'front-page-copy-pack.txt')

writeFileSync(outPath, `${formatFrontPageCopyPack()}\n`, 'utf8')
console.log(`Wrote ${outPath}`)

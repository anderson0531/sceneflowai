#!/usr/bin/env node
/**
 * Write messages/en.json from src/i18n/buildEnMessages.ts
 *
 * Usage: npx tsx scripts/build-landing-messages.ts
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { buildEnMessages } from '../src/i18n/buildEnMessages.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MESSAGES_DIR = join(ROOT, 'messages')

mkdirSync(MESSAGES_DIR, { recursive: true })
const messages = buildEnMessages()
writeFileSync(join(MESSAGES_DIR, 'en.json'), `${JSON.stringify(messages, null, 2)}\n`)
console.log('Wrote messages/en.json')

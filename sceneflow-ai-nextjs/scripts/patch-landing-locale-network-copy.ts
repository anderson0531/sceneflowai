#!/usr/bin/env node
/**
 * Overlay Phase-1 landing keys from English onto every locale catalog:
 * dateless notify copy, export-anywhere supporting line, Seed Program, Publish Cut.
 *
 * Usage: npx tsx scripts/patch-landing-locale-network-copy.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { LANDING_TRANSLATE_LANGUAGES } from '../src/config/landingTranslateLanguages.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MESSAGES_DIR = join(ROOT, 'messages')
const LOCALE_FILES = new Set(
  LANDING_TRANSLATE_LANGUAGES.map((language) => `${language.code}.json`).filter((name) => name !== 'en.json')
)

type Json = Record<string, unknown>

function asRecord(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {}
}

const en = JSON.parse(readFileSync(join(MESSAGES_DIR, 'en.json'), 'utf8')) as Json
const enHero = asRecord(en.hero)
const overlayHero: Json = {
  ctaSupportingLine: enHero.ctaSupportingLine,
  ctaNetworkInvite: enHero.ctaNetworkInvite,
  ctaNetworkInviteHref: enHero.ctaNetworkInviteHref,
}

for (const file of readdirSync(MESSAGES_DIR).filter((name) => LOCALE_FILES.has(name))) {
  const path = join(MESSAGES_DIR, file)
  const locale = JSON.parse(readFileSync(path, 'utf8')) as Json
  const hero = asRecord(locale.hero)
  delete hero.availabilityBadge
  locale.hero = { ...hero, ...overlayHero }
  locale.notify = en.notify
  locale.forFilmmakers = en.forFilmmakers
  locale.publishCut = en.publishCut
  locale.exitIntent = en.exitIntent
  locale.finalCta = en.finalCta
  const pricing = asRecord(locale.pricing)
  const enPricing = asRecord(en.pricing)
  pricing.subtitle = enPricing.subtitle
  locale.pricing = pricing
  writeFileSync(path, `${JSON.stringify(locale, null, 2)}\n`)
}

console.log('Patched landing locales with dateless / Seed Program / export-anywhere English keys')

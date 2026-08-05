import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { translateContent, type TranslateItem } from '@/lib/i18n/contentTranslator'
import { isLocale } from '@/i18n/locale'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Cap per request so one oversized payload cannot monopolize the provider. */
const MAX_ITEMS = 200

/**
 * Rough daily per-user character ceiling.
 *
 * In-memory and therefore per-instance: this is a guard against a runaway loop
 * or a pathological project, not a billing mechanism. Cache hits do not count,
 * so normal reading is effectively free after the first pass.
 */
const DAILY_CHAR_BUDGET = 400_000
const usage = new Map<string, { day: string; chars: number }>()

function consumeBudget(userKey: string, chars: number): number {
  const day = new Date().toISOString().slice(0, 10)
  const current = usage.get(userKey)

  if (!current || current.day !== day) {
    usage.set(userKey, { day, chars: 0 })
    return DAILY_CHAR_BUDGET
  }

  return Math.max(0, DAILY_CHAR_BUDGET - current.chars)
}

function recordUsage(userKey: string, chars: number): void {
  const day = new Date().toISOString().slice(0, 10)
  const current = usage.get(userKey)
  if (!current || current.day !== day) usage.set(userKey, { day, chars })
  else current.chars += chars
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any)
    const userKey = (session as any)?.user?.id || (session as any)?.user?.email
    if (!userKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { items, targetLocale, sourceLocale = 'en', glossary } = body as {
      items?: unknown
      targetLocale?: unknown
      sourceLocale?: unknown
      glossary?: unknown
    }

    if (typeof targetLocale !== 'string' || !isLocale(targetLocale)) {
      return NextResponse.json({ error: 'Unsupported targetLocale' }, { status: 400 })
    }
    if (typeof sourceLocale !== 'string' || !isLocale(sourceLocale)) {
      return NextResponse.json({ error: 'Unsupported sourceLocale' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items is required' }, { status: 400 })
    }
    if (items.length > MAX_ITEMS) {
      return NextResponse.json(
        { error: `At most ${MAX_ITEMS} items per request` },
        { status: 400 }
      )
    }

    const normalized: TranslateItem[] = []
    for (const raw of items) {
      if (
        !raw ||
        typeof raw !== 'object' ||
        typeof (raw as any).path !== 'string' ||
        typeof (raw as any).text !== 'string'
      ) {
        return NextResponse.json(
          { error: 'Each item needs a string path and text' },
          { status: 400 }
        )
      }
      normalized.push({ path: (raw as any).path, text: (raw as any).text })
    }

    const remaining = consumeBudget(userKey, 0)
    if (remaining <= 0) {
      return NextResponse.json(
        {
          error: 'Daily translation budget reached',
          items: normalized.map((item) => ({ ...item, state: 'source' })),
        },
        { status: 429 }
      )
    }

    const result = await translateContent({
      items: normalized,
      targetLocale,
      sourceLocale,
      glossary: Array.isArray(glossary)
        ? glossary.filter((term): term is string => typeof term === 'string')
        : [],
      charBudget: remaining,
    })

    recordUsage(userKey, result.stats.charsSent)

    return NextResponse.json(result, {
      headers: {
        // Translations of a given source hash are immutable, so the browser and
        // service worker can reuse them freely.
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('[POST /api/i18n/content] failed:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}

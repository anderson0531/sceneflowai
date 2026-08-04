import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveUser } from '@/lib/userHelper'
import { ensureUserLocaleColumns } from '@/lib/database/migrateI18n'
import {
  DEFAULT_LOCALE,
  isLocale,
  matchAcceptLanguage,
  UI_LOCALE_COOKIE,
} from '@/i18n/locale'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

async function requireUser() {
  const session = await getServerSession(authOptions as any)
  const userIdOrEmail = (session as any)?.user?.id || (session as any)?.user?.email
  if (!userIdOrEmail) return null
  return resolveUser(userIdOrEmail)
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const uiLocale = isLocale(user.preferred_locale)
      ? user.preferred_locale
      : matchAcceptLanguage(request.headers.get('accept-language')) ?? DEFAULT_LOCALE

    return NextResponse.json({
      uiLocale,
      // Story language falls back to the interface language: most creators
      // write in the language they read the tool in.
      storyLocale: isLocale(user.story_locale) ? user.story_locale : uiLocale,
      // True when the user has never made an explicit choice, so the client can
      // offer a first-run confirmation instead of silently switching.
      isExplicit: isLocale(user.preferred_locale),
    })
  } catch (error) {
    console.error('Get locale preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { uiLocale, storyLocale } = body as {
      uiLocale?: unknown
      storyLocale?: unknown
    }

    const updates: Record<string, string> = {}

    if (uiLocale !== undefined) {
      if (typeof uiLocale !== 'string' || !isLocale(uiLocale)) {
        return NextResponse.json({ error: 'Unsupported uiLocale' }, { status: 400 })
      }
      updates.preferred_locale = uiLocale
    }

    if (storyLocale !== undefined) {
      if (typeof storyLocale !== 'string' || !isLocale(storyLocale)) {
        return NextResponse.json({ error: 'Unsupported storyLocale' }, { status: 400 })
      }
      updates.story_locale = storyLocale
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No locale provided' }, { status: 400 })
    }

    try {
      await user.update(updates)
    } catch (error) {
      // Deployments that predate the migration are missing the columns; add
      // them and retry once rather than failing the user's action.
      await ensureUserLocaleColumns()
      await user.update(updates)
    }

    const response = NextResponse.json({
      uiLocale: updates.preferred_locale ?? user.preferred_locale ?? DEFAULT_LOCALE,
      storyLocale:
        updates.story_locale ??
        user.story_locale ??
        updates.preferred_locale ??
        DEFAULT_LOCALE,
    })

    // Mirror to the cookie so server-rendered layouts pick up the new locale on
    // the very next request without a database read.
    if (updates.preferred_locale) {
      response.cookies.set(UI_LOCALE_COOKIE, updates.preferred_locale, {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
      })
    }

    return response
  } catch (error) {
    console.error('Update locale preferences error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

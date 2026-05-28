import { NextResponse } from 'next/server'
import { hasAuthSecretConfigured } from '@/lib/auth/secret'

export const dynamic = 'force-dynamic'

/** Lightweight auth config check (no secrets exposed). */
export async function GET() {
  return NextResponse.json({
    hasAuthSecret: hasAuthSecretConfigured(),
  })
}

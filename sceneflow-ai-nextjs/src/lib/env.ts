export const isDemoMode = (): boolean => {
  const flag = process.env.NEXT_PUBLIC_DEMO_MODE
  if (flag === 'true') return true
  if (flag === 'false') return false

  // Optional override flags
  if (process.env.NEXT_PUBLIC_FORCE_DEMO === 'true' || process.env.FORCE_DEMO === 'true') return true

  // Fallback: if not explicitly set, enable demo in non-production or when DB env is missing on server
  const isProd = process.env.NODE_ENV === 'production'
  const hasDb = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DB_HOST)
  return !isProd || !hasDb
}

export const allowDemoFallback = (): boolean => {
  const v = process.env.NEXT_PUBLIC_ALLOW_DEMO_FALLBACK ?? process.env.ALLOW_DEMO_FALLBACK
  if (v === 'false') return false
  if (v === 'true') return true
  // Default allow to true for resilience unless explicitly disabled
  return true
}



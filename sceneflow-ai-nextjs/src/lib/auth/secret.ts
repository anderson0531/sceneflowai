const DEV_AUTH_SECRET = 'sceneflow-dev-secret'

/** Shared NextAuth JWT secret — must match between authOptions and proxy getToken(). */
export function getAuthSecret(): string {
  return (
    process.env.NEXT_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    DEV_AUTH_SECRET
  )
}

/** True when an explicit env secret is configured (not the dev fallback). */
export function hasAuthSecretConfigured(): boolean {
  return Boolean(
    process.env.NEXT_AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()
  )
}

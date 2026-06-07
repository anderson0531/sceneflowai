import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { isDemoMode, allowDemoFallback } from '@/lib/env'
import { getAuthSecret } from '@/lib/auth/secret'

export const authOptions: NextAuthOptions = {
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: getAuthSecret(),
  // Ensure cookies work in production with secure settings
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null
          // Build absolute base URL for server-side fetch
          const base = (
            process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
            process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
          )

          console.log('[Auth] Attempting login for:', credentials.email, 'using base:', base)

          let res: Response | null = null
          if (base) {
            res = await fetch(`${base}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: credentials.email, password: credentials.password })
            })
            console.log('[Auth] Login API response status:', res?.status)
          } else {
            console.log('[Auth] No base URL configured, cannot call login API')
          }

          if (res && res.ok) {
            const data = await res.json().catch(() => null)
            const user = data?.user || data || { id: data?.id || credentials.email, email: credentials.email }
            console.log('[Auth] Login success, user data:', { 
              id: user.id, 
              email: user.email, 
              first_name: user.first_name, 
              last_name: user.last_name,
              username: user.username 
            })
            // Construct display name from first_name/last_name (API response) or fallback to name/username
            const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') 
              || user.name || user.fullName || user.username || ''
            console.log('[Auth] Constructed displayName:', displayName)
            return {
              id: user.id?.toString?.() || credentials.email,
              email: user.email || credentials.email,
              name: displayName,
              first_name: user.first_name || null,
              last_name: user.last_name || null,
              username: user.username || null,
            }
          }
          // If API responded with an auth error and demo is allowed, fallback
          console.log('[Auth] Login failed or fallback triggered. Status:', res?.status, 'isDemoMode:', isDemoMode(), 'allowDemoFallback:', allowDemoFallback())
          if (res && res.status === 401 && (isDemoMode() || allowDemoFallback())) {
            console.log('[Auth] Using demo fallback due to 401')
            return { id: credentials.email, email: credentials.email, name: credentials.email.split('@')[0] }
          }
          // If API not reachable or server error and demo is allowed, fallback
          if (res && (res.status === 404 || res.status === 500) && (isDemoMode() || allowDemoFallback())) {
            return { id: credentials.email, email: credentials.email, name: credentials.email.split('@')[0] }
          }
          // If we couldn't call API at all but demo is allowed, also fallback
          if (!res && (isDemoMode() || allowDemoFallback())) {
            return { id: credentials.email, email: credentials.email, name: credentials.email.split('@')[0] }
          }
        } catch (_) {}
        // Fallback: reject
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.name = user.name
        token.email = user.email
        token.first_name = (user as any).first_name ?? null
        token.last_name = (user as any).last_name ?? null
        token.username = (user as any).username ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        const userFields = {
          id: token.id as string | undefined,
          name: token.name as string | null,
          email: token.email as string | null,
          first_name: (token.first_name as string | null) ?? null,
          last_name: (token.last_name as string | null) ?? null,
          username: (token.username as string | null) ?? null,
        }
        if (!session.user) (session as any).user = userFields
        else {
          Object.assign(session.user as object, userFields)
        }
      }
      return session
    }
  },
  // Use default NextAuth pages; our app shows its own AuthModal for credentials
}



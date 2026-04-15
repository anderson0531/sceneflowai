import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminEmail } from '@/lib/adminUtils'

export async function requireAdminSession() {
  const session = await getServerSession(authOptions as any)
  const email = session?.user?.email || ''
  if (!email || !isAdminEmail(email)) {
    return { authorized: false as const, email: null }
  }
  return { authorized: true as const, email }
}

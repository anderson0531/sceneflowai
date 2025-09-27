import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.NEXT_AUTH_SECRET || 'sceneflow-dev-secret'
    const token: any = await getToken({ req, secret })
    const email = (token?.email as string | undefined)?.toLowerCase().trim()
    const admins = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
    const isAdmin = !!(email && admins.includes(email))
    return NextResponse.json({ success: true, isAdmin })
  } catch (e: any) {
    return NextResponse.json({ success: false, isAdmin: false, error: e?.message || 'error' }, { status: 200 })
  }
}



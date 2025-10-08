import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // Temporarily force admin access true
    return NextResponse.json({ success: true, isAdmin: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, isAdmin: false, error: e?.message || 'error' }, { status: 200 })
  }
}



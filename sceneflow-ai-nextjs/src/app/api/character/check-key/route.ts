import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY
  
  return NextResponse.json({
    hasKey: !!openaiKey,
    keyLength: openaiKey?.length || 0,
    keyPrefix: openaiKey?.substring(0, 10) || 'none',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('GOOGLE') || k.includes('API'))
  })
}


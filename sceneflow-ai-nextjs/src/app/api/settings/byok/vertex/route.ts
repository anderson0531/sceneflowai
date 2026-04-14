import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserProviderConfig } from '@/models/UserProviderConfig'
import { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'
import { EncryptionService } from '@/services/EncryptionService'

const VERTEX_PROVIDER = AIProvider.GOOGLE_VEO

function getKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (trimmed.length <= 8) return '••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

function normalizeApiKey(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

function isLikelyGoogleApiKey(apiKey: string): boolean {
  return /^AIza[0-9A-Za-z_-]{20,}$/.test(apiKey)
}

async function requireUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions as any)
  return (session?.user as any)?.id || null
}

export async function GET() {
  try {
    const userId = await requireUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await UserProviderConfig.findOne({
      where: { user_id: userId, provider_name: VERTEX_PROVIDER },
    })

    if (!config) {
      return NextResponse.json({
        success: true,
        configured: false,
      })
    }

    let keyHint = 'Configured'
    try {
      const decrypted = JSON.parse(EncryptionService.decrypt(config.encrypted_credentials))
      if (typeof decrypted?.keyHint === 'string' && decrypted.keyHint) {
        keyHint = decrypted.keyHint
      } else if (typeof decrypted?.apiKey === 'string' && decrypted.apiKey) {
        keyHint = getKeyHint(decrypted.apiKey)
      }
    } catch {
      // Do not fail read status if payload format changed; return safe state only.
    }

    return NextResponse.json({
      success: true,
      configured: Boolean(config.is_valid),
      keyHint,
      updatedAt: config.updated_at,
    })
  } catch (error) {
    console.error('GET /api/settings/byok/vertex error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!EncryptionService.isEncryptionConfigured()) {
      return NextResponse.json(
        { error: 'Encryption service is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const apiKey = normalizeApiKey(body?.apiKey)
    if (!apiKey) {
      return NextResponse.json({ error: 'Vertex AI key is required' }, { status: 400 })
    }
    if (!isLikelyGoogleApiKey(apiKey)) {
      return NextResponse.json(
        { error: 'Invalid Vertex AI key format' },
        { status: 400 }
      )
    }

    const keyHint = getKeyHint(apiKey)
    const encryptedCredentials = EncryptionService.encrypt(
      JSON.stringify({
        apiKey,
        keyHint,
      })
    )

    const [config, created] = await UserProviderConfig.findOrCreate({
      where: {
        user_id: userId,
        provider_name: VERTEX_PROVIDER,
      },
      defaults: {
        user_id: userId,
        provider_name: VERTEX_PROVIDER,
        encrypted_credentials: encryptedCredentials,
        is_valid: true,
      },
    })

    if (!created) {
      config.encrypted_credentials = encryptedCredentials
      config.is_valid = true
      config.updated_at = new Date()
      await config.save()
    }

    return NextResponse.json({
      success: true,
      configured: true,
      keyHint,
      updatedAt: config.updated_at,
    })
  } catch (error) {
    console.error('POST /api/settings/byok/vertex error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await UserProviderConfig.destroy({
      where: {
        user_id: userId,
        provider_name: VERTEX_PROVIDER,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/settings/byok/vertex error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserProviderConfig } from '@/models/UserProviderConfig'
import type { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'
import { EncryptionService } from '@/services/EncryptionService'
import { validateKlingByokCredential } from '@/lib/byok/resolveProviderCredential'

const KLING_PROVIDER = 'KLING' as AIProvider

function getKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (trimmed.length <= 8) return '••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

function normalizeApiKey(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

async function requireUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  return session?.user?.id || null
}

export async function GET() {
  try {
    const userId = await requireUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await UserProviderConfig.findOne({
      where: { user_id: userId, provider_name: KLING_PROVIDER },
    })

    if (!config) {
      return NextResponse.json({ success: true, configured: false })
    }

    let keyHint = 'Configured'
    try {
      const decrypted = JSON.parse(EncryptionService.decrypt(config.encrypted_credentials))
      if (typeof decrypted?.keyHint === 'string' && decrypted.keyHint) {
        keyHint = decrypted.keyHint
      } else if (typeof decrypted?.apiKey === 'string' && decrypted.apiKey) {
        keyHint = getKeyHint(decrypted.apiKey)
      } else if (typeof decrypted?.accessKey === 'string' && decrypted.accessKey) {
        keyHint = getKeyHint(decrypted.accessKey)
      }
    } catch {
      // Return status only. Never return the stored key.
    }

    return NextResponse.json({
      success: true,
      configured: Boolean(config.is_valid),
      keyHint,
      updatedAt: config.updated_at,
    })
  } catch (error) {
    console.error('GET /api/settings/byok/kling error:', error)
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
    const accessKey = normalizeApiKey(body?.accessKey)
    const secretKey = normalizeApiKey(body?.secretKey)

    const hasAccessSecret = Boolean(accessKey || secretKey)
    if (!apiKey && !hasAccessSecret) {
      return NextResponse.json(
        { error: 'Kling API key or Access Key + Secret Key is required' },
        { status: 400 }
      )
    }

    const validation = await validateKlingByokCredential(
      hasAccessSecret ? { accessKey, secretKey } : { apiKey }
    )
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error || 'Kling credential validation failed' },
        { status: 400 }
      )
    }

    const validatedAt = new Date().toISOString()
    const keyHint = hasAccessSecret ? getKeyHint(accessKey) : getKeyHint(apiKey)
    const payload = hasAccessSecret
      ? {
          mode: 'access_secret',
          accessKey,
          secretKey,
          keyHint,
          validatedAt,
        }
      : {
          mode: 'api_key',
          apiKey,
          keyHint,
          validatedAt,
        }

    const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(payload))

    const [config, created] = await UserProviderConfig.findOrCreate({
      where: {
        user_id: userId,
        provider_name: KLING_PROVIDER,
      },
      defaults: {
        user_id: userId,
        provider_name: KLING_PROVIDER,
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
    console.error('POST /api/settings/byok/kling error:', error)
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
        provider_name: KLING_PROVIDER,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/settings/byok/kling error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserProviderConfig } from '@/models/UserProviderConfig'
import type { AIProvider } from '@/services/ai-providers/BaseAIProviderAdapter'
import { EncryptionService } from '@/services/EncryptionService'
import {
  parseGoogleServiceAccountJson,
  validateGoogleByokCredential,
} from '@/lib/byok/resolveProviderCredential'

const VERTEX_PROVIDER = 'GOOGLE_VEO' as AIProvider

function getKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (trimmed.length <= 8) return '••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

function maskProjectId(projectId: string | undefined): string | undefined {
  if (!projectId) return undefined
  const trimmed = projectId.trim()
  if (!trimmed) return undefined
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}••••`
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

function getServiceAccountHint(projectId?: string, clientEmail?: string): string {
  if (clientEmail && clientEmail.includes('@')) {
    const [local, domain] = clientEmail.split('@')
    const shortLocal = local.length > 6 ? `${local.slice(0, 4)}••` : local
    return `${shortLocal}@${domain}`
  }
  const maskedProject = maskProjectId(projectId)
  return maskedProject ? `SA (${maskedProject})` : 'Service Account'
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
      where: { user_id: userId, provider_name: VERTEX_PROVIDER },
    })

    if (!config) {
      return NextResponse.json({
        success: true,
        configured: false,
      })
    }

    let keyHint = 'Configured'
    let mode: 'byok_api_key' | 'byok_service_account' | undefined
    let maskedProjectId: string | undefined
    try {
      const decrypted = JSON.parse(EncryptionService.decrypt(config.encrypted_credentials))
      if (decrypted?.mode === 'byok_service_account' || decrypted?.serviceAccountJson) {
        mode = 'byok_service_account'
        const rawProjectId =
          typeof decrypted?.projectId === 'string' && decrypted.projectId
            ? decrypted.projectId
            : parseGoogleServiceAccountJson(decrypted.serviceAccountJson)?.project_id
        maskedProjectId = maskProjectId(rawProjectId)
      } else if (decrypted?.mode === 'byok_api_key' || decrypted?.apiKey) {
        mode = 'byok_api_key'
      }

      if (typeof decrypted?.keyHint === 'string' && decrypted.keyHint) {
        keyHint = decrypted.keyHint
      } else if (typeof decrypted?.apiKey === 'string' && decrypted.apiKey) {
        keyHint = getKeyHint(decrypted.apiKey)
      } else if (mode === 'byok_service_account') {
        keyHint = getServiceAccountHint(maskedProjectId)
      }
    } catch {
      // Do not fail read status if payload format changed; return safe state only.
    }

    return NextResponse.json({
      success: true,
      configured: Boolean(config.is_valid),
      keyHint,
      mode,
      projectId: maskedProjectId,
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
    const rawServiceAccount = body?.serviceAccountJson
    const hasServiceAccount =
      rawServiceAccount !== undefined &&
      rawServiceAccount !== null &&
      (typeof rawServiceAccount !== 'string' || rawServiceAccount.trim().length > 0)

    if (!apiKey && !hasServiceAccount) {
      return NextResponse.json(
        { error: 'Vertex AI API key or Service Account JSON is required' },
        { status: 400 }
      )
    }

    const validation = await validateGoogleByokCredential(
      hasServiceAccount ? { serviceAccountJson: rawServiceAccount } : { apiKey }
    )
    if (!validation.ok || !validation.mode) {
      return NextResponse.json(
        { error: validation.error || 'Vertex AI credential validation failed' },
        { status: 400 }
      )
    }

    const validatedAt = new Date().toISOString()
    let keyHint: string
    let storedPayload: Record<string, unknown>
    let maskedProjectId: string | undefined

    if (validation.mode === 'byok_service_account') {
      const normalizedSa =
        typeof rawServiceAccount === 'string'
          ? rawServiceAccount.trim()
          : JSON.stringify(rawServiceAccount)
      const projectId = validation.projectId
      maskedProjectId = maskProjectId(projectId)
      keyHint = getServiceAccountHint(projectId, validation.clientEmail)
      storedPayload = {
        mode: 'byok_service_account',
        serviceAccountJson: normalizedSa,
        projectId,
        keyHint,
        validatedAt,
      }
    } else {
      keyHint = getKeyHint(apiKey)
      storedPayload = {
        mode: 'byok_api_key',
        apiKey,
        keyHint,
        validatedAt,
      }
    }

    const encryptedCredentials = EncryptionService.encrypt(JSON.stringify(storedPayload))

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
      mode: validation.mode,
      projectId: maskedProjectId,
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


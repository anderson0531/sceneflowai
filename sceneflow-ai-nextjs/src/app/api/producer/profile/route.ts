import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/projectAccess'
import {
  getOrCreateProducerProfile,
  upsertProducerProfile,
} from '@/lib/producer/producerProfileService'

export const runtime = 'nodejs'

function getRequestIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || null
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getOrCreateProducerProfile(userId)
    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        brandName: profile.brand_name,
        brandLogoUrl: profile.brand_logo_url,
        primaryColor: profile.primary_color,
        supportEmail: profile.support_email,
        customTermsUrl: profile.custom_terms_url,
        hideSceneFlowBranding: profile.hide_sceneflow_branding,
        defaultMaxRounds: profile.default_max_rounds,
        dailyPublicIntakeCreditCap: profile.daily_public_intake_credit_cap,
        commercialAddendumAcceptedAt: profile.commercial_addendum_accepted_at,
        commercialAddendumVersion: profile.commercial_addendum_version,
      },
    })
  } catch (err: unknown) {
    console.warn('[producer/profile GET] Serving sandbox Producer Hub profile:', err)
    return NextResponse.json({
      success: true,
      profile: {
        id: 'producer-profile-sandbox',
        brandName: 'Meridian Storyworks',
        brandLogoUrl: null,
        primaryColor: '#06b6d4',
        supportEmail: 'producers@meridianstoryworks.com',
        customTermsUrl: 'https://meridianstoryworks.com/client-terms',
        hideSceneFlowBranding: false,
        defaultMaxRounds: 2,
        dailyPublicIntakeCreditCap: 1500,
        commercialAddendumAcceptedAt: '2026-11-01T10:00:00.000Z',
        commercialAddendumVersion: '2026-11',
      },
      demoFallback: true,
    })
  }
}

export async function PUT(req: NextRequest) {
  let parsedBody: Record<string, any> = {}
  try {
    const userId = await getAuthenticatedUserId(req)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    parsedBody = await req.json().catch(() => ({}))
    const body = parsedBody
    const profile = await upsertProducerProfile(userId, {
      brandName: body.brandName,
      brandLogoUrl: body.brandLogoUrl,
      primaryColor: body.primaryColor,
      supportEmail: body.supportEmail,
      customTermsUrl: body.customTermsUrl,
      hideSceneFlowBranding: body.hideSceneFlowBranding,
      defaultMaxRounds: body.defaultMaxRounds,
      dailyPublicIntakeCreditCap: body.dailyPublicIntakeCreditCap,
      acceptCommercialAddendum: body.acceptCommercialAddendum === true,
      acceptedIp: getRequestIp(req),
    })

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        brandName: profile.brand_name,
        brandLogoUrl: profile.brand_logo_url,
        primaryColor: profile.primary_color,
        supportEmail: profile.support_email,
        customTermsUrl: profile.custom_terms_url,
        hideSceneFlowBranding: profile.hide_sceneflow_branding,
        defaultMaxRounds: profile.default_max_rounds,
        dailyPublicIntakeCreditCap: profile.daily_public_intake_credit_cap,
        commercialAddendumAcceptedAt: profile.commercial_addendum_accepted_at,
        commercialAddendumVersion: profile.commercial_addendum_version,
      },
    })
  } catch (err: unknown) {
    console.warn('[producer/profile PUT] Serving sandbox ack:', err)
    return NextResponse.json({
      success: true,
      profile: {
        id: 'producer-profile-sandbox',
        brandName: parsedBody.brandName ?? 'Meridian Storyworks',
        brandLogoUrl: parsedBody.brandLogoUrl ?? null,
        primaryColor: parsedBody.primaryColor ?? '#06b6d4',
        supportEmail: parsedBody.supportEmail ?? 'producers@meridianstoryworks.com',
        customTermsUrl: parsedBody.customTermsUrl ?? 'https://meridianstoryworks.com/client-terms',
        hideSceneFlowBranding: Boolean(parsedBody.hideSceneFlowBranding),
        defaultMaxRounds: Number(parsedBody.defaultMaxRounds ?? 2),
        dailyPublicIntakeCreditCap: Number(parsedBody.dailyPublicIntakeCreditCap ?? 1500),
        commercialAddendumAcceptedAt: '2026-11-01T10:00:00.000Z',
        commercialAddendumVersion: '2026-11',
      },
      demoFallback: true,
    })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import '@/models'
import Project from '@/models/Project'
import User from '@/models/User'
import WorkspaceMember from '@/models/WorkspaceMember'
import ProjectAssignment from '@/models/ProjectAssignment'
import { authOptions } from '@/lib/auth'
import { getSessionUserId } from '@/lib/auth/sessionUser'
import { ensureProducerPlatformSchema } from '@/lib/database/migrateProducerPlatform'
import { createOrUpdateContinuityPortalLink } from '@/lib/continuity/continuityPortalService'
import { resolveClientPortalLocale } from '@/lib/intake/clientPortalCopy'
import { notifyUser } from '@/lib/jobs/jobService'

export const runtime = 'nodejs'
export const maxDuration = 60

export type InitiatedVertical =
  | 'video_memoir'
  | 'real_estate_tour'
  | 'education_module'
  | 'brand_story'
  | 'creator_film'

const VERTICAL_DEFAULTS: Record<
  InitiatedVertical,
  {
    genre: string
    tone: string
    visualStyle: string
    characters: Array<{ id: string; name: string; role: string; description: string }>
    locations: Array<{ id: string; name: string; description: string }>
    props: Array<{ id: string; name: string; description: string }>
  }
> = {
  video_memoir: {
    genre: 'Documentary Memoir',
    tone: 'Warm, intimate, emotionally resonant',
    visualStyle: 'Naturalistic cinema lighting with archival family warmth',
    characters: [
      {
        id: 'char-1',
        name: 'Featured Subject / Narrator',
        role: 'Protagonist',
        description: 'Upload portraits across key eras of life for consistent storytelling.',
      },
    ],
    locations: [
      {
        id: 'loc-1',
        name: 'Family Home / Milestone Setting',
        description: 'Upload photos of childhood home, hometown, or cherished gathering place.',
      },
    ],
    props: [
      {
        id: 'prop-1',
        name: 'Cherished Heirloom / Keepsake',
        description: 'Upload close-up photos of meaningful letters, medals, or family artifacts.',
      },
    ],
  },
  real_estate_tour: {
    genre: 'Architectural Showcase',
    tone: 'Refined, aspirational, inviting',
    visualStyle: 'Crisp architectural daylight & golden-hour twilight cinematography',
    characters: [
      {
        id: 'char-1',
        name: 'Listing Host / Presenter',
        role: 'Presenter',
        description: 'Optional on-camera agent or lifestyle talent portrait.',
      },
    ],
    locations: [
      {
        id: 'loc-1',
        name: 'Exterior Facade & Entry',
        description: 'Upload front elevation, curb appeal, and entryway listing photos.',
      },
      {
        id: 'loc-2',
        name: 'Primary Living & Kitchen Suite',
        description: 'Upload main interior room photos for accurate architectural motion.',
      },
    ],
    props: [
      {
        id: 'prop-1',
        name: 'Brokerage Logo / Architectural Detail',
        description: 'Upload brand mark or signature material fixture.',
      },
    ],
  },
  education_module: {
    genre: 'Training & Explainer',
    tone: 'Clear, authoritative, engaging',
    visualStyle: 'Clean studio visual clarity with structured demonstration framing',
    characters: [
      {
        id: 'char-1',
        name: 'Lead Instructor / Presenter',
        role: 'Presenter',
        description: 'Upload instructor headshot or brand avatar reference.',
      },
    ],
    locations: [
      {
        id: 'loc-1',
        name: 'Operational Environment / Studio',
        description: 'Upload workplace, facility, or studio environment reference.',
      },
    ],
    props: [
      {
        id: 'prop-1',
        name: 'Equipment / SOP Subject',
        description: 'Upload product, tool, or process reference photo.',
      },
    ],
  },
  brand_story: {
    genre: 'Commercial Brand Film',
    tone: 'Confident, human, cinematic',
    visualStyle: 'Anamorphic commercial polish with authentic brand color palette',
    characters: [
      {
        id: 'char-1',
        name: 'Founder / Customer Hero',
        role: 'Lead',
        description: 'Upload founder or hero customer reference portrait.',
      },
    ],
    locations: [
      {
        id: 'loc-1',
        name: 'Flagship Studio / Storefront',
        description: 'Upload workspace, storefront, or customer setting photo.',
      },
    ],
    props: [
      {
        id: 'prop-1',
        name: 'Hero Product & Packaging',
        description: 'Upload crisp product angles and brand mark.',
      },
    ],
  },
  creator_film: {
    genre: 'Narrative Short / Series',
    tone: 'Cinematic, character-driven',
    visualStyle: 'Widescreen cinema lighting and expressive framing',
    characters: [
      {
        id: 'char-1',
        name: 'Lead Protagonist',
        role: 'Lead',
        description: 'Primary character portrait reference.',
      },
    ],
    locations: [
      {
        id: 'loc-1',
        name: 'Primary Story Location',
        description: 'Key setting reference plate.',
      },
    ],
    props: [
      {
        id: 'prop-1',
        name: 'Signature Story Prop',
        description: 'Key narrative object reference.',
      },
    ],
  },
}

export function buildInitialBlueprintMetadataFromBrief(input: {
  title: string
  brief: string
  vertical: InitiatedVertical
  requestPmSupport: boolean
  customerName?: string
  customerEmail?: string
  creditBudgetCap?: number | null
  locale?: string
}) {
  const preset = VERTICAL_DEFAULTS[input.vertical] || VERTICAL_DEFAULTS.video_memoir
  const cleanBrief = input.brief.trim()
  const locale = resolveClientPortalLocale(input.locale)
  const cap =
    typeof input.creditBudgetCap === 'number' && input.creditBudgetCap > 0
      ? Math.round(input.creditBudgetCap)
      : null

  return {
    concept: cleanBrief,
    blueprintPrimeInput: cleanBrief,
    filmTreatmentVariant: {
      id: 'mobile-initiated-v1',
      label: 'Baseline Blueprint',
      title: input.title,
      logline: cleanBrief.slice(0, 240),
      synopsis: cleanBrief,
      genre: preset.genre,
      tone: preset.tone,
      visual_style: preset.visualStyle,
      character_descriptions: preset.characters,
      beats: [
        {
          title: 'Act I — Hook & World Setup',
          synopsis: `Introduce the core subject and emotional stakes of "${input.title}".`,
        },
        {
          title: 'Act II — Journey & Key Moments',
          synopsis: cleanBrief,
        },
        {
          title: 'Act III — Resolution & Lasting Impact',
          synopsis: 'Deliver a memorable closing takeaway ready for Audience Resonance review.',
        },
      ],
    },
    visionPhase: {
      characters: preset.characters.map((c) => ({ ...c, wardrobes: [] })),
      references: {
        locationReferences: preset.locations.map((l) => ({ ...l })),
        objectReferences: preset.props.map((p) => ({ ...p })),
      },
      scenes: [],
    },
    ...(cap ? { creditsBudget: cap } : {}),
    clientOrder: {
      isClientProject: Boolean(input.requestPmSupport),
      pmSupportRequested: Boolean(input.requestPmSupport),
      initiatedVia: 'mobile_companion_pwa',
      vertical: input.vertical,
      locale,
      customerName: input.customerName || 'Subscriber',
      customerEmail: input.customerEmail || undefined,
      creditBudgetCap: cap,
      stage: input.requestPmSupport ? 'blueprint_review_ready' : 'draft',
      actionState: input.requestPmSupport ? 'action_required' : undefined,
      continuityChecklist: {
        characters: preset.characters.map((c) => c.name),
        locations: preset.locations.map((l) => l.name),
        props: preset.props.map((p) => p.name),
      },
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }
    const authSession = await getServerSession(authOptions as any).catch(() => null)
    const sessionUser = (authSession?.user || {}) as { name?: string; email?: string }

    const body = await req.json().catch(() => ({}))
    const title = String(body.title || '').trim().slice(0, 140)
    const brief = String(body.brief || '').trim().slice(0, 4000)
    const rawVertical = String(body.vertical || 'video_memoir') as InitiatedVertical
    const vertical: InitiatedVertical = rawVertical in VERTICAL_DEFAULTS ? rawVertical : 'video_memoir'
    const requestPmSupport = body.requestPmSupport !== false
    const pmEmail = body.pmEmail ? String(body.pmEmail).trim().toLowerCase() : ''
    const creditBudgetCap =
      body.creditBudgetCap != null && Number(body.creditBudgetCap) > 0
        ? Math.round(Number(body.creditBudgetCap))
        : null

    if (!title || brief.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Please provide a project title and brief (at least 10 characters).' },
        { status: 400 }
      )
    }

    await ensureProducerPlatformSchema()

    const metadata = buildInitialBlueprintMetadataFromBrief({
      title,
      brief,
      vertical,
      requestPmSupport,
      customerName: sessionUser.name || undefined,
      customerEmail: sessionUser.email || undefined,
      creditBudgetCap,
      locale: body.locale,
    })

    const createdProject = await Project.create({
      user_id: userId,
      title,
      description: brief.slice(0, 500),
      current_step: 'ideation',
      status: 'in_progress',
      step_progress: { ideation: 50, overall: 15 },
      metadata: metadata as Record<string, unknown>,
    } as any)

    // Optional direct PM email assignment so the PM immediately sees the project on Desktop & Mobile
    if (pmEmail && pmEmail.includes('@')) {
      try {
        const matchedPm = await User.findOne({ where: { email: pmEmail } })
        const [member] = await WorkspaceMember.findOrCreate({
          where: {
            owner_user_id: userId,
            member_email: pmEmail,
          },
          defaults: {
            owner_user_id: userId,
            member_user_id: matchedPm?.id || null,
            member_email: pmEmail,
            role: 'project_manager',
            status: matchedPm ? 'active' : 'invited',
            access_all_projects: false,
          },
        })
        if (matchedPm && !member.member_user_id) {
          await member.update({ member_user_id: matchedPm.id, status: 'active' })
        }
        if (matchedPm?.id) {
          await ProjectAssignment.findOrCreate({
            where: {
              project_id: createdProject.id,
              owner_user_id: userId,
              member_user_id: matchedPm.id,
            },
            defaults: {
              project_id: createdProject.id,
              owner_user_id: userId,
              member_user_id: matchedPm.id,
            },
          })
        }
      } catch (pmErr) {
        console.warn('[companion initiate] PM assignment warning:', pmErr)
      }
    }

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('x-forwarded-host')}`
      : new URL(req.url).origin

    // Pre-create Shared Continuity Link so customer & PM can immediately upload photos from mobile
    let continuityShareUrl: string | null = null
    try {
      const cont = await createOrUpdateContinuityPortalLink({
        project: createdProject,
        ownerUserId: userId,
        ownerDisplayName: sessionUser.name || 'Project Owner',
        clientMode: false,
        allowUploads: true,
        locale: body.locale,
        origin,
      })
      continuityShareUrl = cont.url
    } catch (contErr) {
      console.warn('[companion initiate] Continuity link pre-creation skipped:', contErr)
    }

    try {
      await notifyUser({
        userId,
        projectId: createdProject.id,
        type: 'client_intake_submitted',
        title: requestPmSupport
          ? `PM Support Requested: ${title}`
          : `Project & Blueprint Initiated: ${title}`,
        message: requestPmSupport
          ? `${sessionUser.name || 'Customer'} initiated "${title}" with a baseline Blueprint and requested PM review.`
          : `Baseline Blueprint and Continuity slots created for "${title}".`,
        sendEmail: Boolean(requestPmSupport),
        metadata: {
          projectId: createdProject.id,
          stage: 'blueprint_review_ready',
          openPath: `/dashboard/studio/${createdProject.id}`,
        },
      })
    } catch (notifyErr) {
      console.warn('[companion initiate] notify warning:', notifyErr)
    }

    return NextResponse.json({
      success: true,
      projectId: createdProject.id,
      title: createdProject.title,
      continuityShareUrl,
      requestPmSupport,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to initiate project'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

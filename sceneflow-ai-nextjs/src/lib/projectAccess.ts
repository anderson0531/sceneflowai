import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AuthService } from '@/services/AuthService'
import { resolveUserId } from '@/lib/userHelper'
import Project from '@/models/Project'

/**
 * Resolve the authenticated user's canonical DB UUID (session.user.id may be email or legacy id).
 */
export async function getAuthenticatedUserId(req?: NextRequest): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions as any).catch(() => null)
    const user = session?.user as { id?: string; email?: string } | undefined
    if (user?.id) {
      try {
        return await resolveUserId(user.id)
      } catch {
        if (user.email) return await resolveUserId(user.email)
      }
    }
    if (user?.email) {
      return await resolveUserId(user.email)
    }
  } catch {
    /* fall through */
  }

  if (req) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (token) {
      const vr = await AuthService.verifyToken(token)
      if (vr.success && vr.user?.id) {
        try {
          return await resolveUserId(vr.user.id)
        } catch {
          if (vr.user.email) return await resolveUserId(vr.user.email)
        }
      }
    }
  }

  return null
}

export type ProjectAccessResult =
  | { ok: true; project: Project; migrated?: boolean }
  | { ok: false; status: number; error: string }

/**
 * Ensure the authenticated user may act on this project.
 * If the project still has a legacy localStorage owner id, migrate it when legacyOwnerId matches.
 */
export async function assertProjectAccess(
  projectId: string,
  ownerUserId: string,
  legacyOwnerId?: string | null
): Promise<ProjectAccessResult> {
  const project = await Project.findByPk(projectId)
  if (!project) {
    return { ok: false, status: 404, error: 'Project not found' }
  }

  const projectOwnerId = String((project as { user_id?: string }).user_id || '')

  if (!projectOwnerId || projectOwnerId === ownerUserId) {
    return { ok: true, project }
  }

  // Legacy: project created before login sync (localStorage authUserId)
  if (legacyOwnerId && projectOwnerId === legacyOwnerId) {
    await project.update({ user_id: ownerUserId })
    return { ok: true, project, migrated: true }
  }

  // Same account, different id representation (e.g. email vs uuid) — compare via resolveUserId
  try {
    const resolvedProjectOwner = await resolveUserId(projectOwnerId)
    if (resolvedProjectOwner === ownerUserId) {
      return { ok: true, project }
    }
  } catch {
    /* project owner id may be orphan localStorage uuid */
  }

  return {
    ok: false,
    status: 403,
    error: 'You do not have permission to share this project',
  }
}

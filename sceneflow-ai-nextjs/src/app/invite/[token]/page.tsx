'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  LogIn,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getLoginUrl } from '@/lib/auth/postLoginRedirect'
import { setActiveWorkspaceOwnerId } from '@/lib/producer/activeWorkspaceClient'

interface InviteDetails {
  valid: boolean
  expired: boolean
  status: string
  workspaceOwnerId: string
  workspaceBrandName: string
  brandLogoUrl: string | null
  primaryColor: string
  ownerName: string
  memberEmail: string
  role: 'admin' | 'project_manager' | 'qa_reviewer'
  roleLabel: string
  roleDescription: string
  monthlyCreditLimit: number | null
  accessAllProjects: boolean
  expiresAt: string | null
}

export default function WorkspaceInviteAcceptPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()

  const token = typeof params?.token === 'string' ? params.token : ''
  const [loading, setLoading] = useState(true)
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link.')
      setLoading(false)
      return
    }
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch(`/api/workspace/invite/${encodeURIComponent(token)}`)
        const data = await res.json().catch(() => ({}))
        if (!mounted) return
        if (!res.ok || !data.success || !data.invite) {
          setError(data.error || 'This workspace invitation is no longer valid.')
        } else {
          setInvite(data.invite)
        }
      } catch {
        if (mounted) setError('Could not load invitation details.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    setError(null)
    try {
      const res = await fetch(`/api/workspace/invite/${encodeURIComponent(token)}`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not accept invitation.')
        return
      }
      if (data.workspaceOwnerId) {
        setActiveWorkspaceOwnerId(data.workspaceOwnerId)
      }
      setAccepted(true)
      setTimeout(() => {
        router.push('/dashboard/projects')
      }, 1200)
    } catch {
      setError('Network error while accepting invitation.')
    } finally {
      setAccepting(false)
    }
  }

  const returnUrl = `/invite/${encodeURIComponent(token)}`

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900/90 shadow-2xl p-8 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm">Validating workspace invitation…</p>
          </div>
        ) : error && !invite ? (
          <div className="text-center space-y-4 py-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-white">Invitation Unavailable</h1>
            <p className="text-sm text-gray-400">{error}</p>
            <Link href="/dashboard/projects">
              <Button variant="secondary" className="mt-2">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        ) : invite ? (
          <>
            <div className="flex items-center gap-3">
              {invite.brandLogoUrl ? (
                <img
                  src={invite.brandLogoUrl}
                  alt={invite.workspaceBrandName}
                  className="w-12 h-12 rounded-xl object-contain bg-gray-950 border border-gray-800 p-1.5"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center border border-gray-700"
                  style={{ backgroundColor: `${invite.primaryColor}22` }}
                >
                  <Building2 className="w-6 h-6 text-cyan-300" />
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                  Workspace Invitation
                </p>
                <h1 className="text-xl font-bold text-white">{invite.workspaceBrandName}</h1>
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 space-y-2.5 text-sm">
              <p className="text-gray-300">
                <strong className="text-white">{invite.ownerName}</strong> invited{' '}
                <strong className="text-cyan-300">{invite.memberEmail}</strong> to join as:
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                {invite.roleLabel}
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{invite.roleDescription}</p>
              <div className="pt-1 flex flex-wrap gap-3 text-xs text-gray-300">
                <span>
                  Scope:{' '}
                  <strong className="text-white">
                    {invite.accessAllProjects ? 'All Workspace Projects' : 'Assigned Projects & Series'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Credit Cap:{' '}
                  <strong className="text-white">
                    {invite.role === 'qa_reviewer'
                      ? '0 credits (Review Only)'
                      : invite.monthlyCreditLimit
                        ? `${invite.monthlyCreditLimit.toLocaleString()} cr/mo`
                        : 'Workspace Pool'}
                  </strong>
                </span>
              </div>
            </div>

            {invite.expired ? (
              <div className="rounded-xl border border-amber-500/35 bg-amber-950/30 p-4 text-xs text-amber-200">
                This invitation link has expired. Please ask <strong>{invite.ownerName}</strong> to
                resend your invite from Producer Hub.
              </div>
            ) : accepted ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 flex items-center gap-3 text-sm text-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  Invitation accepted! Switching to <strong>{invite.workspaceBrandName}</strong>…
                </span>
              </div>
            ) : (
              <>
                {error && (
                  <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200">
                    {error}
                  </div>
                )}

                {authStatus === 'authenticated' && session?.user ? (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400">
                      Signed in as <strong className="text-gray-200">{session.user.email}</strong>
                    </p>
                    <Button
                      variant="primary"
                      disabled={accepting}
                      onClick={handleAccept}
                      className="w-full justify-center py-2.5"
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Accepting Invitation…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Accept &amp; Open {invite.workspaceBrandName}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400">
                      Sign in or create a free SceneFlow account to activate your team seat.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        variant="primary"
                        onClick={() => {
                          window.location.href = getLoginUrl({ returnUrl, mode: 'signup' })
                        }}
                        className="w-full justify-center"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.location.href = getLoginUrl({ returnUrl })
                        }}
                        className="w-full justify-center border-gray-700 text-gray-200 hover:bg-gray-800"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

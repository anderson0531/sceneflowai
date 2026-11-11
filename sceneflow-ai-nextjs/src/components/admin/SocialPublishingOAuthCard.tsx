'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Copy, ExternalLink, KeyRound, Loader2, ShieldAlert, Youtube } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface PlatformOAuthStatus {
  isAdmin?: boolean
  configured: boolean
  source?: 'env' | 'admin_db' | 'none'
  redirectUri?: string
  recommendedRedirectUris?: string[]
  facebookConfigured?: boolean
  facebookRedirectUri?: string
  tiktokConfigured?: boolean
  tiktokRedirectUri?: string
}

/**
 * Admin-only card in `/dashboard/settings/admin`.
 * Manages SceneFlow's ONE-TIME platform OAuth app registration so end users only ever
 * click "Authorize YouTube / Facebook / TikTok" (standard OAuth consent).
 */
export function SocialPublishingOAuthCard() {
  const [status, setStatus] = useState<PlatformOAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingYoutube, setEditingYoutube] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [credentialsJson, setCredentialsJson] = useState('')
  const [saving, setSaving] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/publish/youtube/config')
      const data = (await res.json()) as PlatformOAuthStatus
      setStatus(data)
      if (!data.configured) {
        setEditingYoutube(true)
      }
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleSaveYoutubePlatformOAuth = async () => {
    if (!credentialsJson.trim() && (!clientId.trim() || !clientSecret.trim())) {
      toast.error('Enter SceneFlow Google OAuth Client ID & Secret, or paste client_secret.json')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/publish/youtube/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
          credentialsJson: credentialsJson.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save platform OAuth credentials')
      toast.success('SceneFlow YouTube OAuth app saved for all users')
      setClientSecret('')
      setCredentialsJson('')
      setEditingYoutube(false)
      await loadStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save platform OAuth credentials')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-gray-800/60 border-gray-700/60 text-white">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">
              Social Publishing Platform OAuth (SceneFlow App)
            </CardTitle>
            <CardDescription className="text-gray-400">
              One-time SceneFlow platform OAuth app setup (Admin only). Once enabled here or via
              Vercel Environment Variables, users simply click &ldquo;Authorize&rdquo; to grant
              SceneFlow access to their YouTube, Facebook, or TikTok account.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking platform OAuth configuration…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* YouTube Platform Status */}
              <div className="rounded-lg border border-gray-700/70 bg-gray-900/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white text-xs">YouTube (Google OAuth)</span>
                  {status?.configured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      {status.source === 'env' ? 'Vercel Env' : 'Admin Saved'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      <ShieldAlert className="w-3 h-3" />
                      Not Set
                    </span>
                  )}
                </div>
                {(status?.recommendedRedirectUris?.length || status?.redirectUri) ? (
                  <div className="text-[11px] text-gray-400 space-y-1">
                    <span>Authorized Redirect URIs:</span>
                    {(status?.recommendedRedirectUris?.length
                      ? status.recommendedRedirectUris
                      : [status!.redirectUri!]
                    ).map((uri) => (
                      <div key={uri} className="flex items-center justify-between gap-1.5 rounded bg-gray-950 px-2 py-1">
                        <code className="text-[10px] text-gray-200 break-all">{uri}</code>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(uri)
                            toast.success('Copied YouTube callback URI')
                          }}
                          className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 shrink-0"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingYoutube((v) => !v)}
                  className="w-full h-7 text-xs border-gray-700 text-gray-200"
                >
                  {editingYoutube
                    ? 'Hide Credentials Form'
                    : status?.configured
                      ? 'Update Platform Credentials'
                      : 'Configure Platform Credentials'}
                </Button>
              </div>

              {/* Facebook Platform Status */}
              <div className="rounded-lg border border-gray-700/70 bg-gray-900/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white text-xs">Facebook App</span>
                  {status?.facebookConfigured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      Vercel Env
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      <ShieldAlert className="w-3 h-3" />
                      Not Set
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  Set <code className="text-gray-200">FACEBOOK_APP_ID</code> &amp;{' '}
                  <code className="text-gray-200">FACEBOOK_APP_SECRET</code> in Vercel Env Vars.
                </p>
                {status?.facebookRedirectUri ? (
                  <code className="block rounded bg-gray-950 px-2 py-1 text-[10px] text-gray-300 break-all">
                    {status.facebookRedirectUri}
                  </code>
                ) : null}
              </div>

              {/* TikTok Platform Status */}
              <div className="rounded-lg border border-gray-700/70 bg-gray-900/70 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-white text-xs">TikTok App</span>
                  {status?.tiktokConfigured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      Vercel Env
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      <ShieldAlert className="w-3 h-3" />
                      Not Set
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  Set <code className="text-gray-200">TIKTOK_CLIENT_KEY</code> &amp;{' '}
                  <code className="text-gray-200">TIKTOK_CLIENT_SECRET</code> in Vercel Env Vars.
                </p>
                {status?.tiktokRedirectUri ? (
                  <code className="block rounded bg-gray-950 px-2 py-1 text-[10px] text-gray-300 break-all">
                    {status.tiktokRedirectUri}
                  </code>
                ) : null}
              </div>
            </div>

            {editingYoutube ? (
              <div className="rounded-lg border border-violet-500/30 bg-gray-900/90 p-4 space-y-3">
                <p className="text-xs text-gray-300">
                  Set <code className="text-violet-300">GOOGLE_OAUTH_CLIENT_ID</code> and{' '}
                  <code className="text-violet-300">GOOGLE_OAUTH_CLIENT_SECRET</code> in Vercel
                  Environment Variables (recommended), or save SceneFlow&apos;s encrypted platform
                  Google OAuth Web Client credentials below:
                </p>
                <textarea
                  value={credentialsJson}
                  onChange={(e) => setCredentialsJson(e.target.value)}
                  rows={2}
                  placeholder='Paste SceneFlow GCP client_secret.json ({"web":{"client_id":"...","client_secret":"..."}}) or enter below'
                  className="w-full rounded border border-gray-700 bg-gray-950 px-2.5 py-1.5 text-xs text-white font-mono"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="SceneFlow GOOGLE_OAUTH_CLIENT_ID"
                    className="rounded border border-gray-700 bg-gray-950 px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="SceneFlow GOOGLE_OAUTH_CLIENT_SECRET"
                    className="rounded border border-gray-700 bg-gray-950 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingYoutube(false)}
                    className="h-8 text-xs border-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => void handleSaveYoutubePlatformOAuth()}
                    className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                    Save Platform OAuth App
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminYoutubeQuickEnablePanel({
  redirectUris,
  onSavedAndConnect,
}: {
  redirectUris: string[]
  onSavedAndConnect: () => void
}) {
  const [credentialsJson, setCredentialsJson] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!credentialsJson.trim() && (!clientId.trim() || !clientSecret.trim())) {
      toast.error('Paste client_secret.json or enter SceneFlow Google OAuth Client ID & Secret')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/publish/youtube/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialsJson: credentialsJson.trim() || undefined,
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save platform OAuth credentials')
      setCredentialsJson('')
      setClientSecret('')
      toast.success(
        'SceneFlow Google OAuth enabled! Now click "Authorize YouTube" above to open Google Sign-In.'
      )
      onSavedAndConnect()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save platform OAuth credentials')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-violet-500/35 bg-violet-950/20 p-3 space-y-2.5 text-xs">
      <div className="space-y-1">
        <p className="font-medium text-violet-200">
          One-Time SceneFlow Platform OAuth Setup (Visible to Admins Only)
        </p>
        <p className="text-[11px] text-zinc-300 leading-relaxed">
          Google requires SceneFlow&apos;s own OAuth 2.0 Web Client (
          <code className="text-violet-300">GOOGLE_OAUTH_CLIENT_ID</code> &amp;{' '}
          <code className="text-violet-300">GOOGLE_OAUTH_CLIENT_SECRET</code>) before it can
          display the user &ldquo;Sign in with Google&rdquo; YouTube consent screen. Create one
          Web OAuth Client in SceneFlow&apos;s Google Cloud Console (with{' '}
          <strong>YouTube Data API v3</strong> enabled), register the Authorized Redirect URI(s)
          below, and save once:
        </p>
      </div>

      {redirectUris.length > 0 ? (
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
            Authorized Redirect URIs to register in Google Cloud Console:
          </span>
          <div className="space-y-1">
            {redirectUris.map((uri) => (
              <div
                key={uri}
                className="flex items-center justify-between gap-2 rounded bg-zinc-950/90 border border-zinc-800 px-2 py-1"
              >
                <code className="text-[11px] text-zinc-200 break-all">{uri}</code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(uri)
                    toast.success('Copied redirect URI')
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200 shrink-0"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2 pt-1">
        <textarea
          value={credentialsJson}
          onChange={(e) => setCredentialsJson(e.target.value)}
          rows={2}
          placeholder='Paste Google Cloud client_secret.json ({"web":{"client_id":"...","client_secret":"..."}}) — or enter ID & Secret below'
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white font-mono"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="GOOGLE_OAUTH_CLIENT_ID"
            className="rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
          />
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="GOOGLE_OAUTH_CLIENT_SECRET"
            className="rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
          />
        </div>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <a
            href="/dashboard/settings/admin"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 underline"
          >
            Open Admin Settings <ExternalLink className="h-3 w-3" />
          </a>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
            className="h-8 text-xs bg-red-600 hover:bg-red-500 text-white"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Youtube className="h-3.5 w-3.5 mr-1.5" />
            )}
            Save Platform OAuth
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  CheckCircle,
  CheckCircle2,
  ExternalLink,
  Facebook,
  KeyRound,
  Link2,
  Loader2,
  Music2,
  RefreshCw,
  Share2,
  Unlink,
  Youtube,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { openSocialOAuthPopup } from '@/lib/publish/socialOAuthPopup'

interface YouTubeChannelInfo {
  id: string
  title: string
  customUrl?: string
  thumbnailUrl?: string
}

export default function IntegrationsPage() {
  const [loadingSocial, setLoadingSocial] = useState(true)
  const [disconnecting, setDisconnecting] = useState<'youtube' | 'facebook' | 'tiktok' | null>(null)
  const [authorizing, setAuthorizing] = useState<'youtube' | 'facebook' | 'tiktok' | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const oauthCleanupRef = useRef<(() => void) | null>(null)

  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [youtubeNeedsReconnect, setYoutubeNeedsReconnect] = useState(false)
  const [youtubeChannel, setYoutubeChannel] = useState<YouTubeChannelInfo | null>(null)
  const [youtubePlatformReady, setYoutubePlatformReady] = useState(false)

  const [facebookConnected, setFacebookConnected] = useState(false)
  const [facebookPageName, setFacebookPageName] = useState<string | null>(null)
  const [facebookPlatformReady, setFacebookPlatformReady] = useState(false)

  const [tiktokConnected, setTiktokConnected] = useState(false)
  const [tiktokPlatformReady, setTiktokPlatformReady] = useState(false)

  useEffect(() => {
    return () => {
      oauthCleanupRef.current?.()
    }
  }, [])

  const refreshSocialStatus = useCallback(async () => {
    setLoadingSocial(true)
    try {
      const [yt, fb, tt, ytCfg] = await Promise.all([
        fetch('/api/publish/youtube/upload')
          .then((r) => r.json())
          .catch(() => ({})),
        fetch('/api/publish/facebook/upload')
          .then((r) => r.json())
          .catch(() => ({})),
        fetch('/api/publish/tiktok/upload')
          .then((r) => r.json())
          .catch(() => ({})),
        fetch('/api/publish/youtube/config')
          .then((r) => r.json())
          .catch(() => ({})),
      ])

      setYoutubeConnected(Boolean(yt.connected))
      setYoutubeNeedsReconnect(Boolean(yt.needsReconnect))
      setYoutubeChannel(yt.channel || null)
      setYoutubePlatformReady(Boolean(yt.oauthConfigured || ytCfg.configured))
      setIsAdminUser(Boolean(ytCfg.isAdmin))

      setFacebookConnected(Boolean(fb.connected))
      setFacebookPageName(fb.pageName || fb.pages?.[0]?.name || null)
      setFacebookPlatformReady(Boolean(fb.oauthConfigured))

      setTiktokConnected(Boolean(tt.connected))
      setTiktokPlatformReady(Boolean(tt.oauthConfigured))
    } finally {
      setLoadingSocial(false)
    }
  }, [])

  useEffect(() => {
    void refreshSocialStatus()
  }, [refreshSocialStatus])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const yt = url.searchParams.get('youtube')
    const fb = url.searchParams.get('facebook')
    const tt = url.searchParams.get('tiktok')
    if (!yt && !fb && !tt) return

    if (yt === 'connected') {
      toast.success('YouTube account authorized!')
      void refreshSocialStatus()
    } else if (yt === 'not_configured') {
      toast.error('YouTube publishing is temporarily unavailable while platform authorization is being enabled.')
    } else if (yt) {
      toast.error('YouTube authorization was cancelled or did not complete.')
    }

    if (fb === 'connected') {
      toast.success('Facebook account authorized!')
      void refreshSocialStatus()
    } else if (fb === 'not_configured') {
      toast.error('Facebook publishing is temporarily unavailable while platform authorization is being enabled.')
    }

    if (tt === 'connected') {
      toast.success('TikTok account authorized!')
      void refreshSocialStatus()
    } else if (tt === 'not_configured') {
      toast.error('TikTok publishing is temporarily unavailable while platform authorization is being enabled.')
    }

    url.searchParams.delete('youtube')
    url.searchParams.delete('facebook')
    url.searchParams.delete('tiktok')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [refreshSocialStatus])

  const authorizePlatform = (platform: 'youtube' | 'facebook' | 'tiktok') => {
    const params = new URLSearchParams({ returnTo: '/dashboard/settings/integrations' })
    const authUrl = `/api/publish/${platform}/auth?${params.toString()}`
    oauthCleanupRef.current?.()
    setAuthorizing(platform)
    const { usedPopup, cleanup } = openSocialOAuthPopup({
      platform,
      authUrl,
      onComplete: (result) => {
        setAuthorizing(null)
        oauthCleanupRef.current = null
        if (result.status === 'connected') {
          toast.success(
            `${platform === 'youtube' ? 'YouTube' : platform === 'facebook' ? 'Facebook' : 'TikTok'} account authorized!`
          )
        } else if (result.status === 'not_configured') {
          toast.error('Platform OAuth credentials need to be configured in Admin Settings first.')
        } else if (result.status !== 'popup_closed') {
          toast.error(result.message || 'Authorization was cancelled or did not complete.')
        }
        void refreshSocialStatus()
      },
    })
    if (usedPopup) {
      oauthCleanupRef.current = cleanup
    }
  }

  const disconnectPlatform = async (platform: 'youtube' | 'facebook' | 'tiktok') => {
    setDisconnecting(platform)
    try {
      const res = await fetch(`/api/publish/${platform}/upload`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to disconnect account')
      toast.success(
        `${platform === 'youtube' ? 'YouTube' : platform === 'facebook' ? 'Facebook' : 'TikTok'} disconnected`
      )
      await refreshSocialStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect account')
    } finally {
      setDisconnecting(null)
    }
  }

  const integrations = [
    {
      name: 'BYOK Settings',
      description: 'Configure your own API keys for AI generation providers',
      icon: '🔑',
      href: '/dashboard/settings/byok',
      available: true,
    },
    {
      name: 'Slack',
      description: 'Get production notifications and review updates in Slack',
      icon: '💬',
      href: '#',
      available: false,
    },
    {
      name: 'Discord',
      description: 'Connect your Discord server for team notifications',
      icon: '🎮',
      href: '#',
      available: false,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Social Publishing Accounts */}
      <Card className="bg-gray-800/60 border-gray-700/60 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
              <Share2 className="w-5 h-5 text-sf-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Social Publishing Accounts</CardTitle>
              <CardDescription className="text-gray-400">
                Authorize SceneFlow once per social account to publish rendered videos, thumbnails,
                and multi-language metadata directly from Production Streams.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* YouTube */}
          <div className="p-4 rounded-lg border bg-gray-900/80 border-gray-700/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {youtubeConnected && youtubeChannel?.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={youtubeChannel.thumbnailUrl}
                  alt={youtubeChannel.title}
                  className="h-10 w-10 rounded-full border border-gray-700 object-cover shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Youtube className="w-5 h-5 text-red-400" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-semibold text-sm">YouTube</h3>
                  {youtubeConnected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Authorized
                    </span>
                  ) : null}
                </div>
                <p className="text-gray-400 text-xs mt-0.5 truncate">
                  {loadingSocial
                    ? 'Checking connection…'
                    : youtubeConnected
                      ? `${youtubeChannel?.title || 'Connected channel'}${youtubeChannel?.customUrl ? ` (${youtubeChannel.customUrl})` : ''}`
                      : youtubeNeedsReconnect
                        ? 'Authorization expired — please re-authorize with Google.'
                        : youtubePlatformReady
                          ? 'Sign in with Google once to authorize video, thumbnail & multi-language uploads.'
                          : 'Platform integration pending enablement.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {youtubeConnected ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => authorizePlatform('youtube')}
                    className="border-gray-700 text-gray-200 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Switch Channel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disconnecting === 'youtube'}
                    onClick={() => void disconnectPlatform('youtube')}
                    className="border-gray-700 text-gray-400 hover:text-red-300 text-xs"
                  >
                    {disconnecting === 'youtube' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Unlink className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </>
              ) : !loadingSocial && !youtubePlatformReady && isAdminUser ? (
                <Link href="/dashboard/settings/admin">
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                    Enable Platform OAuth (Admin)
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  disabled={loadingSocial || !youtubePlatformReady || authorizing === 'youtube'}
                  onClick={() => authorizePlatform('youtube')}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50"
                >
                  {loadingSocial || authorizing === 'youtube' ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {authorizing === 'youtube'
                    ? 'Waiting for Google Sign-In…'
                    : youtubeNeedsReconnect
                      ? 'Re-authorize YouTube'
                      : 'Authorize YouTube'}
                </Button>
              )}
            </div>
          </div>

          {/* Facebook */}
          <div className="p-4 rounded-lg border bg-gray-900/80 border-gray-700/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Facebook className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-semibold text-sm">Facebook Pages</h3>
                  {facebookConnected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Authorized
                    </span>
                  ) : null}
                </div>
                <p className="text-gray-400 text-xs mt-0.5 truncate">
                  {loadingSocial
                    ? 'Checking connection…'
                    : facebookConnected
                      ? facebookPageName
                        ? `Page: ${facebookPageName}`
                        : 'Facebook account authorized'
                      : facebookPlatformReady
                        ? 'Sign in with Facebook once to publish videos to your Facebook Page.'
                        : 'Platform integration pending enablement.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {facebookConnected ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => authorizePlatform('facebook')}
                    className="border-gray-700 text-gray-200 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Switch Account
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disconnecting === 'facebook'}
                    onClick={() => void disconnectPlatform('facebook')}
                    className="border-gray-700 text-gray-400 hover:text-red-300 text-xs"
                  >
                    {disconnecting === 'facebook' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Unlink className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  disabled={loadingSocial || !facebookPlatformReady}
                  onClick={() => authorizePlatform('facebook')}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs disabled:opacity-50"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Authorize Facebook
                </Button>
              )}
            </div>
          </div>

          {/* TikTok */}
          <div className="p-4 rounded-lg border bg-gray-900/80 border-gray-700/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-zinc-700/40 border border-zinc-600/50 flex items-center justify-center shrink-0">
                <Music2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-semibold text-sm">TikTok</h3>
                  {tiktokConnected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Authorized
                    </span>
                  ) : null}
                </div>
                <p className="text-gray-400 text-xs mt-0.5 truncate">
                  {loadingSocial
                    ? 'Checking connection…'
                    : tiktokConnected
                      ? 'TikTok account authorized for direct video posting'
                      : tiktokPlatformReady
                        ? 'Sign in with TikTok once to publish vertical cuts & promos to your account.'
                        : 'Platform integration pending enablement.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {tiktokConnected ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => authorizePlatform('tiktok')}
                    className="border-gray-700 text-gray-200 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Switch Account
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disconnecting === 'tiktok'}
                    onClick={() => void disconnectPlatform('tiktok')}
                    className="border-gray-700 text-gray-400 hover:text-red-300 text-xs"
                  >
                    {disconnecting === 'tiktok' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Unlink className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  disabled={loadingSocial || !tiktokPlatformReady}
                  onClick={() => authorizePlatform('tiktok')}
                  className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs disabled:opacity-50"
                >
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Authorize TikTok
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Provider & Team Integrations */}
      <Card className="bg-gray-800/60 border-gray-700/60 text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-sf-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">AI &amp; Workspace Integrations</CardTitle>
              <CardDescription className="text-gray-400">
                Connect AI provider keys and team notification channels
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className={`p-4 rounded-lg border ${
                  integration.available
                    ? 'bg-gray-900/80 border-gray-700/60 hover:border-sf-primary/50'
                    : 'bg-gray-900/80/50 border-gray-700/60/50 opacity-60'
                } transition-colors`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <h3 className="text-white font-semibold">{integration.name}</h3>
                      {integration.available && (
                        <CheckCircle className="w-4 h-4 text-green-400 mt-1" />
                      )}
                    </div>
                  </div>
                  {!integration.available && (
                    <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-4">{integration.description}</p>
                {integration.available ? (
                  <Link href={integration.href}>
                    <Button
                      variant="outline"
                      className="w-full border-gray-700/60 text-gray-200 hover:bg-gray-900/80"
                    >
                      Configure
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full border-gray-700/60 text-gray-500"
                  >
                    Coming Soon
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

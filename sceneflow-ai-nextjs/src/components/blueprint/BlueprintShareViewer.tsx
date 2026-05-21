'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { BlueprintReadOnlyView } from './BlueprintReadOnlyView'
import { BlueprintTtsControls } from './BlueprintTtsControls'
import { BlueprintShareFeedbackForm } from './BlueprintShareFeedbackForm'
import { BlueprintCollabChat } from './BlueprintCollabChat'
import { Button } from '@/components/ui/Button'

const PARTICIPANT_KEY = (token: string) => `sf_collab_participant_${token}`

type Props = { token: string }

export function BlueprintShareViewer({ token }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [treatment, setTreatment] = useState<Record<string, unknown> | null>(null)
  const [heroImageUrl, setHeroImageUrl] = useState<string | undefined>()
  const [ownerName, setOwnerName] = useState('Owner')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [reviewerName, setReviewerName] = useState('')
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(PARTICIPANT_KEY(token)) : null
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.participantId) {
          setParticipantId(parsed.participantId)
          setReviewerName(parsed.name || '')
        }
      } catch {}
    }
  }, [token])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled) {
          if (!data.success) {
            setError(data.error || 'Link not found')
          } else {
            setTreatment(data.payload?.treatment || null)
            setHeroImageUrl(data.payload?.heroImageUrl)
            setOwnerName(data.payload?.ownerDisplayName || 'Owner')
          }
        }
      } catch {
        if (!cancelled) setError('Failed to load blueprint')
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleRegister = async () => {
    if (regName.trim().length < 2) return
    const res = await fetch(`/api/blueprint/share/${encodeURIComponent(token)}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: regName.trim(), email: regEmail.trim() || undefined }),
    })
    const data = await res.json()
    if (data.success && data.participantId) {
      setParticipantId(data.participantId)
      setReviewerName(data.name || regName.trim())
      localStorage.setItem(
        PARTICIPANT_KEY(token),
        JSON.stringify({ participantId: data.participantId, name: data.name })
      )
    }
  }

  const getTextToSpeak = useCallback(() => {
    if (!treatment) return ''
    const logline = String(treatment.logline || '')
    const synopsis = String(treatment.synopsis || treatment.content || '')
    return [logline, synopsis].filter(Boolean).join('\n\n')
  }, [treatment])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Loading blueprint…
      </div>
    )
  }

  if (error || !treatment) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center text-gray-400 max-w-md">
          <p className="text-lg text-gray-200 mb-2">Unable to open this review link</p>
          <p className="text-sm">{error || 'Blueprint not available'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 text-gray-100">
      <header className="border-b border-gray-800/60 bg-gray-900/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-purple-400 font-medium tracking-wide">SceneFlow · Blueprint Review</p>
            <h1 className="text-xl font-semibold text-white mt-0.5">{String(treatment.title || 'Blueprint')}</h1>
          </div>
          <BlueprintTtsControls getTextToSpeak={getTextToSpeak} playId={`share-${token}`} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-32">
        {heroImageUrl && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-800">
            <Image src={heroImageUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        )}

        {treatment.logline && (
          <p className="text-lg text-gray-300 italic leading-relaxed">{String(treatment.logline)}</p>
        )}

        <BlueprintReadOnlyView variant={treatment} />

        {!participantId ? (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Join the review</h3>
            <p className="text-sm text-gray-400">
              Enter your name to submit feedback and chat with {ownerName} and the team.
            </p>
            <input
              type="text"
              placeholder="Your name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
            <Button onClick={handleRegister} className="w-full bg-purple-600 hover:bg-purple-500">
              Continue
            </Button>
          </div>
        ) : (
          <>
            <BlueprintShareFeedbackForm
              participantId={participantId}
              reviewerName={reviewerName}
              shareToken={token}
              onSubmitted={() => {}}
            />
            <div>
              <button
                type="button"
                onClick={() => setShowChat((s) => !s)}
                className="text-sm text-purple-400 hover:text-purple-300 mb-2"
              >
                {showChat ? 'Hide chat' : 'Open team chat & message owner'}
              </button>
              {showChat && (
                <BlueprintCollabChat
                  shareToken={token}
                  role="collaborator"
                  participantId={participantId}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

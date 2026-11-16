'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useBlueprintShareChat } from '@/hooks/useBlueprintShareChat'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { getLocaleDirection } from '@/i18n/locale'
import {
  formatPortalCopy,
  getSpeechLangForPortalLocale,
  resolveClientPortalLocale,
} from '@/lib/intake/clientPortalCopy'
import { cn } from '@/lib/utils'

type Participant = { id: string; name: string; lastMessage?: { text: string } | null }

type Props = {
  shareToken: string
  role: 'owner' | 'collaborator'
  participantId?: string | null
  participants?: Participant[]
  className?: string
  /** Owner panel: show only team, only DM inbox, or both tabs */
  variant?: 'full' | 'team' | 'dm'
  /** Active language code for reading & voice dictation */
  language?: string
}

function ChatThread({
  shareToken,
  mode,
  role,
  participantId,
  targetParticipantId,
  title,
  language = 'en',
}: {
  shareToken: string
  mode: 'team' | 'dm'
  role: 'owner' | 'collaborator'
  participantId?: string | null
  targetParticipantId?: string | null
  title: string
  language?: string
}) {
  const portalLocale = resolveClientPortalLocale(language)
  const speechLang = getSpeechLangForPortalLocale(portalLocale)
  const textDir = getLocaleDirection(portalLocale)
  const { messages, send, canSend, isLoading } = useBlueprintShareChat({
    shareToken,
    mode,
    role,
    participantId,
    targetParticipantId,
  })
  const [text, setText] = useState('')
  const baseTextRef = useRef('')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const {
    supported: sttSupported,
    isSecure,
    isRecording,
    transcript,
    start: startMic,
    stop: stopMic,
    setTranscript,
  } = useSpeechRecognition({ lang: speechLang })

  useEffect(() => {
    if (!transcript) return
    const base = baseTextRef.current.trim()
    setText(base ? `${base} ${transcript}` : transcript)
  }, [transcript])

  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const handleSend = async () => {
    if (isRecording) stopMic()
    if (!text.trim() || !canSend) return
    await send(text)
    setText('')
    baseTextRef.current = ''
    setTranscript('')
  }

  const handleToggleMic = () => {
    if (!canSend || !sttSupported || !isSecure) return
    if (isRecording) {
      stopMic()
      baseTextRef.current = text
      setTranscript('')
    } else {
      baseTextRef.current = text
      setTranscript('')
      startMic()
    }
  }

  return (
    <div dir={textDir} className="flex flex-col min-h-[200px]">
      <div className="text-sm text-gray-300 mb-2 font-medium">{title}</div>
      <div
        ref={scrollerRef}
        className="flex-1 max-h-48 overflow-auto space-y-2 pr-1 rounded border border-gray-800 bg-gray-900/50 p-2"
      >
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="text-gray-400">
              {m.alias || (m.authorRole === 'owner' ? 'Owner' : 'Reviewer')}:
            </span>{' '}
            {m.text}
            <span className="text-gray-500 text-xs ml-2">
              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && messages.length === 0 && (
          <div className="text-xs text-gray-500">…</div>
        )}
      </div>
      <div className="mt-2 flex items-start gap-2">
        <textarea
          dir={textDir}
          lang={speechLang}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            canSend
              ? formatPortalCopy(portalLocale, 'chatInputPlaceholder')
              : formatPortalCopy(portalLocale, 'joinToLeaveFeedbackTitle')
          }
          rows={2}
          disabled={!canSend}
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 resize-y min-h-[40px] text-sm text-gray-200 disabled:opacity-50"
        />
        {sttSupported && isSecure && (
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={!canSend}
            title={
              isRecording
                ? formatPortalCopy(portalLocale, 'stopRecording')
                : formatPortalCopy(portalLocale, 'tapMicToSpeak')
            }
            aria-label={
              isRecording
                ? formatPortalCopy(portalLocale, 'stopRecording')
                : formatPortalCopy(portalLocale, 'tapMicToSpeak')
            }
            className={cn(
              'p-2 h-fit rounded text-sm transition-colors',
              isRecording
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700',
              !canSend && 'opacity-40 cursor-not-allowed'
            )}
          >
            {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'px-3 py-1.5 h-fit rounded text-sm',
            canSend ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
        >
          {formatPortalCopy(portalLocale, 'sendButton')}
        </button>
      </div>
    </div>
  )
}

export function BlueprintCollabChat({
  shareToken,
  role,
  participantId,
  participants = [],
  className,
  variant = 'full',
  language = 'en',
}: Props) {
  const [tab, setTab] = useState<'team' | 'direct'>(
    variant === 'dm' ? 'direct' : 'team'
  )
  const [dmTarget, setDmTarget] = useState<string | null>(null)

  useEffect(() => {
    if (role === 'collaborator' || variant === 'dm') setTab('direct')
    if (variant === 'team') setTab('team')
  }, [role, variant])

  const showTabs = variant === 'full'

  return (
    <div className={cn('rounded border border-gray-800 p-3 bg-gray-900/50', className)}>
      {showTabs && (
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          className={cn(
            'text-xs px-2 py-1 rounded',
            tab === 'team' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60'
          )}
          onClick={() => setTab('team')}
        >
          Team
        </button>
        <button
          type="button"
          className={cn(
            'text-xs px-2 py-1 rounded',
            tab === 'direct' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60'
          )}
          onClick={() => setTab('direct')}
        >
          {role === 'owner' ? 'Messages' : 'Message owner'}
        </button>
      </div>
      )}

      {(showTabs ? tab === 'team' : variant === 'team') ? (
        <ChatThread
          shareToken={shareToken}
          mode="team"
          role={role}
          participantId={participantId}
          title="Team chat"
          language={language}
        />
      ) : role === 'owner' ? (
        <div className="space-y-3">
          {participants.length === 0 ? (
            <p className="text-xs text-gray-500">No reviewers registered yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDmTarget(p.id)}
                    className={cn(
                      'text-xs px-2 py-1 rounded border',
                      dmTarget === p.id
                        ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {dmTarget ? (
                <ChatThread
                  shareToken={shareToken}
                  mode="dm"
                  role="owner"
                  targetParticipantId={dmTarget}
                  title={`DM with ${participants.find((p) => p.id === dmTarget)?.name || 'reviewer'}`}
                  language={language}
                />
              ) : (
                <p className="text-xs text-gray-500">Select a reviewer to open a direct thread.</p>
              )}
            </>
          )}
        </div>
      ) : (
        <ChatThread
          shareToken={shareToken}
          mode="dm"
          role="collaborator"
          participantId={participantId}
          title="Message project owner"
          language={language}
        />
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from './useCollabChat'

export type BlueprintChatMode = 'team' | 'dm'

interface UseBlueprintShareChatParams {
  shareToken: string
  mode: BlueprintChatMode
  role: 'owner' | 'collaborator'
  participantId?: string | null
  targetParticipantId?: string | null
  pollMs?: number
}

export function useBlueprintShareChat({
  shareToken,
  mode,
  role,
  participantId,
  targetParticipantId,
  pollMs = 3000,
}: UseBlueprintShareChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [cursor, setCursor] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const clientIdRef = useRef(`${Math.random().toString(36).slice(2)}-${Date.now()}`)

  const listUrl = useCallback(() => {
    const base = `/api/blueprint/share/${encodeURIComponent(shareToken)}/chat/${mode}`
    const params = new URLSearchParams({ since: String(cursor) })
    if (mode === 'dm') {
      if (role === 'owner' && targetParticipantId) {
        params.set('targetParticipantId', targetParticipantId)
      } else if (participantId) {
        params.set('participantId', participantId)
      }
    }
    return `${base}?${params}`
  }, [shareToken, mode, cursor, role, participantId, targetParticipantId])

  useEffect(() => {
    if (!shareToken) return
    if (mode === 'dm' && role === 'owner' && !targetParticipantId) return
    if (mode === 'dm' && role === 'collaborator' && !participantId) return

    let cancelled = false
    setIsLoading(true)

    const poll = async () => {
      try {
        const res = await fetch(listUrl(), { cache: 'no-store' })
        const data = await res.json()
        if (!cancelled && data.success && Array.isArray(data.messages)) {
          setMessages(data.messages)
          setCursor(data.nextCursor ?? cursor)
        }
      } catch (e) {
        console.warn('[BlueprintShareChat] poll failed', e)
      }
      if (!cancelled) setIsLoading(false)
    }

    poll()
    const interval = setInterval(poll, pollMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [shareToken, mode, role, participantId, targetParticipantId, listUrl, pollMs])

  const canSend =
    role === 'owner' ||
    Boolean(participantId)

  const send = async (text: string) => {
    if (!text.trim() || !shareToken) return
    const endpoint = `/api/blueprint/share/${encodeURIComponent(shareToken)}/chat/${mode}`
    const body: Record<string, unknown> = {
      text,
      authorRole: role,
      clientId: clientIdRef.current,
    }
    if (role === 'collaborator' && participantId) {
      body.participantId = participantId
    }
    if (mode === 'dm' && role === 'owner' && targetParticipantId) {
      body.targetParticipantId = targetParticipantId
    }

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setCursor((c) => c)
  }

  return { messages, send, canSend, isLoading }
}

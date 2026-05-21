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

function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  if (incoming.length === 0) return prev
  const byId = new Map<string, ChatMessage>()
  for (const m of prev) byId.set(m.id, m)
  for (const m of incoming) byId.set(m.id, m)
  return Array.from(byId.values()).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
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
  const [isLoading, setIsLoading] = useState(false)
  const cursorRef = useRef(0)
  const clientIdRef = useRef(`${Math.random().toString(36).slice(2)}-${Date.now()}`)

  const buildListUrl = useCallback(
    (since: number) => {
      const base = `/api/blueprint/share/${encodeURIComponent(shareToken)}/chat/${mode}`
      const params = new URLSearchParams({ since: String(since) })
      if (mode === 'dm') {
        if (role === 'owner' && targetParticipantId) {
          params.set('targetParticipantId', targetParticipantId)
        } else if (participantId) {
          params.set('participantId', participantId)
        }
      }
      return `${base}?${params}`
    },
    [shareToken, mode, role, participantId, targetParticipantId]
  )

  const threadKey = `${shareToken}|${mode}|${role}|${participantId ?? ''}|${targetParticipantId ?? ''}`

  const poll = useCallback(async () => {
    if (!shareToken) return
    if (mode === 'dm' && role === 'owner' && !targetParticipantId) return
    if (mode === 'dm' && role === 'collaborator' && !participantId) return

    try {
      const res = await fetch(buildListUrl(cursorRef.current), { cache: 'no-store' })
      const data = await res.json()
      if (data.success && Array.isArray(data.messages)) {
        if (data.messages.length > 0) {
          setMessages((prev) => mergeMessages(prev, data.messages))
        }
        const next = typeof data.nextCursor === 'number' ? data.nextCursor : cursorRef.current
        cursorRef.current = Math.max(cursorRef.current, next)
      }
    } catch (e) {
      console.warn('[BlueprintShareChat] poll failed', e)
    }
  }, [shareToken, mode, role, participantId, targetParticipantId, buildListUrl])

  // Reset thread state when switching chat context
  useEffect(() => {
    cursorRef.current = 0
    setMessages([])
    setIsLoading(true)
  }, [threadKey])

  useEffect(() => {
    if (!shareToken) return
    if (mode === 'dm' && role === 'owner' && !targetParticipantId) {
      setIsLoading(false)
      return
    }
    if (mode === 'dm' && role === 'collaborator' && !participantId) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const runPoll = async () => {
      await poll()
      if (!cancelled) setIsLoading(false)
    }

    void runPoll()
    const interval = setInterval(() => {
      void poll()
    }, pollMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [shareToken, mode, role, participantId, targetParticipantId, poll, pollMs])

  const canSend = role === 'owner' || Boolean(participantId)

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

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success && data.message) {
        const msg = data.message as ChatMessage
        setMessages((prev) => mergeMessages(prev, [msg]))
        cursorRef.current = Math.max(cursorRef.current, msg.seq ?? cursorRef.current)
      } else {
        await poll()
      }
    } catch (e) {
      console.warn('[BlueprintShareChat] send failed', e)
    }
  }

  return { messages, send, canSend, isLoading }
}

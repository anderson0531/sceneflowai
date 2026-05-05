"use client";
import { useEffect, useRef, useState } from 'react'
import { getDb, getClientAuth } from '@/lib/firebase/client'

interface UseCollabChatParams {
  sessionId: string
  channel?: 'general' | 'announcements' | 'item'
  reviewer?: { reviewerId: string; name: string } | null
  pollMs?: number
}

export interface ChatMessage {
  id: string
  clientId?: string
  sessionId: string
  channel: string
  scopeId?: string
  authorRole: 'owner' | 'collaborator'
  alias: string
  text: string
  createdAt: string
  seq?: number
}

export function useCollabChat({ sessionId, channel = 'general', reviewer, pollMs = 3000 }: UseCollabChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [cursor, setCursor] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const clientIdRef = useRef<string>(`${Math.random().toString(36).slice(2)}-${Date.now()}`)

  // Dual-mode chat: Firebase real-time OR API polling fallback. Firebase modules
  // are dynamically imported so they only land in the bundle when chat actually mounts.
  useEffect(() => {
    if (!sessionId) return
    setIsLoading(true)

    let cancelled = false
    let cleanup: (() => void) | null = null

    ;(async () => {
      const db = await getDb()
      if (cancelled) return

      if (db) {
        const [{ signInAnonymously }, { collection, onSnapshot, orderBy, query }] = await Promise.all([
          import('firebase/auth'),
          import('firebase/firestore'),
        ])
        if (cancelled) return

        const auth = await getClientAuth()
        if (cancelled) return

        let unsub: any = null

        const startListener = () => {
          if (cancelled || !db) { setIsLoading(false); return }
          const col = collection(db, 'sessions', sessionId, 'channels', channel, 'messages')
          const q = query(col, orderBy('seq', 'asc'))
          unsub = onSnapshot(q, (snap) => {
            const list: ChatMessage[] = []
            snap.forEach((doc) => {
              const d: any = doc.data()
              list.push({
                id: doc.id,
                clientId: d.clientId,
                sessionId: d.sessionId,
                channel: d.channel,
                scopeId: d.scopeId,
                authorRole: d.authorRole,
                alias: d.alias,
                text: d.text,
                createdAt: d.createdAt || new Date().toISOString(),
                seq: d.seq,
              })
            })
            setMessages(list)
            setIsLoading(false)
          })
        }

        if (auth && !auth.currentUser) {
          try { await signInAnonymously(auth) } catch {}
          if (cancelled) return
        }
        startListener()

        cleanup = () => { if (unsub) unsub() }
      } else {
        // API polling mode: Fallback when Firebase unavailable
        const poll = async () => {
          try {
            const res = await fetch(`/api/collab/chat.list?sessionId=${sessionId}&channel=${channel}&since=${cursor}`)
            const data = await res.json()
            if (data.success && Array.isArray(data.messages)) {
              setMessages(data.messages)
              setCursor(data.nextCursor || cursor)
            }
          } catch (e) {
            console.warn('[Chat] Polling failed:', e)
          }
          setIsLoading(false)
        }

        poll()
        const interval = setInterval(poll, pollMs)
        cleanup = () => clearInterval(interval)
      }
    })()

    return () => {
      cancelled = true
      if (cleanup) cleanup()
    }
  }, [sessionId, channel, cursor, pollMs])

  const canSend = Boolean(reviewer && reviewer.reviewerId && reviewer.name)

  const send = async (text: string, role: 'owner' | 'collaborator' = 'collaborator') => {
    if (!text.trim() || !sessionId) return
    const alias = role === 'owner' ? 'Owner' : (reviewer?.name || 'Reviewer')
    const db = await getDb()

    if (db) {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
      const col = collection(db, 'sessions', sessionId, 'channels', channel, 'messages')
      const now = Date.now()
      await addDoc(col, {
        clientId: clientIdRef.current,
        sessionId,
        channel,
        authorRole: role,
        alias,
        text: String(text),
        createdAt: new Date().toISOString(),
        seq: now,
        createdAtTs: serverTimestamp(),
      })
    } else {
      await fetch('/api/collab/chat.post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          channel,
          text: String(text),
          authorRole: role,
          alias,
          clientId: clientIdRef.current,
        }),
      })
      // Trigger immediate re-poll to show new message
      setCursor((prev) => prev)
    }
  }

  return { messages, cursor, send, canSend, isLoading }
}

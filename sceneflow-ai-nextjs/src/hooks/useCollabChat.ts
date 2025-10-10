"use client";
import { useEffect, useRef, useState } from 'react'
import { getDb, getClientAuth } from '@/lib/firebase/client'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'

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
  const timerRef = useRef<any>(null)
  const clientIdRef = useRef<string>(`${Math.random().toString(36).slice(2)}-${Date.now()}`)

  // Dual-mode chat: Firebase real-time OR API polling fallback
  useEffect(() => {
    if (!sessionId) return
    setIsLoading(true)
    
    const db = getDb()
    
    if (db) {
      // Firebase mode: Real-time Firestore subscription
      let unsub: any = null
      const auth = getClientAuth()

      const startListener = () => {
        if (!db) { setIsLoading(false); return }
        const col = collection(db, 'sessions', sessionId, 'channels', channel, 'messages')
        const q = query(col, orderBy('seq', 'asc'))
        unsub = onSnapshot(q, (snap) => {
          const list: ChatMessage[] = []
          snap.forEach(doc => {
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
              seq: d.seq
            })
          })
          setMessages(list)
          setIsLoading(false)
        })
      }

      if (!auth || !auth.currentUser) {
        signInAnonymously(auth).finally(startListener)
      } else {
        startListener()
      }
      
      return () => { if (unsub) unsub() }
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
      
      poll() // Initial load
      const interval = setInterval(poll, pollMs)
      return () => clearInterval(interval)
    }
  }, [sessionId, channel, cursor, pollMs])

  const canSend = Boolean(reviewer && reviewer.reviewerId && reviewer.name)

  const send = async (text: string, role: 'owner' | 'collaborator' = 'collaborator') => {
    if (!text.trim() || !sessionId) return
    const alias = role === 'owner' ? 'Owner' : (reviewer?.name || 'Reviewer')
    const db = getDb()
    
    if (db) {
      // Firebase mode: Send via Firestore
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
        createdAtTs: serverTimestamp()
      })
    } else {
      // API mode: Send via POST endpoint
      await fetch('/api/collab/chat.post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          channel,
          text: String(text),
          authorRole: role,
          alias,
          clientId: clientIdRef.current
        })
      })
      // Trigger immediate re-poll to show new message
      setCursor(prev => prev) // Force re-poll by updating cursor
    }
  }

  return { messages, cursor, send, canSend, isLoading }
}



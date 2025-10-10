"use client";
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCollabChat } from '@/hooks/useCollabChat'

export default function ChatWindow({ sessionId, reviewer, role = 'collaborator', context }: { sessionId: string; reviewer?: { reviewerId: string; name: string } | null; role?: 'owner' | 'collaborator'; context?: string }) {
  const { messages, send, canSend, isLoading } = useCollabChat({ sessionId, channel: 'general', reviewer })
  const [text, setText] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const disabled = role === 'collaborator' ? !canSend : false

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  // Prefill a contextual message when provided (e.g., "Discuss Variant A")
  useEffect(() => {
    if (context && !text) setText(context)
  }, [context])

  const handleSend = async () => {
    if (!text.trim() || disabled) return
    await send(text, role)
    setText('')
  }

  return (
    <div className="rounded border border-gray-800 p-3 bg-gray-900/50">
      <div className="text-sm text-gray-300 mb-2">General Chat</div>
      <div ref={scrollerRef} className="max-h-64 overflow-auto space-y-2 pr-1">
        {messages.map(m => (
          <div key={m.id} className="text-sm">
            <span className="text-gray-400">{String(m.alias || (m.authorRole==='owner'?'Owner':'Reviewer'))}:</span> {String(m.text || '')}
            <span className="text-gray-500 text-xs ml-2">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        {isLoading && <div className="text-xs text-gray-500">Updating…</div>}
      </div>
      <div className="mt-2 flex gap-2">
        <textarea value={text} onChange={e=> setText((e.target as HTMLTextAreaElement).value)} placeholder={disabled? 'Register to chat' : 'Write a message'} rows={2} className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 resize-y min-h-[40px]" />
        <button onClick={handleSend} disabled={disabled} className={`px-3 py-1 h-fit rounded ${disabled? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}>Send</button>
      </div>
    </div>
  )
}



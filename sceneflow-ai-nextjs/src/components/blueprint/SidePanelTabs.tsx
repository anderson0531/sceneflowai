'use client'

import React, { useState } from 'react'
import { Lightbulb, Users, X, Copy, Check, Link2 } from 'lucide-react'
import { IdeationPanel } from './IdeationPanel'
import { cn } from '@/lib/utils'
import { useGuideStore } from '@/store/useGuideStore'
import ChatWindow from '../collab/ChatWindow'

interface SidePanelTabsProps {
  onInsert: (text: string) => void
  onClose?: () => void
  sessionId: string | null
  shareUrl: string | null
  onShare: () => void
  isSharing: boolean
}

export function SidePanelTabs({ onInsert, onClose, sessionId, shareUrl, onShare, isSharing }: SidePanelTabsProps) {
  const [activeTab, setActiveTab] = useState<'ideation' | 'collaboration'>('ideation')
  const { guide } = useGuideStore()
  const activeVariantId = (guide as any)?.selectedTreatmentId || ((guide as any)?.treatmentVariants?.[0]?.id)

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 border-l border-gray-800">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800/60 bg-gray-900/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('ideation')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'ideation'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            )}
          >
            <Lightbulb size={14} />
            <span>Ideation</span>
          </button>
          <button
            onClick={() => setActiveTab('collaboration')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === 'collaboration'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            )}
          >
            <Users size={14} />
            <span>Collaborate</span>
          </button>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
            title="Close panel"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ideation' ? (
          <IdeationPanel onInsert={onInsert} hideHeader />
        ) : (
          <CollaborationContent 
            sessionId={sessionId}
            shareUrl={shareUrl}
            activeVariantId={activeVariantId}
            onShare={onShare}
            isSharing={isSharing}
          />
        )}
      </div>
    </div>
  )
}

// Inline collaboration content (not a modal overlay)
function CollaborationContent({ 
  sessionId,
  shareUrl,
  activeVariantId,
  onShare,
  isSharing
}: { 
  sessionId: string | null
  shareUrl: string | null
  activeVariantId: string | null
  onShare: () => void
  isSharing: boolean
}) {
  const [subTab, setSubTab] = useState<'feedback' | 'chat'>('feedback')
  const [feedback, setFeedback] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Copy failed:', e)
    }
  }

  // Fetch feedback when session exists
  React.useEffect(() => {
    if (!sessionId || !activeVariantId) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const r = await fetch(`/api/collab/feedback.list?sessionId=${sessionId}&scopeId=${encodeURIComponent(activeVariantId)}`, { cache: 'no-store' })
        const j = await r.json()
        if (!cancelled && j?.success) setFeedback(j.feedback || [])
      } catch {}
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [sessionId, activeVariantId])

  const parseComment = (c: string) => {
    try {
      const lastBrace = c.lastIndexOf('{')
      if (lastBrace >= 0) {
        const json = c.slice(lastBrace)
        return JSON.parse(json)
      }
    } catch {}
    return null
  }

  if (!sessionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 flex items-center justify-center mb-4 border border-purple-500/20">
          <Users size={28} className="text-purple-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-100 mb-1.5">
          Start Collaborating
        </h3>
        <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed mb-4">
          Share your treatment with reviewers to get feedback
        </p>
        <button
          onClick={onShare}
          disabled={isSharing}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSharing ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Users size={16} />
          )}
          <span>{isSharing ? 'Creating...' : 'Share & Collaborate'}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Share Link Display */}
      {shareUrl && (
        <div className="px-3 py-2 border-b border-gray-800/40 bg-purple-500/5">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
            <Link2 size={12} className="text-purple-400" />
            <span>Share Link</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="flex-1 bg-gray-900/60 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 truncate border border-gray-800/60"
              title={shareUrl}
            >
              {shareUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white transition-colors flex-shrink-0"
              title={copied ? 'Copied!' : 'Copy link'}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/40">
        <button 
          className={cn(
            'text-xs px-2 py-1 rounded',
            subTab === 'feedback' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60'
          )} 
          onClick={() => setSubTab('feedback')}
        >
          Feedback
        </button>
        <button 
          className={cn(
            'text-xs px-2 py-1 rounded',
            subTab === 'chat' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/60'
          )} 
          onClick={() => setSubTab('chat')}
        >
          Chat
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {subTab === 'feedback' ? (
          <div className="space-y-2">
            {loading && <div className="text-sm text-gray-400">Loading…</div>}
            {!loading && feedback.length === 0 && (
              <div className="text-sm text-gray-400 text-center py-8">
                No feedback yet. Share the link with reviewers to collect feedback.
              </div>
            )}
            {feedback.slice().reverse().slice(0, 10).map((f: any) => {
              const parsed = typeof f.comment === 'string' ? parseComment(f.comment) : null
              return (
                <div key={f.id} className="text-xs text-gray-300 rounded border border-gray-800 p-2 bg-gray-900/50">
                  <div className="text-gray-400 mb-1">
                    <span className="text-yellow-500">{Number(f.score) || ''}</span> {f.alias ? `— ${String(f.alias)}` : ''}
                    <span className="text-gray-500 ml-2">{new Date(f.createdAt).toLocaleString()}</span>
                  </div>
                  {parsed ? (
                    <div className="space-y-1">
                      {parsed.strengths && <div><span className="text-gray-400">Strengths:</span> {parsed.strengths}</div>}
                      {parsed.concerns && <div><span className="text-gray-400">Concerns:</span> {parsed.concerns}</div>}
                      {parsed.suggestions && <div><span className="text-gray-400">Suggestions:</span> {parsed.suggestions}</div>}
                      {parsed.questions && <div><span className="text-gray-400">Questions:</span> {parsed.questions}</div>}
                    </div>
                  ) : (
                    <div>{String(f.comment || '')}</div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <ChatWindow sessionId={sessionId} role="owner" reviewer={{ reviewerId: 'owner', name: 'Owner' }} />
        )}
      </div>
    </div>
  )
}

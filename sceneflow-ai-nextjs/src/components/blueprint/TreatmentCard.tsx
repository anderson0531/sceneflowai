'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGuideStore } from '@/store/useGuideStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Square, Volume2, Share2, PencilLine, MoreHorizontal, ChevronDown, MessageSquare, ArrowRight, Loader2, Wand2, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import VariantEditorDrawer from './VariantEditorDrawer'
import OwnerCollabPanel from '@/components/studio/OwnerCollabPanel'
import { getCuratedElevenVoices, type CuratedVoice } from '@/lib/tts/voices'

export function TreatmentCard() {
  const router = useRouter()
  const { guide } = useGuideStore()
  const { selectTreatmentVariant } = useGuideStore() as any
  const { setTreatmentVariants } = useGuideStore() as any
  const { lastEdit, justAppliedVariantId, appliedAt } = useGuideStore() as any
  const variants = (guide as any)?.treatmentVariants as Array<{ id: string; label?: string; content: string; visual_style?: string; tone_description?: string; target_audience?: string; title?: string; logline?: string; genre?: string; format_length?: string; author_writer?: string; date?: string; synopsis?: string; setting?: string; protagonist?: string; antagonist?: string; act_breakdown?: any; tone?: string; style?: string; themes?: any; mood_references?: string[]; character_descriptions?: Array<{
    name: string;
    role: string;
    subject: string;
    ethnicity: string;
    keyFeature: string;
    hairStyle: string;
    hairColor: string;
    eyeColor: string;
    expression: string;
    build: string;
    description: string;
    imagePrompt?: string;
    referenceImage?: string | null;
    generating?: boolean;
    version?: number;
    lastModified?: string;
  }>; beats?: Array<{ title: string; intent?: string; minutes: number; synopsis?: string }>; total_duration_seconds?: number; estimatedDurationMinutes?: number; }> | undefined
  const selectedId = (guide as any)?.selectedTreatmentId as string | undefined

  // Top-level hooks (must not be conditional)
  const [voices, setVoices] = useState<Array<CuratedVoice>>([])
  const [enabled, setEnabled] = useState<boolean>(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined)
  const [editorOpen, setEditorOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isCreatingVision, setIsCreatingVision] = useState(false)
  const [audioMenuOpen, setAudioMenuOpen] = useState(false)
  const [collabOpen, setCollabOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  // zoomedImage removed - now in Vision phase
  function mapVariantToInputText(v: any): string {
    const title = v?.title ? `${v.title}\n\n` : ''
    const logline = v?.logline ? `Logline: ${v.logline}\n\n` : ''
    const body = String(v?.synopsis || v?.content || '')
    return `${title}${logline}${body}`.trim()
  }
  function sendToComposer(text: string, opts?: { generate?: boolean }) {
    const detail = { text, focus: true, generate: Boolean(opts?.generate) }
    window.dispatchEvent(new CustomEvent('sf:set-composer', { detail }))
  }
  const [narrationMode, setNarrationMode] = useState<'synopsis'|'full'|'beats'>('synopsis')
  const queueAbortRef = useRef<{ abort: boolean }>({ abort: false })
  // Character state removed - all character management moved to Vision phase

  const active = useMemo(() => {
    if (selectedId) return selectedId
    if (Array.isArray(variants) && variants.length > 0) return variants[0].id
    return null
  }, [selectedId, variants])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/tts/google/voices', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (!mounted) return
        if (data?.enabled && Array.isArray(data.voices) && data.voices.length > 0) {
          const formattedVoices = data.voices.map((v: any) => ({ 
            id: v.id, 
            name: v.name 
          }))
          setEnabled(true)
          setVoices(formattedVoices)
          setSelectedVoiceId(data.voices[0].id)
        } else {
          setEnabled(false)
          setVoices([])
          setSelectedVoiceId(undefined)
        }
      } catch {
        if (!mounted) return
        setEnabled(false)
        setVoices([])
        setSelectedVoiceId(undefined)
      }
    })()
    return () => { mounted = false }
  }, [])

  const stopAny = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    } catch {}
    audioRef.current = null
    setLoadingId(null)
    queueAbortRef.current.abort = true
  }

  function buildNarrationText(v: any, mode: 'synopsis'|'full'|'beats'): string {
    if (mode === 'beats' && Array.isArray(v.beats) && v.beats.length) {
      const parts = v.beats.map((b: any, i: number) => `${i + 1}. ${b.title || 'Beat'} — ${b.synopsis || b.intent || ''}`)
      return parts.join('\n')
    }
    const baseSynopsis = String(v.synopsis || v.content || '')
    const log = v.logline ? `${v.logline}. ` : ''
    if (mode === 'synopsis') return `${log}${baseSynopsis}`
    const full = [v.title ? `${v.title}.` : '', log, baseSynopsis, (Array.isArray(v.themes) ? ` Themes: ${v.themes.join(', ')}` : '')].join(' ').trim()
    return full
  }

  async function playTextChunks(texts: string[]) {
    queueAbortRef.current.abort = false
    for (const t of texts) {
      if (queueAbortRef.current.abort) break
      const resp = await fetch('/api/tts/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t, voiceId: selectedVoiceId || voices[0]?.id })
      })
      if (!resp.ok) throw new Error('TTS failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error('Audio error'))
        audio.play().catch(reject)
      })
    }
  }

  const playVariant = async (variantId: string) => {
    if (!Array.isArray(variants) || variants.length === 0) return
    stopAny()
    setLoadingId(variantId)
    const v = variants.find(x => x.id === variantId) || variants[0]
    // Build narration text based on selected mode
    const fullText = buildNarrationText(v, narrationMode)
    // Chunk to ~1200 chars to avoid long clips
    const chunks: string[] = []
    const maxLen = 1200
    let cursor = 0
    while (cursor < fullText.length) {
      chunks.push(fullText.slice(cursor, cursor + maxLen))
      cursor += maxLen
    }
    try {
      if (!selectedVoiceId && (!voices || !voices.length)) throw new Error('No voice available')
      await playTextChunks(chunks)
    } catch {
      stopAny()
    }
  }

  // Character image generation removed - all character management moved to Vision phase

  // Keyboard shortcuts scoped to this card when variants exist
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName || ''
      if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return
      if ((document as any).body?.classList?.contains('modal-open')) return
      if (e.key.toLowerCase() === 's') { e.preventDefault(); (async()=>{ try{ const btn = document.activeElement as HTMLElement; }catch{} })(); (async()=>{ try{ }catch{} })(); }
      if (e.key === 'Enter') { e.preventDefault(); try { const v = (Array.isArray(variants) ? variants.find(x=>x.id===active) : null) || (variants||[])[0]; if (v) (useGuideStore.getState() as any).useTreatmentVariant(v.id) } catch {} }
      if (e.key.toLowerCase() === 'e') { e.preventDefault(); setEditorOpen(true) }
      if (e.key.toLowerCase() === 'i') { e.preventDefault(); try { const v = (variants||[]).find(x=>x.id===active) || (variants||[])[0]; if (v) { const t = mapVariantToInputText(v); sendToComposer(t, { generate: false }) } } catch {} }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); try { const v = (variants||[]).find(x=>x.id===active) || (variants||[])[0]; if (v) { const t = mapVariantToInputText(v); sendToComposer(t, { generate: true }) } } catch {} }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, variants])

  // If variants exist, render tabs; else show single treatment (current behavior)
  if (Array.isArray(variants) && variants.length > 0 && active) {
    const activeVariant = variants.find(v => v.id === active) || variants[0]
    const withinWindow = Date.now() - (appliedAt || 0) < 2000
    const wasJustAppliedActive = justAppliedVariantId === activeVariant.id && withinWindow
    const changedKeys = (() => {
      if (!wasJustAppliedActive || !lastEdit || lastEdit.variantId !== activeVariant.id) return new Set<string>()
      const before = lastEdit.before || {}
      const after = activeVariant as any
      const keys: string[] = [
        'title','logline','genre','format_length','target_audience','author_writer','date',
        'setting','protagonist','antagonist','tone','tone_description','style','visual_style','synopsis','content','themes','beats'
      ]
      const changed = new Set<string>()
      for (const k of keys) {
        const bv = (before as any)?.[k]
        const av = (after as any)?.[k]
        const differs = Array.isArray(bv) || Array.isArray(av) ? JSON.stringify(bv||[]) !== JSON.stringify(av||[]) : bv !== av
        if (differs) changed.add(k)
      }
      return changed
    })()
    const flashIf = (key: string) => (wasJustAppliedActive && changedKeys.has(key) ? 'flash-highlight' : '')
    return (
      <Card className="mt-4 border-gray-700/60 bg-gray-900/60">
        <CardHeader>
          <CardTitle className="text-white">Film Treatment Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={active || undefined} onValueChange={(val)=>selectTreatmentVariant(val)} className="w-full">
            <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 rounded-md">
              <div className="flex items-center justify-between gap-3 py-2">
                <TabsList className="flex-1 mx-1">
                  {variants.slice(0, 3).map(v => {
                    const dotColor = v.id === 'A' ? 'bg-blue-500' : v.id === 'B' ? 'bg-purple-500' : 'bg-emerald-500'
                    return (
                      <TabsTrigger key={v.id} value={v.id} className="gap-2">
                        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden></span>
                        {v.label || v.id}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                {/* Variant Actions Toolbar */}
                {(() => {
                  const v = variants.find(x => x.id === active) || variants[0]
                  const accent = v?.id === 'A' ? 'text-blue-300 border-blue-500 hover:bg-blue-500/10' : v?.id === 'B' ? 'text-purple-300 border-purple-500 hover:bg-purple-500/10' : 'text-emerald-300 border-emerald-500 hover:bg-emerald-500/10'

                  const handleShare = async () => {
                    try {
                      setIsSharing(true)
                      const items = (variants || []).slice(0, 3).map((v: any) => ({
                        id: v.id,
                        title: v.title,
                        logline: v.logline || v.synopsis || '',
                        synopsis: v.synopsis || v.content || '',
                        details: {
                          genre: v.genre,
                          duration: v.format_length,
                          targetAudience: v.target_audience,
                          tone: v.tone,
                          structure: v.act_breakdown ? 'three_act' : undefined,
                        },
                      }))
                      const body = {
                        spaceKey: { projectId: (guide as any)?.projectId || (guide as any)?.id || 'current', scopeType: 'concepts' },
                        options: { anonAllowed: true, rubricEnabled: false },
                        items,
                      }
                      const res = await fetch('/api/collab/session.create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                      if (!res.ok) throw new Error('Failed to create share link')
                      const data = await res.json().catch(() => null)
                      if (!data?.sessionId) throw new Error('Missing session id')
                      const tokenPayload = { items }
                      const token = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(tokenPayload)))))
                      const url = `${window.location.origin}/c/${data.sessionId}?t=${token}`
                      setShareUrl(url)
                      setShareOpen(true)
                      setSessionId(data.sessionId)
                      try { await navigator.clipboard?.writeText?.(url) } catch {}
                      try { const { toast } = require('sonner'); toast('Share link ready') } catch {}
                    } catch {
                      try { const { toast } = require('sonner'); toast('Failed to create share link') } catch {}
                    } finally {
                      setIsSharing(false)
                    }
                  }

                  const handleStartVision = async () => {
                    try {
                      setIsCreatingVision(true)
                      
                      // LOG VARIANT DATA BEFORE SENDING
                      console.log('[Start Vision] Sending variant:', {
                        title: v.title,
                        hasBeats: !!v.beats,
                        beatsCount: Array.isArray(v.beats) ? v.beats.length : 0,
                        total_duration_seconds: v.total_duration_seconds,
                        estimatedDurationMinutes: v.estimatedDurationMinutes,
                        format_length: v.format_length
                      })
                      console.log('[Start Vision] BEATS DATA:', v.beats)
                      console.log('[Start Vision] FULL VARIANT:', JSON.stringify({
                        total_duration_seconds: v.total_duration_seconds,
                        estimatedDurationMinutes: v.estimatedDurationMinutes,
                        format_length: v.format_length,
                        beatsCount: Array.isArray(v.beats) ? v.beats.length : 0,
                        firstBeat: Array.isArray(v.beats) && v.beats[0] ? v.beats[0] : null
                      }, null, 2))
                      
                      // Get or create user ID
                      let userId = localStorage.getItem('authUserId')
                      if (!userId) {
                        userId = crypto.randomUUID()
                        localStorage.setItem('authUserId', userId)
                      }
                      
                      // Create project from Film Treatment variant
                      const res = await fetch('/api/projects/from-variant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId,
                          variant: v // Send full variant with all data
                        })
                      })
                      
                      const data = await res.json()
                      
                      if (data.success && data.project) {
                        try { const { toast } = require('sonner'); toast('Creating Vision...') } catch {}
                        // Navigate to Vision page
                        router.push(`/dashboard/workflow/vision/${data.project.id}`)
                      } else {
                        try { const { toast } = require('sonner'); toast('Failed to create project') } catch {}
                      }
                    } catch (e) {
                      console.error('Vision creation error:', e)
                      try { const { toast } = require('sonner'); toast('Failed to create Vision') } catch {}
                    } finally {
                      setIsCreatingVision(false)
                    }
                  }

                  return (
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        {/* Collab owner panel trigger */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button aria-label="Collaboration panel" onClick={()=> setCollabOpen(true)} className="h-8 px-2 border border-gray-700 text-gray-200 hover:bg-gray-800" variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4" />
                              <span className="hidden md:inline ml-1.5">Collab</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View feedback & chat</TooltipContent>
                        </Tooltip>
                        {/* Share */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-busy={isSharing}
                              aria-label="Share & Collaborate"
                              onClick={handleShare}
                              className="h-8 px-2 border border-blue-500 text-blue-300 hover:bg-blue-500/10 hidden md:inline-flex"
                              variant="outline"
                              size="sm"
                            >
                              <Share2 className="h-4 w-4" />
                              <span className="hidden md:inline ml-1.5">Share</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Share & Collaborate (S)</TooltipContent>
                        </Tooltip>

                        {/* Edit */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Edit treatment"
                              onClick={() => setEditorOpen(true)}
                              className="h-8 px-2 border border-gray-700 text-gray-200 hover:bg-gray-800 hidden md:inline-flex"
                              variant="outline"
                              size="sm"
                            >
                              <PencilLine className="h-4 w-4" />
                              <span className="hidden md:inline ml-1.5">Edit</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit (E)</TooltipContent>
                        </Tooltip>

                        {/* Overflow on small screens only (Share, Edit) */}
                        <div className="md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label="More actions" className="h-8 w-8" size="icon" variant="outline">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); handleShare();}} onClick={(e)=>{e.preventDefault();}}>
                                <Share2 className="h-4 w-4 mr-2" /> Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={(e)=>{e.preventDefault(); setEditorOpen(true);}} onClick={(e)=>{e.preventDefault();}}>
                                <PencilLine className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {/* Audio controls: Play/Stop + settings popover chevron */}
                        <div className="flex items-center gap-1">
                          {enabled && voices.length > 0 ? (
                            loadingId === active ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label="Stop playback"
                                    onClick={stopAny}
                                    className="h-8 px-2 border border-gray-700 text-gray-300 hover:bg-gray-800"
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Square className="h-4 w-4" />
                                    <span className="hidden md:inline ml-1.5">Stop</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Stop (P)</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    aria-label="Play variant narration"
                                    onClick={() => { const currentId = ((guide as any)?.selectedTreatmentId as string) || active; if (currentId) playVariant(currentId) }}
                                    className="h-8 px-2 border border-gray-700 text-gray-300 hover:bg-gray-800"
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Play className="h-4 w-4" />
                                    <span className="hidden md:inline ml-1.5">Play</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Play (P)</TooltipContent>
                              </Tooltip>
                            )
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label="Audio preview unavailable"
                                  disabled
                                  className="h-8 px-2 border border-gray-800 text-gray-500"
                                  variant="outline"
                                  size="sm"
                                >
                                  <Play className="h-4 w-4" />
                                  <span className="hidden md:inline ml-1.5">Play</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Configure ELEVENLABS_API_KEY to enable audio previews</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Audio settings chevron */}
                          <DropdownMenu open={audioMenuOpen} onOpenChange={setAudioMenuOpen}>
                            <DropdownMenuTrigger asChild>
                              <Button aria-label="Audio settings" aria-expanded={audioMenuOpen} className="h-8 w-8" size="icon" variant="outline">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              <div className="px-1 py-1.5 text-xs text-gray-400">Voice</div>
                              {enabled && voices.length > 0 ? (
                                <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                                  <SelectTrigger className="h-8 mx-1">
                                    <SelectValue placeholder="Select voice" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {voices.map(vv => (
                                      <SelectItem key={vv.id} value={vv.id}>{vv.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="mx-2 my-1 text-xs text-amber-300">Audio not configured</div>
                              )}
                              <div className="px-1 pt-2 pb-1 text-xs text-gray-400">Narration</div>
                              <Select value={narrationMode} onValueChange={(val)=>setNarrationMode(val as any)}>
                                <SelectTrigger className="h-8 mx-1">
                                  <SelectValue placeholder="Narration mode" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="synopsis">Logline + Synopsis</SelectItem>
                                  <SelectItem value="full">Full Treatment</SelectItem>
                                  <SelectItem value="beats">Beat‑by‑Beat</SelectItem>
                                </SelectContent>
                              </Select>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Start Vision - moved to end */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-busy={isCreatingVision}
                              aria-label="Start Vision"
                              onClick={handleStartVision}
                              disabled={isCreatingVision}
                              className="h-8 px-2 bg-sf-primary text-white hover:bg-sf-accent disabled:opacity-50"
                              size="sm"
                            >
                              {isCreatingVision ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ArrowRight className="h-4 w-4" />
                              )}
                              <span className="hidden md:inline ml-1.5">
                                {isCreatingVision ? 'Creating...' : 'Start Vision'}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create project & generate script + visuals</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  )
                })()}
                {/* Removed inline Voice/Narration controls; moved to popover above */}
              </div>
            </div>
            {Array.isArray(variants) ? variants.slice(0, 3).map(v => (
              <TabsContent key={v.id} value={v.id} className="mt-3">
                {(() => {
                  const accent = v.id === 'A' ? 'border-blue-500' : v.id === 'B' ? 'border-purple-500' : 'border-emerald-500'
                  const badge = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs'
                  const badgeGenre = `${badge} border-gray-700 bg-gray-800/60 text-gray-200`
                  const badgeFormat = `${badge} border-gray-700 bg-gray-800/60 text-gray-200`
                  const badgeAudience = `${badge} border-gray-700 bg-gray-800/60 text-gray-200`
                  return (
                <div className="space-y-5 text-sm text-gray-200">
                  {/* Callout */}
                  <div className={`p-3 rounded-md border-l-4 ${accent} bg-gray-900/50`}> 
                    <div className={`text-base font-semibold ${v.id===activeVariant.id ? flashIf('title') : ''}`}>{v.title || 'Concept Variant ' + (v.label || v.id)}</div>
                    {v.logline ? (
                      <div className={`mt-1 text-gray-300 leading-6 ${v.id===activeVariant.id ? flashIf('logline') : ''}`}>{v.logline}</div>
                    ) : null}
                    {!enabled && (
                      <div className="mt-2 text-xs text-gray-400 inline-flex items-center gap-1" title="Set ELEVENLABS_API_KEY to enable audio previews">
                        <Volume2 size={14} /> Audio preview unavailable
                      </div>
                    )}
                  </div>
                  {/* Core Identifying Information */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Core Identifying Information</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded border border-gray-700/60 bg-gray-900/40">
                      <div>
                        <div className="text-xs text-gray-400">Title</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? flashIf('title') : ''}`}>{v.title || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Genre</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? flashIf('genre') : ''}`}>
                          {v.genre ? <span className={badgeGenre}>{v.genre}</span> : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Format/Length</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? flashIf('format_length') : ''}`}>
                          {v.format_length ? <span className={badgeFormat}>{v.format_length}</span> : '—'}
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <div className="text-xs text-gray-400">Logline</div>
                        <div className={`text-gray-200 whitespace-pre-wrap leading-6 ${v.id===activeVariant.id ? flashIf('logline') : ''}`}>{v.logline || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Target Audience</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? flashIf('target_audience') : ''}`}>
                          {v.target_audience ? <span className={badgeAudience}>{v.target_audience}</span> : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Author/Writer</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? flashIf('author_writer') : ''}`}>{v.author_writer || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Date</div>
                        <div className={`text-gray-200 font-mono ${v.id===activeVariant.id ? flashIf('date') : ''}`}>{v.date || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Narrative Structure & Plot */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Story Setup</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded border border-gray-700/60 bg-gray-900/40">
                      <div>
                        <div className="text-xs text-gray-400">Setting</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? flashIf('setting') : ''}`}>{v.setting || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Protagonist</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? flashIf('protagonist') : ''}`}>{v.protagonist || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Antagonist / Conflict</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? flashIf('antagonist') : ''}`}>{v.antagonist || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Tone, Style, & Themes */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Tone, Style, & Themes</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded border border-gray-700/60 bg-gray-900/40">
                      <div>
                        <div className="text-xs text-gray-400">Tone</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? (flashIf('tone_description') || flashIf('tone')) : ''}`}>{v.tone_description || v.tone || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Style / Visual Style</div>
                        <div className={`text-gray-200 ${v.id===activeVariant.id ? (flashIf('style') || flashIf('visual_style')) : ''}`}>{v.style || v.visual_style || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Themes</div>
                        <div className={`text-gray-200 flex flex-wrap gap-2 ${v.id===activeVariant.id ? flashIf('themes') : ''}`}>
                          {Array.isArray(v.themes) ? v.themes.map((t: string, i: number) => (
                            <span key={`${t}-${i}`} className="px-2 py-0.5 rounded-full bg-gray-800/60 border border-gray-700 text-xs">{t}</span>
                          )) : (v.themes || '—')}
                        </div>
                      </div>
                      {Array.isArray(v.mood_references) && v.mood_references.length > 0 ? (
                        <div className="md:col-span-3">
                          <div className="text-xs text-gray-400">Mood / References</div>
                          <div className="text-gray-200">{v.mood_references.join(', ')}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Beats & Runtime */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Beats & Runtime</div>
                    <div className="space-y-3 p-4 rounded border border-gray-700/60 bg-gray-900/40">
                      <div>
                        <div className="text-xs text-gray-400">Synopsis</div>
                        <div className={`text-gray-200 whitespace-pre-wrap leading-7 ${v.id===activeVariant.id ? (flashIf('synopsis') || flashIf('content')) : ''}`}>{v.synopsis || v.content || '—'}</div>
                      </div>
                      {Array.isArray((v as any).beats) && (v as any).beats.length > 0 ? (
                        <div className="space-y-2">
                          {(v as any).beats.map((b: any, idx: number) => (
                            <div key={idx} className={`p-2 rounded border border-gray-800 bg-gray-900/50 ${v.id===activeVariant.id ? flashIf('beats') : ''}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm text-white font-medium">{b.title || `Beat ${idx+1}`}</div>
                                  {b.intent && <div className="text-xs text-gray-400 mt-0.5">{b.intent}</div>}
                                </div>
                                <div className="shrink-0 text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-200 border border-gray-700">{Number(b.minutes||0).toFixed(2)} m</div>
                              </div>
                              {b.synopsis && <div className="text-sm text-gray-200 mt-1 whitespace-pre-wrap leading-6">{b.synopsis}</div>}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Characters - Simple Preview */}
                  {Array.isArray(v.character_descriptions) && v.character_descriptions.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Characters ({v.character_descriptions.length})
                      </div>
                      <div className="flex flex-wrap gap-2 p-3 rounded border border-gray-700/60 bg-gray-900/40">
                        {v.character_descriptions.map((c, idx) => (
                          <div 
                            key={idx} 
                            className="px-2.5 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5"
                          >
                            {c.name}
                            {c.role && <span className="text-purple-400/60">· {c.role}</span>}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-400 italic mt-2 px-3">
                        💡 Characters will be refined with images and detailed attributes in the Vision phase
                      </div>
                    </div>
                  ) : null}
                </div>
                  )
                })()}
              </TabsContent>
            )) : null}
          </Tabs>
        </CardContent>
        <VariantEditorDrawer
          open={editorOpen}
          variant={activeVariant as any}
          onClose={() => setEditorOpen(false)}
          onApply={(patch) => {
            try { (useGuideStore.getState() as any).updateTreatmentVariant(activeVariant.id, patch) } catch {}
            setEditorOpen(false)
          }}
          onSaveAsNew={(draft) => {
            try {
              (useGuideStore.getState() as any).addTreatmentVariant(draft)
              ;(useGuideStore.getState() as any).selectTreatmentVariant(draft.id)
            } catch {}
            setEditorOpen(false)
          }}
        />
        {/* Owner Collaboration Panel */}
        <OwnerCollabPanel
          open={collabOpen}
          onClose={()=> setCollabOpen(false)}
          sessionId={sessionId}
          activeVariantId={activeVariant.id}
          onSelectVariant={(id)=> selectTreatmentVariant(id)}
        />
        {/* Character Prompt Builder removed - now in Vision phase */}
        {shareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShareOpen(false)} />
            <div className="relative w-full max-w-lg mx-auto rounded-lg border border-gray-800 bg-gray-900 p-5 shadow-xl">
              <div className="text-lg font-semibold text-white mb-2">Share collaboration link</div>
              <div className="text-sm text-gray-300 mb-3">Send this link to your reviewers.</div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl || ''}
                  onFocus={(e)=> (e.target as HTMLInputElement).select()}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200"
                />
                <button
                  type="button"
                  onClick={async ()=> { if (shareUrl) { try { await navigator.clipboard?.writeText?.(shareUrl) } catch {} } }}
                  className="px-3 py-1 rounded bg-gray-800 text-xs"
                >Copy</button>
                <a
                  href={shareUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs"
                >Open</a>
              </div>
              <div className="mt-4 flex justify-end">
                <button className="px-3 py-1 rounded bg-gray-800 text-xs" onClick={() => setShareOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Image Zoom Modal removed - now in Vision phase */}
      </Card>
    )
  }

  return null
}

export default TreatmentCard



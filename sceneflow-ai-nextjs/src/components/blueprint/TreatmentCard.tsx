'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useGuideStore } from '@/store/useGuideStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Square, Volume2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function TreatmentCard() {
  const { guide } = useGuideStore()
  const { selectTreatmentVariant, useTreatmentVariant } = useGuideStore() as any
  const treatmentText = (guide as any)?.filmTreatment || ''
  const details = (guide as any)?.treatmentDetails || {}
  const variants = (guide as any)?.treatmentVariants as Array<{ id: string; label?: string; content: string; visual_style?: string; tone_description?: string; target_audience?: string; title?: string; logline?: string; genre?: string; format_length?: string; author_writer?: string; date?: string; synopsis?: string; setting?: string; protagonist?: string; antagonist?: string; act_breakdown?: any; tone?: string; style?: string; themes?: any; mood_references?: string[]; character_descriptions?: Array<{ name: string; description: string; image_prompt?: string }>; }> | undefined
  const selectedId = (guide as any)?.selectedTreatmentId as string | undefined

  // If variants exist, render tabs; else show single treatment (current behavior)
  if (variants && variants.length > 0) {
    const active = selectedId || variants[0].id
    // ElevenLabs voice list and audio playback state
    const [voices, setVoices] = useState<Array<{ id: string; name: string }>>([])
    const [enabled, setEnabled] = useState<boolean>(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined)
    const [ttsMode, setTtsMode] = useState<'elevenlabs' | 'browser'>('elevenlabs')
    const [browserSupported, setBrowserSupported] = useState<boolean>(false)

    useEffect(() => {
      let mounted = true
      ;(async () => {
        try {
          const res = await fetch('/api/tts/elevenlabs/voices', { cache: 'no-store' })
          const data = await res.json().catch(() => null)
          if (!mounted) return
          if (data?.enabled && Array.isArray(data.voices)) {
            setEnabled(true)
            const list = data.voices.map((v: any) => ({ id: v.id, name: v.name }))
            setVoices(list)
            if (!selectedVoiceId && list.length) setSelectedVoiceId(list[0].id)
          } else {
            setEnabled(false)
          }
        } catch {
          if (!mounted) return
          setEnabled(false)
        }
      })()
      return () => { mounted = false }
    }, [])

    useEffect(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        setBrowserSupported(true)
      }
    }, [])

    useEffect(() => {
      if (!enabled) setTtsMode('browser')
    }, [enabled])

    const stopAny = () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }
        if (utteranceRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try { window.speechSynthesis.cancel() } catch {}
        }
      } catch {}
      audioRef.current = null
      utteranceRef.current = null
      setLoadingId(null)
    }

    const playVariant = async (variantId: string) => {
      stopAny()
      setLoadingId(variantId)
      const v = variants.find(x => x.id === variantId) || variants[0]
      const text = String(v.synopsis || v.content || '').slice(0, 1400)
      try {
        if (ttsMode === 'browser' && browserSupported && typeof window !== 'undefined') {
          const u = new SpeechSynthesisUtterance(text)
          u.lang = 'en-US'
          u.rate = 1
          u.pitch = 1
          u.onend = () => stopAny()
          utteranceRef.current = u
          window.speechSynthesis.speak(u)
        } else {
          const resp = await fetch('/api/tts/elevenlabs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceId: selectedVoiceId || voices[0]?.id })
          })
          if (!resp.ok) throw new Error('TTS failed')
          const blob = await resp.blob()
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audioRef.current = audio
          audio.onended = () => stopAny()
          await audio.play()
        }
      } catch {
        stopAny()
      }
    }
    return (
      <Card className="mt-4 border-gray-700/60 bg-gray-900/60">
        <CardHeader>
          <CardTitle className="text-white">Film Treatment Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={active} className="w-full">
            <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 rounded-md">
              <div className="flex items-center justify-between gap-3 py-2">
                <TabsList className="flex-1 mx-1">
                  {variants.slice(0, 3).map(v => {
                    const dotColor = v.id === 'A' ? 'bg-blue-500' : v.id === 'B' ? 'bg-purple-500' : 'bg-emerald-500'
                    return (
                      <TabsTrigger key={v.id} value={v.id} onClick={() => selectTreatmentVariant(v.id)} className="gap-2">
                        <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden></span>
                        {v.label || v.id}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                {/* Per-variant primary action (sticky) */}
                {(() => {
                  const v = variants.find(x => x.id === active) || variants[0]
                  const accentBtn = v?.id === 'A' ? 'border-blue-500 text-blue-300 hover:bg-blue-500/10' : v?.id === 'B' ? 'border-purple-500 text-purple-300 hover:bg-purple-500/10' : 'border-emerald-500 text-emerald-300 hover:bg-emerald-500/10'
                  return (
                    <button
                      type="button"
                      onClick={() => useTreatmentVariant(v.id)}
                      className={`text-xs px-3 py-1 rounded border ${accentBtn} mr-1`}
                      aria-label="Use this treatment"
                    >
                      Use this
                    </button>
                  )
                })()}
                {/* TTS mode & voice selection */}
                <div className="flex items-center gap-2 mr-2">
                  <div className="inline-flex items-center rounded border border-gray-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTtsMode('elevenlabs')}
                      disabled={!enabled}
                      className={`text-xs px-2 py-1 ${ttsMode==='elevenlabs' ? 'bg-gray-800 text-gray-100' : 'text-gray-300'} ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={enabled ? 'Use ElevenLabs TTS' : 'ElevenLabs not configured'}
                    >EL</button>
                    <button
                      type="button"
                      onClick={() => setTtsMode('browser')}
                      disabled={!browserSupported}
                      className={`text-xs px-2 py-1 ${ttsMode==='browser' ? 'bg-gray-800 text-gray-100' : 'text-gray-300'} ${!browserSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={browserSupported ? 'Use Browser TTS' : 'Browser TTS not supported'}
                    >Browser</button>
                  </div>
                  {enabled && ttsMode==='elevenlabs' && (
                    <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {/* Audio controls for active variant */}
                {enabled && (
                  <div className="flex items-center gap-2 mr-2">
                    {loadingId === active ? (
                      <button
                        type="button"
                        onClick={stopAny}
                        className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800"
                        aria-label="Stop playback"
                        title="Stop playback"
                      >
                        <span className="inline-flex items-center gap-1"><Square size={14} /> Stop</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => playVariant(active)}
                        className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-800"
                        aria-label="Play variant narration"
                        title="Play variant narration"
                      >
                        <span className="inline-flex items-center gap-1"><Play size={14} /> Play</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {variants.slice(0, 3).map(v => (
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
                    <div className="text-base font-semibold">{v.title || 'Concept Variant ' + (v.label || v.id)}</div>
                    {v.logline ? (
                      <div className="mt-1 text-gray-300 leading-6">{v.logline}</div>
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
                        <div className="text-gray-200">{v.title || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Genre</div>
                        <div className="text-gray-200">
                          {v.genre ? <span className={badgeGenre}>{v.genre}</span> : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Format/Length</div>
                        <div className="text-gray-200">
                          {v.format_length ? <span className={badgeFormat}>{v.format_length}</span> : '—'}
                        </div>
                      </div>
                      <div className="md:col-span-3">
                        <div className="text-xs text-gray-400">Logline</div>
                        <div className="text-gray-200 whitespace-pre-wrap leading-6">{v.logline || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Target Audience</div>
                        <div className="text-gray-200">
                          {v.target_audience ? <span className={badgeAudience}>{v.target_audience}</span> : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Author/Writer</div>
                        <div className="text-gray-200">{v.author_writer || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Date</div>
                        <div className="text-gray-200 font-mono">{v.date || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Narrative Structure & Plot */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Narrative Structure & Plot</div>
                    <div className="space-y-3 p-4 rounded border border-gray-700/60 bg-gray-900/40">
                      <div>
                        <div className="text-xs text-gray-400">Synopsis</div>
                        <div className="text-gray-200 whitespace-pre-wrap leading-7">{v.synopsis || v.content || '—'}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs text-gray-400">Setting</div>
                          <div className="text-gray-200">{v.setting || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Protagonist</div>
                          <div className="text-gray-200">{v.protagonist || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Antagonist / Conflict</div>
                          <div className="text-gray-200">{v.antagonist || '—'}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 divide-y md:divide-y-0 md:divide-x divide-gray-800 pt-2">
                        <div>
                          <div className="text-xs text-gray-400">Act I</div>
                          <div className="text-gray-200 whitespace-pre-wrap leading-6">{v.act_breakdown?.act1 || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Act II</div>
                          <div className="text-gray-200 whitespace-pre-wrap leading-6">{v.act_breakdown?.act2 || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400">Act III</div>
                          <div className="text-gray-200 whitespace-pre-wrap leading-6">{v.act_breakdown?.act3 || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tone, Style, & Themes */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Tone, Style, & Themes</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded border border-gray-700/60 bg-gray-900/40">
                      <div>
                        <div className="text-xs text-gray-400">Tone</div>
                        <div className="text-gray-200">{v.tone_description || v.tone || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Style / Visual Style</div>
                        <div className="text-gray-200">{v.style || v.visual_style || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Themes</div>
                        <div className="text-gray-200 flex flex-wrap gap-2">
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

                  {/* Characters */}
                  {Array.isArray(v.character_descriptions) && v.character_descriptions.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Characters</div>
                      <div className="space-y-2 p-3 rounded border border-gray-700/60 bg-gray-900/40">
                        {v.character_descriptions.map((c, idx) => (
                          <div key={`${c.name}-${idx}`} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs text-gray-400">Name</div>
                              <div className="text-gray-200">{c.name}</div>
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-xs text-gray-400">Description</div>
                              <div className="text-gray-200 whitespace-pre-wrap leading-6">{c.description}</div>
                            </div>
                            {c.image_prompt ? (
                              <div className="md:col-span-3">
                                <div className="text-xs text-gray-400">Image Prompt</div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 text-gray-200 truncate" title={c.image_prompt}>{c.image_prompt}</div>
                                  <button
                                    type="button"
                                    onClick={() => navigator.clipboard?.writeText?.(c.image_prompt || '')}
                                    className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-200 hover:bg-gray-800"
                                  >Copy</button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                  )
                })()}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    )
  }

  if (!treatmentText) return null

  return (
    <Card className="mt-4 border-gray-700/60 bg-gray-900/60">
      <CardHeader>
        <CardTitle className="text-white">Film Treatment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-gray-200">
          <div className="whitespace-pre-wrap leading-6">{String(treatmentText)}</div>
          {(details?.visual_style || details?.toneAndStyle || details?.targetAudience) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-700/50">
              {details?.visual_style || details?.visualStyle ? (
                <div>
                  <div className="text-xs text-gray-400">Visual Style</div>
                  <div className="text-gray-200">{details.visual_style || details.visualStyle}</div>
                </div>
              ) : null}
              {details?.tone_description || details?.toneAndStyle ? (
                <div>
                  <div className="text-xs text-gray-400">Tone</div>
                  <div className="text-gray-200">{details.tone_description || details.toneAndStyle}</div>
                </div>
              ) : null}
              {details?.target_audience || details?.targetAudience ? (
                <div>
                  <div className="text-xs text-gray-400">Target Audience</div>
                  <div className="text-gray-200">{details.target_audience || details.targetAudience}</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TreatmentCard



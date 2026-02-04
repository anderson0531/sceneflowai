'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Clapperboard,
  X, 
  Send, 
  Mic,
  MicOff,
  Clipboard, 
  BookmarkPlus
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { usePathname } from 'next/navigation'

const suggestedResponses = [
  'Start Tour',
  'Social Tips', 
  'How do I configure BYOK?',
  'Show me the workflow steps',
  'What are credits used for?',
  'Help me brainstorm ideas',
  'Refine my concept',
  'Improve my outline'
]

const dashboardKnowledge = {
  tour: "Welcome to SceneFlow AI! Here's your dashboard tour:\n\n🎯 **Quick Actions**: Start new projects or continue existing ones\n💳 **Credit Status**: Monitor your AI generation credits\n📁 **Project Hub**: Manage your video projects\n⚙️ **Studio Utilities**: Access settings and tools\n\nReady to create your first video? Click 'Create New Project' to get started!",
  byok: "BYOK (Bring Your Own Key) configuration:\n\n1. Go to **Settings** → **BYOK Configuration**\n2. Add your Google Gemini API key for text generation\n3. Add your Google Veo API key for video generation\n4. This gives you direct control over costs and no rate limiting\n\nBenefits: Lower costs, better performance, full control over your AI providers.",
  workflow: "SceneFlow AI has a 4-step workflow:\n\n1️⃣ **Blueprint**: AI-powered concept generation and ideation\n2️⃣ **Production**: Visual storyboard and scene planning\n3️⃣ **Final Cut**: Scene direction, editing and refinement\n4️⃣ **Premiere**: Final video generation and export\n\nEach step builds on the previous one, creating a professional video production pipeline.",
  credits: "Credits are consumed for AI operations:\n\n• **Ideation**: 10-25 credits per concept\n• **Storyboarding**: 50-100 credits per storyboard\n• **Scene Direction**: 25-50 credits per scene\n• **Video Generation**: 100-500 credits per video\n\nYour plan includes monthly credits, and you can purchase additional packs ($10 for 100 credits) as needed.",
  social: "Social media video tips:\n\n📱 **Platform Optimization**:\n• Instagram: 15-60 seconds, vertical 9:16\n• TikTok: 15-60 seconds, vertical 9:16\n• YouTube: 15 seconds to 10+ minutes\n• LinkedIn: 30 seconds to 5 minutes\n\n🎬 **Content Strategy**:\n• Hook viewers in first 3 seconds\n• Use trending audio and hashtags\n• Include captions for accessibility\n• End with clear call-to-action",
  concept: "Concept refinement tips:\n\n🎯 **Core Premise**: Focus on one main idea that's clear and compelling\n📝 **Outline Structure**: Ensure logical flow from hook to conclusion\n🎨 **Style & Tone**: Match your target audience and platform\n⏱️ **Duration**: Consider platform requirements and audience attention span\n\nI can help you refine any aspect of your concept - just ask!"
}

type AssistantMessage = string
type CueMode =
  | 'general'         // General Help
  | 'dashboard'       // Dashboard guidance + credits
  | 'spark'           // The Spark Studio (ideation)
  | 'vision'          // Vision Board (storyboard)
  | 'director'        // Director's Chair (scene direction)
  | 'screening'       // The Screening Room (video generation)
  | 'guide'           // legacy
  | 'critique'        // legacy
  | 'draft'           // legacy

const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    audioRef.current = new Audio()
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])
  const playArrayBuffer = async (buf: ArrayBuffer) => {
    const blob = new Blob([buf], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    if (!audioRef.current) return
    audioRef.current.src = url
    await audioRef.current.play().catch(() => {})
    audioRef.current.onended = () => URL.revokeObjectURL(url)
  }
  return { playArrayBuffer }
}

export function CueAssistantWidget() {
  const { 
    cueAssistantOpen, 
    setCueAssistantOpen, 
    cueConversation, 
    addCueMessage, 
    markNotificationsAsRead 
  } = useStore()
  
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const [mode, setMode] = useState<CueMode>('general')

  // Voice: Realistic by default; falls back to browser TTS if API unavailable
  const { supported: ttsSupported, speak, isSpeaking } = useSpeechSynthesis()
  const { playArrayBuffer } = useAudioPlayer()
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  // Speech-to-text
  const {
    supported: asrSupported,
    isRecording,
    transcript,
    start: startRecording,
    stop: stopRecording,
    setTranscript,
  } = useSpeechRecognition()

  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')

  const requestMicAccess = async (): Promise<boolean> => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicPermission('denied')
        return false
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Immediately stop tracks; we only needed permission
      stream.getTracks().forEach((t) => t.stop())
      setMicPermission('granted')
      return true
    } catch {
      setMicPermission('denied')
      return false
    }
  }

  // helper: quick prompts per step
  const step = useStore.getState().currentStep
  const quickByStep: Record<string, string[]> = {
    ideation: ['Improve my hook', 'Give 3 concept lines', 'Audience insight'],
    storyboard: ['Write a shot list', 'Transitions ideas', 'Fix pacing'],
    'scene-direction': ['Lens + movement', 'Lighting plan', 'Subject action'],
    'video-generation': ['Tighten prompts', 'Alt takes', 'Add B-roll ideas'],
  }

  // Detect mode from current route
  const detectModeFromPath = (p: string): CueMode => {
    if (!p) return 'general'
    if (p.startsWith('/dashboard/workflow/ideation')) return 'spark'
    if (p.startsWith('/dashboard/workflow/storyboard')) return 'vision'
    if (p.startsWith('/dashboard/workflow/scene-direction')) return 'director'
    if (p.startsWith('/dashboard/workflow/video-generation')) return 'screening'
    if (p.startsWith('/dashboard')) return 'dashboard'
    return 'general'
  }

  // Auto-switch modes when navigation changes
  useEffect(() => {
    setMode(detectModeFromPath(pathname || ''))
  }, [pathname])

  const sendQuick = (q: string) => handleSendMessage(`[${mode.toUpperCase()} REQUEST] ${q}`)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [cueConversation.messages])

  useEffect(() => {
    if (cueAssistantOpen) {
      markNotificationsAsRead()
    }
  }, [cueAssistantOpen, markNotificationsAsRead])

  useEffect(() => {
    if (!isRecording && transcript) {
      handleSendMessage(transcript)
      setTranscript('')
    }
  }, [isRecording])

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    addCueMessage({ type: 'user', content })
    setInputValue('')
    setIsTyping(true)

    try {
      const msgs = cueConversation.messages.map((m) => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }))
      msgs.push({ role: 'user', content })

      const context = {
        pathname,
        currentStep: useStore.getState().currentStep,
        stepProgress: useStore.getState().stepProgress,
        projectsCount: useStore.getState().projects.length,
        project: useStore.getState().currentProject || undefined,
        mode,
      }

      const resp = await fetch('/api/cue/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, context }),
      })

      let response: string | null = null
      if (resp.ok) {
        const data = await resp.json()
        response = data.reply
      }
      if (!response) response = generateAIResponse(content)

      addCueMessage({ type: 'assistant', content: response })

      if (voiceEnabled) {
        // Prefer Google TTS
        try {
          const res = await fetch('/api/tts/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: response }),
          })
          if (res.ok) {
            const buf = await res.arrayBuffer()
            await playArrayBuffer(buf)
            setIsTyping(false)
            return
          }
        } catch {}
        // Fallback to browser TTS if available
        if (ttsSupported) speak(response as AssistantMessage)
      }
    } catch {
      const fallback = generateAIResponse(content)
      addCueMessage({ type: 'assistant', content: fallback })
      if (voiceEnabled && ttsSupported) speak(fallback as AssistantMessage)
    } finally {
      setIsTyping(false)
    }
  }

  const generateAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()

    // Global intents
    if (message.includes('tour') || message.includes('start')) return dashboardKnowledge.tour
    if (message.includes('byok') || message.includes('configure') || message.includes('api')) return dashboardKnowledge.byok
    if (message.includes('workflow') || message.includes('step')) return dashboardKnowledge.workflow
    if (message.includes('credit')) return dashboardKnowledge.credits
    if (message.includes('social') || message.includes('tip')) return dashboardKnowledge.social
    if (message.includes('concept') || message.includes('refine') || message.includes('outline')) return dashboardKnowledge.concept

    const project = useStore.getState().currentProject
    const title = project?.title || 'Your Concept'
    const premise: string = (project?.metadata as any)?.concept || ''

    const punchUp = (text: string): string => {
      const base = text || `A compelling video about ${title}`
      // Simple heuristics: remove filler and make a hooky opener
      const trimmed = base
        .replace(/\b(very|really|basically|just|kind of|sort of)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
      return `Open strong: What if ${title} changed everything?\n\nCore Premise: ${trimmed}\n\nHook + Payoff: In the first 3–5 seconds, promise the viewer exactly what they’ll get, then show one concrete example to prove it.`
    }

    const reviseOutline = (option: number): string => {
      return `Revised Outline Option ${option}:\n1) Hook: a bold on‑screen line that states the payoff\n2) Context: a quick real‑life problem moment\n3) Move: demonstrate the idea with a single, visual action\n4) Contrast: before/after split to show change\n5) Proof: stat/mini‑testimonial overlay\n6) CTA: one clear next step for the target platform`
    }

    // Mode-specific helpers
    switch (mode) {
      case 'dashboard':
        return "You're on the Dashboard. I can help you navigate, understand credits, configure BYOK, or start a new project. Try: ‘How do credits work?’ or ‘Show me where to create a project.’"
      case 'spark': {
        if (message.includes('rewrite') && (message.includes('premise') || message.includes('core'))) {
          return punchUp(premise)
        }
        const match = message.match(/outline\s*option\s*(\d+)/)
        if (match) {
          const idx = Number(match[1] || '1')
          return reviseOutline(idx)
        }
        if (message.includes('hook')) {
          return `Three stronger hooks for “${title}”:\n- Stop scroll: One surprising truth about ${title} that nobody tells you\n- Visual shock: Show the “after” first; explain how in 20 seconds\n- Ultimatum: If you care about ${title}, do this one thing today`
        }
        return "Spark Studio mode: Tell me to ‘rewrite my core premise’, ‘revise outline option 2’, or ‘improve my hook’ and I’ll produce concrete updates."
      }
      case 'vision':
        return "Production mode: I can help refine your storyboard. Ask for shot lists, transitions, beat pacing, or visual motifs."
      case 'director':
        return "Director’s Chair mode: I can draft lensing, camera movement, lighting plans, and scene directions. Try ‘Suggest lenses and movement for Scene 3.’"
      case 'screening':
        return "Screening Room mode: I can help interpret generation results, propose alt takes, and prepare prompts for re-runs. Try ‘Tighten prompts for Version A’ or ‘Suggest B-roll.’"
      case 'general':
      default:
        // Placeholder tutorials list
        return "General Help mode: I can explain features, provide a product overview, and link tutorials. Tutorials (coming soon): • Getting Started • Configuring BYOK • Credits & Plans • Workflow Tour. What would you like to learn?"
    }
  }

  const toggleRecording = async () => {
    if (!asrSupported) return
    if (isRecording) {
      stopRecording()
    } else {
      if (micPermission !== 'granted') {
        const ok = await requestMicAccess()
        if (!ok) return
      }
      setTranscript('')
      startRecording()
    }
  }

  // header mic is no longer clickable; messaging shown in context strip if blocked

  return (
    <>
      <AnimatePresence>
        {!cueAssistantOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed bottom-6 right-6 z-50">
            <button onClick={() => setCueAssistantOpen(true)} aria-label="Open Cue assistant" className={`relative w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${isRecording ? 'ring-4 ring-red-400/40' : (voiceEnabled && isSpeaking ? 'ring-4 ring-green-400/40' : '')}` }>
              <Clapperboard className="w-6 h-6" />
              {cueConversation.hasUnreadNotifications && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>}
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Chat with Cue AI</div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cueAssistantOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed bottom-6 right-6 z-50 w-96 h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col">
            {/* Header */}
            <div className="bg-blue-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center relative">
                  <Clapperboard className="w-4 h-4" />
                  {(isRecording || (voiceEnabled && isSpeaking)) && (
                    <>
                      <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isRecording ? 'bg-red-400' : 'bg-green-400'} animate-ping`}></span>
                      <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    </>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Cue AI Assistant</h3>
                  <p className="text-sm text-blue-100">Your creative partner</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`px-2 py-1 text-sm rounded-md border border-white/30 ${voiceEnabled ? 'bg-white/20' : 'bg-white/10'} ${voiceEnabled && isSpeaking ? 'animate-pulse' : ''}`} title={voiceEnabled ? 'Disable voice' : 'Enable voice'}>
                  Voice: {voiceEnabled ? 'On' : 'Off'}
                </button>
                <button onClick={() => setCueAssistantOpen(false)} className="text-white/80 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="px-4 py-2 bg-white border-b border-gray-200 text-sm text-gray-600 flex flex-wrap gap-2 items-center">
              <span className="font-medium">Context:</span>
              <span>Step: {useStore.getState().currentStep}</span>
              <span>Project: {useStore.getState().currentProject?.title || 'None'}</span>
              <span className="ml-auto hidden sm:inline">Mode: {mode}</span>
              {asrSupported && micPermission === 'denied' && (
                <span className="w-full sm:w-auto text-amber-600">Mic access is blocked. Enable microphone permission in your browser’s site settings and reload.</span>
              )}
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {cueConversation.messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  <Clapperboard className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>Ask me anything about SceneFlow AI!</p>
                </div>
              )}

              {cueConversation.messages.map((m) => (
                <div key={m.id} className={`mb-4 ${m.type === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${m.type === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800 shadow-sm'}`}>
                    <p className="text-sm whitespace-pre-line">{m.content}</p>
                  </div>
                  {m.type === 'assistant' && (
                    <div className="mt-1 flex gap-2 text-sm text-gray-500">
                      <button className="hover:text-gray-700 inline-flex items-center gap-1" onClick={() => navigator.clipboard.writeText(m.content)}>
                        <Clipboard className="w-3 h-3" /> Copy
                      </button>
                      <button className="hover:text-gray-700 inline-flex items-center gap-1" onClick={() => useStore.getState().appendCurrentProjectNote(m.content)}>
                        <BookmarkPlus className="w-3 h-3" /> Save to project
                      </button>
                      <ApplySuggestion content={m.content} />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="text-left mb-4">
                  <div className="inline-block bg-white text-gray-800 shadow-sm px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {cueConversation.messages.length === 0 && (
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {suggestedResponses.slice(0, 3).map((s) => (
                    <button key={s} onClick={() => handleSendMessage(s)} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full hover:bg-blue-200 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="px-4 pb-3">
              <div className="flex flex-wrap gap-2">
                {(quickByStep[step] || []).map((q) => (
                  <button key={q} onClick={() => sendQuick(q)} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full hover:bg-blue-200 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2 items-center">
                <Input 
                  value={isRecording ? transcript : inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(isRecording ? transcript : inputValue)} 
                  placeholder="Ask Cue anything…" 
                  className="flex-1 text-sm" 
                  disabled={isRecording} 
                />
                <Button 
                  onClick={toggleRecording} 
                  disabled={!asrSupported} 
                  className={`px-3 py-2 ${!asrSupported ? 'opacity-50 cursor-not-allowed' : isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-sf-surface-light hover:bg-sf-border text-sf-text-primary'} border border-sf-border`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button 
                  onClick={() => handleSendMessage(isRecording ? transcript : inputValue)} 
                  disabled={!(isRecording ? transcript.trim() : inputValue.trim()) || isTyping} 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function ApplySuggestion({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  const [addNote, setAddNote] = useState(true)
  const [addStoryboard, setAddStoryboard] = useState(false)
  const [addDirections, setAddDirections] = useState(false)
  const [addPrompts, setAddPrompts] = useState(false)
  const [credits, setCredits] = useState(2) // small default; could be dynamic later

  const onApply = () => {
    useStore.getState().applyCueSuggestion({ content, addNote, addStoryboard, addDirections, addPrompts, creditsCost: credits })
    setOpen(false)
  }

  return (
    <div className="inline-block">
      <button onClick={() => setOpen(!open)} className="hover:text-gray-700 inline-flex items-center gap-1">
        <BookmarkPlus className="w-3 h-3" /> Apply…
      </button>
      {open && (
        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-md w-[320px] text-sm text-gray-700">
          <div className="font-medium mb-2">Apply to project</div>
          <div className="space-y-1">
            <label className="flex items-center gap-2"><input type="checkbox" checked={addNote} onChange={(e) => setAddNote(e.target.checked)} /> Add as note</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={addStoryboard} onChange={(e) => setAddStoryboard(e.target.checked)} /> Append to storyboard</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={addDirections} onChange={(e) => setAddDirections(e.target.checked)} /> Append to scene directions</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={addPrompts} onChange={(e) => setAddPrompts(e.target.checked)} /> Save as generation prompt</label>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Estimated credits:</span>
            <input className="w-12 border border-gray-200 rounded px-1 py-0.5" type="number" min={0} value={credits} onChange={(e) => setCredits(parseInt(e.target.value || '0', 10))} />
          </div>
          <div className="mt-2">
            <div className="text-[11px] text-gray-500 mb-1">Preview</div>
            <div className="max-h-24 overflow-auto whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-2">{content}</div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button className="px-2 py-1 rounded border" onClick={() => setOpen(false)}>Cancel</button>
            <button className="px-2 py-1 rounded bg-blue-600 text-white" onClick={onApply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  )
}

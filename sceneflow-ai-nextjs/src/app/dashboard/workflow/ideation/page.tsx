'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEnhancedStore } from '@/store/enhancedStore'
import { Button } from '@/components/ui/Button'
import { CueChatInterface } from '@/components/workflow/CueChatInterface'
import { IdeaDisplayCards } from '@/components/workflow/IdeaDisplayCards'
import { SimilarVideosSection } from '@/components/workflow/SimilarVideosSection'
import { 
  Lightbulb, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  Target,
  MessageCircle,
  Save,
  Share2,
  Download,
  TrendingUp,
  Star,
  Send
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CollaborationService } from '@/services/CollaborationService'
import { ExportService } from '@/services/ExportService'
import { ScoreService } from '@/services/ScoreService'
import { TemplateManager } from '@/components/workflow/TemplateManager'
import { WorkshopCard } from '@/components/workflow/ideation/WorkshopCard'
import { ScoreCard } from '@/components/workflow/ideation/ScoreCard'
import { CoreConceptCard } from '@/components/workflow/ideation/CoreConceptCard'
import StoryboardReadinessCard from '@/components/workflow/ideation/StoryboardReadinessCard'
import type { AnalysisResponse, CoreConceptAttributes, ConceptAttribute } from '@/types/SceneFlow'


export default function IdeationPage() {
  const router = useRouter()
  const { currentProject, updateProject, updateStepProgress, stepProgress, uiMode, setUIMode } = useEnhancedStore()
  const [concept, setConcept] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [tone, setTone] = useState('')
  
  // Enhanced features state
  const [generatedIdeas, setGeneratedIdeas] = useState<any[]>([])
  const [showIdeas, setShowIdeas] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<any>(null)
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false)
  const [proPreview, setProPreview] = useState<{ title: string; summary: string } | null>(null)
  const [scores, setScores] = useState<{ audience: number; technical: number; rationale: { audience: string; technical: string }, breakdown?: { audienceFactors: { label: string; contribution: number; note?: string }[]; technicalFactors: { label: string; contribution: number; note?: string }[] }, recommendations?: { audience: string[]; technical: string[] } } | null>(null)
  const [trend, setTrend] = useState<{ audience: number; technical: number }>({ audience: 0, technical: 0 })
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [collaborationSession, setCollaborationSession] = useState<any>(null)
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [youtubeApiKey, setYoutubeApiKey] = useState<string>('')
  const [showSimilarVideos, setShowSimilarVideos] = useState(false)
  const ideasRef = useRef<HTMLDivElement | null>(null)
  // Inspiration-style assistance (outlines only)
  const [inspoOutline, setInspoOutline] = useState<string[]>([])
  const [outlineVariants, setOutlineVariants] = useState<{ title: string; outline: string[] }[]>([])
  const [selectedOutlineIdx, setSelectedOutlineIdx] = useState<number | null>(null)
  const [collapsedOutlines, setCollapsedOutlines] = useState<Record<number, boolean>>({})
  const [showConceptAnalysis, setShowConceptAnalysis] = useState<boolean>(true)
  const [isLoadingOutline, setIsLoadingOutline] = useState(false)
  const [isRefreshingConcept, setIsRefreshingConcept] = useState(false)
  const [scoreVersion, setScoreVersion] = useState(0)
  const [hasUnscoredChanges, setHasUnscoredChanges] = useState(false)
  const [scoreCard, setScoreCard] = useState<{ audience: number; director: number } | null>(null)
  const [showWorkshop, setShowWorkshop] = useState(true)
  const [showScoreCard, setShowScoreCard] = useState(true)
  const [showCoreConcept, setShowCoreConcept] = useState(true)

  // Three-phase journey state
  type Phase = 'spark' | 'workshop' | 'blueprint'
  const [phase, setPhase] = useState<Phase>('spark')
  // Attributes and rationale for the Workshop phase
  const [attributes, setAttributes] = useState<CoreConceptAttributes | null>(null)
  const [workshopRationale, setWorkshopRationale] = useState<string>('')
  const [workshopMessages, setWorkshopMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // Cue assistant state
  const [cueMessages, setCueMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([])
  const [isCueThinking, setIsCueThinking] = useState(false)
  const [cueAnalysis, setCueAnalysis] = useState<{
    narrative_strength: number
    audience_alignment: number
    market_potential: number
    execution_feasibility: number
  } | null>(null)
  const [cueSuggestions, setCueSuggestions] = useState<string[]>([])
  const [cueCompleteness, setCueCompleteness] = useState<number>(0)
  const [isAutoPopulatingMustHaves, setIsAutoPopulatingMustHaves] = useState(false)
  const [selectedRecs, setSelectedRecs] = useState<string[]>([])
  const [isApplyingRecs, setIsApplyingRecs] = useState(false)

  const fallbackIdeas = (title: string, summary: string) => {
    const base = title || (summary.split('.').slice(0,1).join(' ') || 'Concept')
    const mk = (n: number, suffix: string) => ({
      id: `fallback-${Date.now()}-${n}`,
      title: `${base} – ${suffix}`,
      synopsis: `An actionable take on ${base}, designed for engagement and clarity.`,
      scene_outline: [
        'Scene 1: Hook and promise',
        'Scene 2: Context and tension',
        'Scene 3: Reveal and solution',
        'Scene 4: Call to action'
      ],
      thumbnail_prompt: `A striking thumbnail representing ${base} with high contrast visuals and clear subject.`,
      strength_rating: 3.8 + n * 0.2
    })
    return [mk(1,'Story'), mk(2,'How‑To'), mk(3,'Comparison'), mk(4,'Behind the Scenes')]
  }

  const generateFromCurrentConcept = async () => {
    try {
      // start progress loop
      setIsAnalyzing(true)
 
      // 1) Analyze & refine core concept via LLM
      const analyzeRes = await fetch('/api/concept/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: concept || 'Generate a compelling concept.' })
      })
      let analyzed: any = null
      if (analyzeRes.ok) {
        analyzed = await analyzeRes.json() as AnalysisResponse
        const workingTitle = analyzed?.attributes?.workingTitle?.value || (proPreview?.title ?? 'Untitled')
        const corePremise = analyzed?.attributes?.corePremise?.value || (proPreview?.summary ?? concept)
        setProPreview({ title: workingTitle, summary: corePremise })
        setAttributes(analyzed.attributes)
        setWorkshopRationale(analyzed.rationale || '')
        setPhase('workshop')
        setWorkshopMessages(prev => ([...prev, { id: `a-${Date.now()}`, role: 'assistant', content: analyzed.rationale || 'I analyzed your concept and populated key attributes for you to edit.' }]))
        setHasUnscoredChanges(false)
        setScoreVersion(v => v + 1)
        // Compute initial score from analyzed attributes
        computeScoreFromAttributes(analyzed.attributes)

        // Refresh outlines with latest attributes
        refreshOutline(analyzed.attributes)

        // Auto-populate must-have elements if missing/empty
        const hasMustHaves = Array.isArray(analyzed?.attributes?.mustHaveElements?.value) && analyzed.attributes.mustHaveElements.value.length > 0
        if (!hasMustHaves) {
          setIsAutoPopulatingMustHaves(true)
          try {
            const resp = await fetch('/api/concept/iterate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: 'Add the 5 most effective must-have elements for this concept (concise, actionable bullet items). Update mustHaveElements accordingly and keep other attributes unchanged.',
                currentAttributes: analyzed.attributes
              })
            })
            if (resp.ok) {
              const data: AnalysisResponse = await resp.json()
              setAttributes(data.attributes)
              if (data.rationale) setWorkshopRationale(prev => prev || data.rationale)
              setHasUnscoredChanges(true)
            }
          } catch (err) {
            console.warn('Must-have elements auto-populate failed:', err)
          } finally {
            setIsAutoPopulatingMustHaves(false)
          }
        }
      }
    } catch (e) {
      console.error('Generate ideas failed:', e)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Explicit idea generation from current attributes
  const generateIdeasFromAttributes = async () => {
    try {
      setIsGeneratingIdeas(true)
      setGenerationProgress(5)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      progressTimerRef.current = setInterval(() => {
        setGenerationProgress(prev => (prev < 90 ? prev + Math.ceil(Math.random() * 4) : prev))
      }, 400)
      const finalized = attributes || ({} as any)
      const res = await fetch('/api/idea/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalized)
      })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      if (Array.isArray(json)) {
        setGeneratedIdeas(json.slice(0,3))
        setShowIdeas(true)
        setPhase('blueprint')
        setTimeout(() => ideasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
      }
    } catch (e) {
      console.error('Generate ideas failed:', e)
      const ideas = fallbackIdeas(proPreview?.title || 'Concept', proPreview?.summary || concept).slice(0,3)
      setGeneratedIdeas(ideas)
      setShowIdeas(true)
      setPhase('blueprint')
      setTimeout(() => ideasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } finally {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      setGenerationProgress(100)
      setTimeout(() => {
        setIsGeneratingIdeas(false)
        setGenerationProgress(0)
      }, 600)
    }
  }

  const handleSave = () => {
    if (currentProject) {
      updateProject(currentProject.id, {
        metadata: {
          ...currentProject.metadata,
          concept,
          targetAudience,
          keyMessage,
          tone
        }
      })
      updateStepProgress('ideation', 100)
    }
  }

  const handleNextStep = () => {
    handleSave()
    router.push('/dashboard/studio/new-project')
  }

  // Enhanced feature handlers
  const handleGenerateIdeas = async (ideas: any[]) => {
    setGeneratedIdeas(ideas)
    setShowIdeas(true)
    // Thumbnail generation is now manual (BYOK). Use the action button below.
  }

  const handleGenerateThumbnails = async (ideas: any[]) => {
    setIsGeneratingThumbnails(true)
    
    try {
      const response = await fetch('/api/thumbnails/generate?byok=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'demo_user_001',
          ideas: ideas.map(idea => ({ id: idea.id, thumbnail_prompt: idea.thumbnail_prompt }))
        })
      })
      
      const results = await response.json()
      
      if (results.success && results.thumbnails) {
        // Update ideas with thumbnail URLs
        const updatedIdeas = ideas.map(idea => {
          const result = results.thumbnails[idea.id]
          if (result?.success && result.imageUrl) {
            return { ...idea, thumbnail_url: result.imageUrl }
          }
          return idea
        })
        
        setGeneratedIdeas(updatedIdeas)
      }
    } catch (error) {
      console.error('Error generating thumbnails:', error)
    } finally {
      setIsGeneratingThumbnails(false)
    }
  }

  // Recompute professional preview + scores when concept changes
  useEffect(() => {
    const preview = ScoreService.professionalize({ concept, targetAudience, keyMessage, tone })
    const s = ScoreService.score({ concept, targetAudience, keyMessage, tone })
    if (scores) {
      setTrend({ audience: s.audience - scores.audience, technical: s.technical - scores.technical })
    }
    setProPreview(preview)
    setScores(s)
  }, [concept, targetAudience, keyMessage, tone])

  const handleSelectAndIterate = (idea: any) => {
    setSelectedIdea(idea)
    setShowIdeas(false)
    // Load context into global Cue widget
    // Note: This functionality would need to be implemented in useEnhancedStore
    alert('Loaded into Cue. Open Cue to iterate the selected idea.')
  }

  const handleShareIdeas = async () => {
    if (!currentProject) return
    
    try {
      const session = await CollaborationService.createSession(
        currentProject.id,
        'demo_user_001',
        `Collaboration: ${currentProject.title}`,
        `Review and vote on video ideas for ${currentProject.title}`,
        generatedIdeas
      )
      
      setCollaborationSession(session)
      setShowCollaboration(true)
      
      // Generate shareable link
      const shareLink = CollaborationService.generateShareLink(session.id)
      navigator.clipboard.writeText(shareLink)
      
      alert('Collaboration link copied to clipboard!')
    } catch (error) {
      console.error('Error creating collaboration session:', error)
    }
  }

  // Share Core Concept for collaboration (team/customer review)
  const handleShareCoreConcept = async () => {
    if (!currentProject || !attributes) return
    try {
      // Build a compact payload for reviewers
      const core = {
        title: attributes?.workingTitle?.value,
        premise: attributes?.corePremise?.value,
        targetAudience: attributes?.targetAudience?.value,
        keyMessage: attributes?.keyMessageCTA?.value,
        tone: Array.isArray(attributes?.toneMood?.value) ? attributes.toneMood.value.join(', ') : attributes?.toneMood?.value,
        genre: attributes?.genreFormat?.value,
        duration: attributes?.estimatedDuration?.value,
      }
      const session = await CollaborationService.createSession(
        currentProject.id,
        'demo_user_001',
        `Core Concept Review: ${core.title || currentProject.title}`,
        `Review and comment on the core concept for ${currentProject.title}`,
        [core]
      )
      setCollaborationSession(session)
      setShowCollaboration(true)
      const shareLink = CollaborationService.generateShareLink(session.id)
      navigator.clipboard.writeText(shareLink)
      alert('Core Concept review link copied to clipboard!')
    } catch (e) {
      console.error('Share core concept failed:', e)
      alert('Unable to create share link. Please try again.')
    }
  }

  const handleExportIdeas = async () => {
    if (!collaborationSession) return
    
    try {
      const stats = await CollaborationService.getSessionStats(collaborationSession.id)
      if (!stats) return
      
      const exportOptions = {
        format: 'pdf' as const,
        includeThumbnails: true,
        includeFeedback: true,
        includeVotes: true,
        includeCollaborators: true
      }
      
      const result = await ExportService.exportSession(
        collaborationSession,
        stats,
        exportOptions
      )
      
      if (result.success && result.data) {
        // Create download link
        const url = URL.createObjectURL(result.data as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting ideas:', error)
    }
  }

  const handleShowSimilarVideos = (idea: any) => {
    setSelectedIdea(idea)
    setShowSimilarVideos(true)
  }

  const backToWorkshop = () => {
    setPhase('workshop')
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
  }

  const selectWorkingTitle = (title: string) => {
    setAttributes(prev => {
      if (!prev) return prev
      const updated: any = { ...prev }
      updated.workingTitle = { value: title, source: 'user_modified' }
      return updated
    })
    setHasUnscoredChanges(true)
  }

  // Build a concept payload from current attributes for Cue
  function buildCurrentConcept() {
    const a: any = attributes || {}
    return {
      title: a?.workingTitle?.value,
      description: a?.corePremise?.value,
      targetAudience: a?.targetAudience?.value,
      keyMessage: a?.keyMessageCTA?.value,
      tone: Array.isArray(a?.toneMood?.value) ? a.toneMood.value[0] : a?.toneMood?.value,
      genre: a?.genreFormat?.value,
      duration: (() => {
        const v = a?.estimatedDuration?.value
        if (!v) return undefined
        const match = String(v).match(/\d+/)
        return match ? Number(match[0]) : undefined
      })(),
    }
  }

  // Apply concept refinements from Cue back into attributes
  function applyRefinements(ref: any) {
    if (!ref) return
    setAttributes(prev => {
      if (!prev) return prev
      const updated: any = { ...prev }
      if (ref.title) updated.workingTitle = { value: ref.title, source: 'user_modified' }
      if (ref.description) updated.corePremise = { value: ref.description, source: 'user_modified' }
      if (ref.targetAudience) updated.targetAudience = { value: ref.targetAudience, source: 'user_modified' }
      if (ref.keyMessage) updated.keyMessageCTA = { value: ref.keyMessage, source: 'user_modified' }
      if (ref.tone) updated.toneMood = { value: ref.tone, source: 'user_modified' }
      if (ref.genre) updated.genreFormat = { value: ref.genre, source: 'user_modified' }
      if (ref.duration) updated.estimatedDuration = { value: String(ref.duration), source: 'user_modified' }
      return updated
    })
  }

  async function sendCueMessage(content: string) {
    if (!content.trim()) return
    setCueMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content }])
    setIsCueThinking(true)
    try {
      const conversationHistory = cueMessages.concat({ id: Date.now().toString(), role: 'user', content }).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(),
      })) as any
      const res = await fetch('/api/ideation/cue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo_user_001',
          conversationHistory,
          currentConcept: buildCurrentConcept(),
        })
      })
      if (res.ok) {
        const data = await res.json()
        const cue = data?.data
        if (cue?.message) setCueMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: cue.message }])
        if (cue?.analysis) setCueAnalysis(cue.analysis)
        if (typeof cue?.completeness_score === 'number') setCueCompleteness(cue.completeness_score)
        if (Array.isArray(cue?.suggestions)) setCueSuggestions(cue.suggestions)
        if (cue?.concept_refinements) applyRefinements(cue.concept_refinements)
      } else {
        setCueMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: 'Unable to update. Please try again.' }])
      }
    } catch (e) {
      setCueMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: 'Network error. Please try again.' }])
    } finally {
      setIsCueThinking(false)
    }
  }

  // Refresh concept attributes using iterate endpoint
  async function refreshConceptFromAttributes() {
    if (!attributes) return
    setIsRefreshingConcept(true)
    try {
      const res = await fetch('/api/concept/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Review and refine the current Core Concept attributes. Improve clarity, make language concise and impactful, fill any gaps, and ensure coherence across attributes. Keep user_modified fields but you may enhance wording. Recompute mustHaveElements with 5 actionable bullets.',
          currentAttributes: attributes
        })
      })
      if (res.ok) {
        const data: AnalysisResponse = await res.json()
        setAttributes(data.attributes)
        setWorkshopRationale(data.rationale || '')
        setHasUnscoredChanges(false)
        setScoreVersion(v => v + 1)
        computeScoreFromAttributes(data.attributes)
        // Regenerate outline variants based on updated attributes
        refreshOutline(data.attributes)
      }
    } catch (e) {
      console.warn('Refresh concept failed:', e)
    } finally {
      setIsRefreshingConcept(false)
    }
  }

  // Inspiration fetchers (outline only)
  const refreshOutline = async (attrsOverride?: any) => {
    const useAttrs = attrsOverride || attributes
    if (!useAttrs) return
    setIsLoadingOutline(true)
    try {
      const res = await fetch('/api/inspiration/outline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: useAttrs }) })
      const json = await res.json()
      if (json?.success && Array.isArray(json.outline)) setInspoOutline(json.outline)
      if (json?.success && Array.isArray(json.variants)) setOutlineVariants(json.variants)
    } finally { setIsLoadingOutline(false) }
  }

  useEffect(() => {
    if (phase === 'workshop' && attributes) { refreshOutline() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function computeScoreFromAttributes(attrs: any) {
    try {
      const conceptText = attrs?.corePremise?.value || concept
      const target = attrs?.targetAudience?.value || targetAudience
      const message = attrs?.keyMessageCTA?.value || keyMessage
      const t = Array.isArray(attrs?.toneMood?.value) ? attrs.toneMood.value[0] : (attrs?.toneMood?.value || tone)
      const s = ScoreService.score({ concept: conceptText, targetAudience: target, keyMessage: message, tone: t })
      setScoreCard({ audience: s.audience, director: s.technical })
    } catch (e) {
      // keep prior score on error
      console.warn('Score computation failed', e)
    }
  }

  function applySelectedRecommendations() {
    if (!attributes || selectedRecs.length === 0) return
    setIsApplyingRecs(true)
    try {
      const basePremise: string = (attributes as any)?.corePremise?.value || concept
      const improved = `${basePremise}\n\nIncorporate: ${selectedRecs.join('; ')}`
      setAttributes(prev => {
        if (!prev) return prev
        const updated: any = { ...prev }
        updated.corePremise = { value: improved, source: 'user_modified' }
        return updated
      })
      setHasUnscoredChanges(true)
      setSelectedRecs([])
    } finally {
      setIsApplyingRecs(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-sf-text-primary">
      {/* Project Workflow Section - Now serves as page title */}
      <div className="bg-sf-surface rounded-xl border border-sf-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-sf-gradient rounded-xl flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-sf-background" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-sf-text-primary">The Spark Studio</h1>
              <p className="text-sf-text-secondary">Step 1: Ideation & Brainstorming</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-sf-text-secondary">Mode:</div>
            <div className="flex items-center gap-1 border border-sf-border rounded-lg overflow-hidden">
              <button onClick={() => setUIMode('guided')} className={`px-2 py-1 text-sm ${uiMode==='guided' ? 'bg-sf-primary text-sf-background' : 'text-sf-text-secondary hover:bg-sf-surface-light'}`}>Guided</button>
              <button onClick={() => setUIMode('advanced')} className={`px-2 py-1 text-sm ${uiMode==='advanced' ? 'bg-sf-primary text-sf-background' : 'text-sf-text-secondary hover:bg-sf-surface-light'}`}>Advanced</button>
            </div>
            <span className="text-sm text-sf-text-secondary">Step 1 of 4</span>
          </div>
        </div>
        <p className="text-sf-text-secondary mb-4">Develop your video concept and creative direction</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-sf-surface-light rounded-full h-2">
          <div 
            className="bg-sf-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${stepProgress?.ideation || 0}%` }}
          ></div>
        </div>
        <div className="mt-2 text-base text-sf-text-secondary">
          {stepProgress?.ideation || 0}% Complete
        </div>

        {isGeneratingIdeas && (
          <div className="mt-4">
            <div className="text-sm text-sf-text-secondary mb-1">Generating ideas… {generationProgress}%</div>
            <div className="w-full bg-sf-surface-light rounded-full h-2">
              <div className="h-2 rounded-full bg-sf-accent transition-all duration-200" style={{ width: `${generationProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Three-phase layout */}
      {phase === 'spark' && (
        <div className="bg-sf-surface rounded-xl border border-sf-border p-8 shadow-md">
          <h3 className="text-lg font-semibold text-sf-text-primary mb-3 flex items-center"><Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />The Spark</h3>
            <textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            placeholder="Describe the video you want to create. You can be brief or detailed."
            rows={8}
            className="w-full p-4 border border-sf-border rounded-lg bg-sf-surface-light text-sf-text-primary placeholder-sf-text-secondary focus:ring-2 focus:ring-sf-primary focus:border-sf-primary text-lg"
          />
          <div className="mt-4 flex items-center justify-end">
            <Button className="bg-sf-primary hover:shadow-sf-glow" onClick={generateFromCurrentConcept} disabled={isAnalyzing}>
              {isAnalyzing ? 'Analyzing…' : 'Analyze & Refine'}
            </Button>
          </div>
        </div>
      )}

      {phase === 'workshop' && (
        <div className="flex flex-col gap-6">
          <WorkshopCard
            uiMode={uiMode}
            attributes={attributes}
            setAttributes={setAttributes as any}
            isRefreshingConcept={isRefreshingConcept}
            refreshConceptFromAttributes={refreshConceptFromAttributes}
            isAutoPopulatingMustHaves={isAutoPopulatingMustHaves}
            setHasUnscoredChanges={setHasUnscoredChanges}
            showWorkshop={showWorkshop}
            setShowWorkshop={setShowWorkshop as any}
          />
          <ScoreCard
            uiMode={uiMode}
            scores={scores}
            scoreCard={scoreCard}
            cueAnalysis={cueAnalysis}
            hasUnscoredChanges={hasUnscoredChanges}
            showScoreCard={showScoreCard}
            setShowScoreCard={setShowScoreCard as any}
            attributes={attributes}
          />
          <CoreConceptCard
            attributes={attributes}
            workshopRationale={workshopRationale}
            showConceptAnalysis={showConceptAnalysis}
            setShowConceptAnalysis={setShowConceptAnalysis as any}
            scores={scores}
            selectedRecs={selectedRecs}
            setSelectedRecs={setSelectedRecs as any}
            isApplyingRecs={isApplyingRecs}
            applySelectedRecommendations={applySelectedRecommendations}
            inspoOutline={inspoOutline}
            outlineVariants={outlineVariants}
            selectedOutlineIdx={selectedOutlineIdx}
            setSelectedOutlineIdx={(i:number)=>setSelectedOutlineIdx(i)}
            collapsedOutlines={collapsedOutlines}
            setCollapsedOutlines={setCollapsedOutlines as any}
            isLoadingOutline={isLoadingOutline}
            refreshOutline={()=>refreshOutline()}
            showCoreConcept={showCoreConcept}
            setShowCoreConcept={setShowCoreConcept as any}
            handleShareCoreConcept={handleShareCoreConcept}
            GenerateStoryboardButton={<GenerateStoryboardButton />}
          />
          
          {/* Storyboard Readiness Card - Eliminates Blank Canvas Paralysis */}
          <StoryboardReadinessCard />
        </div>
      )}

      {phase === 'blueprint' && (
        <div ref={ideasRef} className="bg-sf-surface rounded-xl border border-sf-border p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-sf-text-primary">Selected Concepts</h3>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" onClick={backToWorkshop} className="text-sf-text-secondary hover:text-sf-text-primary"><ArrowLeft className="w-4 h-4 mr-2"/>Back to Workshop</Button>
              <Button variant="secondary" size="sm" onClick={handleShareIdeas} className="border-sf-border text-sf-text-secondary hover:text-sf-text-primary"><Share2 className="w-4 h-4 mr-2"/>Share</Button>
              <Button variant="secondary" size="sm" onClick={handleExportIdeas} className="border-sf-border text-sf-text-secondary hover:text-sf-text-primary"><Download className="w-4 h-4 mr-2"/>Export</Button>
            </div>
          </div>
          <p className="text-sm text-sf-text-secondary mb-6">Select your preferred direction. Click a card to view outline and style notes.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generatedIdeas.map((idea:any, idx:number)=> (
              <div key={idea.id || idx} className={`rounded-lg border p-4 cursor-pointer transition-colors ${selectedIdea?.id===idea.id ? 'border-sf-primary bg-sf-surface-light' : 'border-sf-border bg-sf-surface-light hover:border-sf-primary/50'}`} onClick={()=>setSelectedIdea(idea)}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sf-text-primary">{idea.hookTitle || idea.title}</h4>
                  <div className="flex items-center gap-1 text-sm text-sf-text-secondary">
                    <Star className="w-4 h-4 text-yellow-400 fill-current"/>
                    {(idea.strength_rating?.toFixed?.(1)) || '4.0'}/5
                  </div>
                </div>
                <div className="text-sm text-sf-text-secondary mb-2">{idea.logline || idea.synopsis}</div>
                <div className="text-sm text-sf-text-secondary">{idea.detailedSynopsis?.slice?.(0,120) || ''}</div>
                {selectedIdea?.id===idea.id && (
                  <div className="mt-3 text-sm text-sf-text-secondary space-y-2">
                    {idea.sequentialOutline?.length ? (
                      <div>
                        <div className="font-medium text-sf-text-primary mb-1">Sequential Outline</div>
                        <ol className="list-decimal ml-5 space-y-1">
                          {idea.sequentialOutline.map((s:any, i:number)=> (
                            <li key={i}>{s.action || s}</li>
                          ))}
                        </ol>
                      </div>
                    ) : idea.scene_outline ? (
                      <div>
                        <div className="font-medium text-sf-text-primary mb-1">Sequential Outline</div>
                        <ol className="list-decimal ml-5 space-y-1">
                          {idea.scene_outline.map((s:string, i:number)=> (<li key={i}>{s}</li>))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-end">
                  <Button size="sm" className="bg-sf-primary" onClick={()=>handleSelectAndIterate(idea)}>Select & Iterate</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

      {/* Action Bar */}
      <div className="bg-sf-surface rounded-xl border border-sf-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="secondary" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Progress
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" className="text-sf-text-secondary hover:text-sf-text-primary">
                Back to Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-base text-sf-text-secondary">Progress: 25%</span>
            <Button onClick={handleNextStep} className="bg-sf-primary hover:shadow-sf-glow">
              Next Step
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GenerateStoryboardButton() {
  const router = useRouter()
  const { currentProject, generateStoryboardFromCore } = useEnhancedStore() as any
  const [loading, setLoading] = useState(false)
  return (
    <Button
      size="sm"
      className="bg-sf-primary hover:shadow-sf-glow"
      onClick={async ()=>{
        if (!currentProject) return
        setLoading(true)
        const ok = await generateStoryboardFromCore(currentProject.id)
        setLoading(false)
        if (ok) router.push('/dashboard/workflow/storyboard')
      }}
      disabled={loading}
    >
      {loading ? 'Generating…' : 'Generate Storyboard'}
    </Button>
  )
}

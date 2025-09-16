'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/Card';
import { Lightbulb, Sparkles, Users, Clock, Target, Palette, Zap, Clapperboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { useStore } from '@/store/useStore';
// ProvenanceBanner removed from UI per request

// Prevent duplicate concurrent requests and accidental rapid repeats
const __inflight: Map<string, Promise<Response>> = new Map();
let __lastKey = '';
let __lastAt = 0;
async function postOnce(url: string, body: any): Promise<Response | undefined> {
  const key = `${url}:${JSON.stringify(body)}`;
  const now = Date.now();
  if (__inflight.has(key)) return __inflight.get(key);
  if (key === __lastKey && now - __lastAt < 4000) return undefined; // 4s cooldown for same payload
  const p = fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).finally(() => { __inflight.delete(key); __lastKey = key; __lastAt = Date.now(); }) as Promise<Response>;
  __inflight.set(key, p);
  return p;
}

async function postWithTimeout(url: string, body: any, timeoutMs = 180000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
      keepalive: true
    });
  } finally {
    clearTimeout(t);
  }
}

// Project Idea Interface
interface Character {
  name: string;
  role: string;
  description: string;
  importance: string;
  arc?: string;
}

interface Beat {
  beat_number: number;
  beat_title: string;
  beat_description: string;
  duration_estimate: string;
  key_elements: string[];
}

interface Act {
  title: string;
  duration: string;
  beats: Beat[];
}

interface ActStructure {
  act_1: Act;
  act_2: Act;
  act_3: Act;
}

// Dynamic acts to support 3, 5, Debate, etc.
interface DynamicAct {
  title: string;
  duration: string;
  beats: Beat[];
}

interface ProjectIdea {
  id: string;
  title: string;
  synopsis: string;
  film_treatment: string;
  narrative_structure: string;
  characters: Character[];
  act_structure: ActStructure;
  dynamic_acts?: DynamicAct[];
  thumbnail_prompt: string;
  strength_rating: number;
  audience_analysis?: string;
  // Legacy fields for backward compatibility
  details: {
    genre: string;
    duration: string;
    targetAudience: string;
    keyThemes: string;
    characterCount: string;
    tone: string;
    setting: string;
  };
  actStructure: {
    act1: string;
    act2: string;
    act3: string;
  };
  outline: string[];
  logline: string;
  beat_outline: Beat[]; // Keep for backward compatibility
}

export default function ProjectIdeaTab() {
  const { guide, initializeProject } = useGuideStore();
  const { invokeCue, setSidebarVisibility } = useCue();
  const { addProject, setCurrentProject } = useStore();
  const router = useRouter();
  const [projectDescription, setProjectDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [genProgress, setGenProgress] = useState<number>(0);
  const [genStatus, setGenStatus] = useState<string>('');
  const [projectDetails, setProjectDetails] = useState({
    genre: '',
    duration: '',
    targetAudience: '',
    keyThemes: '',
    characterCount: '',
    tone: '',
    setting: ''
  });
  const [generatedIdeas, setGeneratedIdeas] = useState<ProjectIdea[]>([]);
  const [genError, setGenError] = useState<string>('');
  // Direction/Storyboard will be triggered later in the workflow. Avoid auto-queuing here.
  const [selectedIdea, setSelectedIdea] = useState<ProjectIdea | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [collaborationLink, setCollaborationLink] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [collaborationResults, setCollaborationResults] = useState<any>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [showGuideCard, setShowGuideCard] = useState(false);
  const [showCollaborationSection, setShowCollaborationSection] = useState(false);
  const [apiDebug, setApiDebug] = useState<{ api?: string; provider?: string; model?: string; timestamp?: string } | null>(null);

  // Hide Cue CoPilot when Project Idea tab is active
  useEffect(() => {
    setSidebarVisibility(false);
    return () => {
      // Re-enable sidebar when leaving this tab
      setSidebarVisibility(true);
    };
  }, [setSidebarVisibility]);

  // Listen for Flow "apply idea" actions from the sidebar
  useEffect(() => {
    const handler = (e: any) => {
      const improved = e?.detail?.improved as string;
      if (improved && typeof improved === 'string') {
        setProjectDescription(improved);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('flow.applyIdeaInput', handler as EventListener);
      return () => window.removeEventListener('flow.applyIdeaInput', handler as EventListener);
    }
  }, []);

  const generateProjectIdeas = async () => {
    if (!projectDescription.trim()) {
      setGenError('Enter a short topic or a brief storyline to begin.');
      return;
    }

    // Heuristics to classify and validate input quality before API call
    const classifyInput = (text: string): 'topic' | 'story' => {
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const hasSceneHeaders = /(INT\.|EXT\.|Scene\s+\d+)/i.test(text);
      const hasCharacterDialogue = /\b[A-Z][A-Z\s]{2,15}:/.test(text);
      const hasActMarkers = /\bAct\s*\d\b/i.test(text);
      const hasMultipleSentences = /[\.!?][\s\S]+?[\.!?]/.test(text);
      if (hasSceneHeaders || hasCharacterDialogue || hasActMarkers || (wordCount > 25 && hasMultipleSentences)) return 'story';
      if (wordCount < 15) return 'topic';
      return hasMultipleSentences ? 'story' : 'topic';
    };

    // Do not block on pre-validation; infer mode heuristically and continue
    const inputMode = classifyInput(projectDescription);
    setGenError('');
    setIsGeneratingIdeas(true);
    setGenProgress(10);
    setGenStatus(inputMode === 'topic' ? 'Generating Project Ideas' : 'Generating Film Treatment');
    try {
      setGenError('');
      // Call v1 Blueprint API
      console.log('🚀 Calling Blueprint API with project description:', projectDescription);
      console.log('🚀 API Endpoint: /api/v2/blueprint/analyze/');
      setGenProgress(20);
      const baseBody = {
        input: projectDescription,
        targetAudience: 'General Audience',
        keyMessage: projectDescription,
        tone: 'Professional',
        platform: 'Multi-platform',
        variantHint: inputMode as 'topic' | 'story',
        variants: 3,
        detailMode: 'narrative'
      };
      let response: Response
      let reducedTried = false
      try {
        // Try v3 simplified pipeline first (explicitly request 3 variants)
        response = await postWithTimeout('/api/v3/blueprint/analyze/', { input: projectDescription, variants: 3 }, 180000)
      } catch (e) {
        // Fallback to v2, then v1
        console.warn('v3 blueprint aborted or failed, falling back to v2:', e)
        try {
          response = await postWithTimeout('/api/v2/blueprint/analyze/', baseBody, 180000)
        } catch (e2) {
          console.warn('v2 blueprint aborted or failed, falling back to v1:', e2)
          response = await postWithTimeout('/api/v1/blueprint/analyze/', baseBody, 180000)
        }
      }
      if (!response) {
        setIsGeneratingIdeas(false);
        return;
      }

      console.log('🚀 API Response Status:', response.status, response.ok);
      
      if (!response.ok) {
        const raw = await response.text();
        const is429 = response.status === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(raw);
        if (is429) {
          if (!reducedTried && (baseBody as any).variants > 1) {
            reducedTried = true
            await new Promise(r => setTimeout(r, 1000 + Math.floor(Math.random()*600)))
            const lighter = { ...baseBody, variants: 1 }
            try {
              const retry = await postWithTimeout('/api/v2/blueprint/analyze/', lighter, 180000)
              if (retry.ok) {
                response = retry
              } else {
                setGenError('Rate limit exceeded. Please wait a minute and try again.');
                setIsGeneratingIdeas(false);
                return;
              }
            } catch {
              setGenError('Rate limit exceeded. Please wait a minute and try again.');
              setIsGeneratingIdeas(false);
              return;
            }
          } else {
            setGenError('Rate limit exceeded. Please wait a minute and try again.');
            setIsGeneratingIdeas(false);
            return;
          }
        } else {
          // Try v1 once as a fallback
          const v1 = await postWithTimeout('/api/v1/blueprint/analyze/', baseBody, 180000);
          if (v1 && v1.ok) {
            response = v1;
          } else {
            setGenError(
              inputMode === 'topic'
                ? "We couldn't generate ideas from that topic. Add a bit more context (goal, audience, tone) and try again."
                : "We couldn't analyze your storyline. Add 1–2 sentences of plot and characters, then try again."
            );
            setIsGeneratingIdeas(false);
            return;
          }
        }
      }

      // Surface debug headers
      const apiHeader = response.headers.get('x-sf-api');
      const providerHeader = response.headers.get('x-sf-provider');
      const modelHeader = response.headers.get('x-sf-model');
      console.log('🧪 Headers → x-sf-api:', apiHeader, 'provider:', providerHeader, 'model:', modelHeader);
      const data = await response.json();
      const debugPayload = (data as any).debug || {};
      console.log('🧪 Debug payload:', debugPayload);
      setApiDebug({
        api: apiHeader || debugPayload.api,
        provider: providerHeader || debugPayload.provider,
        model: modelHeader || debugPayload.model,
        timestamp: debugPayload.timestamp || new Date().toISOString()
      });
      console.log('✅ Blueprint API response received:', data);
      console.log('✅ Response structure:', Object.keys(data));
      setGenProgress(60);
      setGenStatus('Building ideas');
      
      if (!data.success || !data.data) {
        console.error('Invalid Blueprint API response:', data);
        setGenError(inputMode === 'topic'
          ? 'No ideas returned yet. Add a little more context (goal, audience, tone) or try again to get 4 directions.'
          : 'No treatment returned yet. Add a touch more detail (characters, conflict) and try again.');
        return;
      }

      // Support v3 (single object) and v2 (single or batch)
      const blueprints: any[] = Array.isArray(data.data) ? data.data : [data.data];
      const blueprint = blueprints[0];
      const treatment = blueprint.treatment || {};
      const projectInfo = (treatment as any).project_info || {};
      const deriveTitle = (log: string) => {
        if (!log) return 'Untitled Project';
        const cleaned = log.replace(/^[\"\s]+|[\"\s]+$/g, '');
        const words = cleaned.split(/\s+/).slice(0, 8).join(' ');
        return words.endsWith('.') ? words.slice(0, -1) : words;
      };
      const audienceAnalysis = (() => {
        const ta = (treatment as any)?.target_audience
        const toneArr = Array.isArray((treatment as any)?.tone_style)
          ? (treatment as any).tone_style
          : ((treatment as any)?.tone_style ? [(treatment as any).tone_style] : [])
        const themes = Array.isArray((treatment as any)?.themes) ? (treatment as any).themes : []
        const parts: string[] = []
        if (ta && typeof ta === 'object') {
          if (ta.primary_demographic) parts.push(String(ta.primary_demographic))
          if (ta.psychographics) parts.push(String(ta.psychographics))
          if (ta.viewing_context) parts.push(String(ta.viewing_context))
        } else if ((treatment as any)?.target_audience) {
          parts.push(String((treatment as any).target_audience))
        }
        if (toneArr.length) parts.push(`Tone: ${toneArr.join(', ')}`)
        if (themes.length) parts.push(`Themes: ${themes.join(', ')}`)
        if ((treatment as any)?.estimated_duration) parts.push(`Estimated Duration: ${(treatment as any).estimated_duration}`)
        return parts.join(' \u2022 ')
      })();
      const inferredGenre = (() => {
        const tg = (treatment as any)?.genre || (blueprint as any)?.genre
        if (Array.isArray(tg) && tg.length) return tg.join(', ')
        if (typeof tg === 'string' && tg) return tg
        if (String(blueprint.structure || '').toLowerCase().includes('documentary')) return 'Documentary'
        return 'Unspecified'
      })();
      const inferredDuration = (() => {
        if ((treatment as any)?.estimated_duration) return String((treatment as any).estimated_duration)
        if (blueprint.durationSeconds) return `${Math.round(blueprint.durationSeconds / 60)} minutes`
        return 'Unspecified'
      })();
      const inferredStructure = blueprint.structure || '3-Act Structure'
      // Build dynamic acts by grouping beats by act label and preserving order
      const dynamicActs = (() => {
        const beats: any[] = (blueprint.beats || [])
        const actMap = new Map<string, any[]>()
        for (const b of beats) {
          const key = String(b.act || 'Act 1')
          if (!actMap.has(key)) actMap.set(key, [])
          actMap.get(key)!.push(b)
        }
        const acts: DynamicAct[] = []
        for (const [actLabel, list] of actMap.entries()) {
          const first = list[0] || {}
          const seconds = first.act_duration_seconds || first.duration_seconds
          const minutes = seconds ? `${Math.round(seconds / 60)} min` : 'n/a'
          acts.push({
            title: first.act_title || actLabel,
            duration: minutes,
            beats: list.map((b: any, i: number) => ({
              beat_number: i + 1,
              beat_title: b.beat_title || b.title,
              beat_description: b.scene || b.description || (b.scene_elements?.narrative_point),
              duration_estimate: b.duration_estimate || (b.duration_seconds? `${Math.round(b.duration_seconds/60)} min` : 'n/a'),
              key_elements: b.key_elements || []
            }))
          })
        }
        return acts
      })()

      let ideas: ProjectIdea[] = [
        {
          id: 'blueprint-1',
          title: projectInfo.title || (blueprint as any).title || deriveTitle(blueprint.logline) || 'Generated Concept',
          synopsis: blueprint.synopsis,
          film_treatment: 'A concise treatment will be expanded in the Film Treatment step.',
          narrative_structure: inferredStructure,
          characters: (() => {
            const base: Character[] = (blueprint.characters || []).map((c: any) => ({
              name: c.name,
              role: c.role,
              description: c.description,
              importance: 'Medium'
            }));
            const mains: any[] = (((treatment as any).character_breakdown || {}).main) || [];
            const supporting: any[] = (((treatment as any).character_breakdown || {}).supporting) || [];
            if (Array.isArray(mains)) {
              for (const m of mains) {
                const idx = base.findIndex(x => x.name.toLowerCase() === String(m.name || '').toLowerCase());
                if (idx >= 0) {
                  base[idx] = { ...base[idx], arc: m.arc || (Array.isArray(m.motivations) ? m.motivations.join('; ') : m.motivations) };
                } else if (m.name) {
                  base.push({ name: m.name, role: m.role || 'Supporting', description: m.description || '', importance: 'Medium', arc: m.arc || (Array.isArray(m.motivations) ? m.motivations.join('; ') : m.motivations) });
                }
              }
            }
            if (Array.isArray(supporting)) {
              for (const s of supporting) {
                if (!s?.name) continue
                const exists = base.some(x => x.name.toLowerCase() === String(s.name).toLowerCase())
                if (!exists) base.push({ name: s.name, role: s.role || 'Supporting', description: s.description || '', importance: 'Low' })
              }
            }
            return base;
          })(),
          act_structure: {
            act_1: { title: ((blueprint.beats||[]).find((b:any)=>/Act\s*1/i.test(b.act)||/Opening|Setup/i.test(b.act))?.act_title) || 'Act 1', duration: (()=>{const s=(blueprint.beats||[]).find((b:any)=>/Act\s*1/i.test(b.act)||/Opening|Setup/i.test(b.act))?.act_duration_seconds || (blueprint.beats||[]).find((b:any)=>/Act\s*1/i.test(b.act)||/Opening|Setup/i.test(b.act))?.duration_seconds;return s?`${Math.round(s/60)} min`: 'n/a'})(), beats: (blueprint.beats || []).filter((b: any) => /Act\s*1/i.test(b.act) || /Opening|Setup/i.test(b.act)).map((b: any, i: number) => ({ beat_number: i+1, beat_title: b.beat_title || b.title, beat_description: (b.scene_elements?.narrative_point) || b.description, duration_estimate: (b.duration_estimate || (b.duration_seconds? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: b.key_elements || [] })) },
            act_2: { title: ((blueprint.beats||[]).find((b:any)=>/Act\s*2/i.test(b.act)||/Development|Arguments/i.test(b.act))?.act_title) || 'Act 2', duration: (()=>{const s=(blueprint.beats||[]).find((b:any)=>/Act\s*2/i.test(b.act)||/Development|Arguments/i.test(b.act))?.act_duration_seconds || (blueprint.beats||[]).find((b:any)=>/Act\s*2/i.test(b.act)||/Development|Arguments/i.test(b.act))?.duration_seconds;return s?`${Math.round(s/60)} min`: 'n/a'})(), beats: (blueprint.beats || []).filter((b: any) => /Act\s*2/i.test(b.act) || /Development|Arguments/i.test(b.act)).map((b: any, i: number) => ({ beat_number: i+1, beat_title: b.beat_title || b.title, beat_description: (b.scene_elements?.narrative_point) || b.description, duration_estimate: (b.duration_estimate || (b.duration_seconds? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: b.key_elements || [] })) },
            act_3: { title: ((blueprint.beats||[]).find((b:any)=>/Act\s*3/i.test(b.act)||/Resolution|Closing/i.test(b.act))?.act_title) || 'Act 3', duration: (()=>{const s=(blueprint.beats||[]).find((b:any)=>/Act\s*3/i.test(b.act)||/Resolution|Closing/i.test(b.act))?.act_duration_seconds || (blueprint.beats||[]).find((b:any)=>/Act\s*3/i.test(b.act)||/Resolution|Closing/i.test(b.act))?.duration_seconds;return s?`${Math.round(s/60)} min`: 'n/a'})(), beats: (blueprint.beats || []).filter((b: any) => /Act\s*3/i.test(b.act) || /Resolution|Closing/i.test(b.act)).map((b: any, i: number) => ({ beat_number: i+1, beat_title: b.beat_title || b.title, beat_description: (b.scene_elements?.narrative_point) || b.description, duration_estimate: (b.duration_estimate || (b.duration_seconds? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: b.key_elements || [] })) },
          },
          beat_outline: (blueprint.beats || []).map((b: any, i: number) => ({ beat_number: i+1, beat_title: b.beat_title || b.title, beat_description: (b.scene || b.scene_elements?.narrative_point)|| b.description, duration_estimate: (b.duration_estimate || (b.duration_seconds? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: b.key_elements || [] })),
          thumbnail_prompt: 'An engaging thumbnail representing the concept.',
          strength_rating: 4.0,
          dynamic_acts: dynamicActs,
          audience_analysis: audienceAnalysis,
          details: {
            genre: inferredGenre,
            duration: inferredDuration,
            targetAudience: (typeof (treatment as any)?.target_audience === 'object' && (treatment as any)?.target_audience?.primary_demographic)
              ? String((treatment as any).target_audience.primary_demographic)
              : ((blueprint as any)?.audience?.primary_demographic || 'General Audience'),
            keyThemes: (blueprint.coreThemes || []).join(', '),
            characterCount: `${(blueprint.characters || []).length} characters`,
            tone: Array.isArray((treatment as any)?.tone_style)
              ? (treatment as any).tone_style.join(', ')
              : (Array.isArray((blueprint as any)?.tone) ? (blueprint as any).tone.join(', ') : ((treatment as any)?.tone_style || 'Professional')),
            setting: 'Various locations'
          },
          actStructure: { act1: 'Setup', act2: 'Development', act3: 'Resolution' },
          outline: (blueprint.beats || []).map((b: any) => b.title),
          logline: blueprint.logline
        }
      ]

      // Classify input clarity by simple heuristics: presence of named characters and lengthy beats/synopsis
      const hasNamedCharacters = (Array.isArray(blueprint.characters) && blueprint.characters.some((c:any)=>c.name && /[A-Za-z]/.test(c.name))) ||
        !!(((treatment as any).character_breakdown||{}).main||[]).length
      const synopsisWords = String(blueprint.synopsis||'').split(/\s+/).length
      const isStoryLike = hasNamedCharacters && synopsisWords > 20

      // If API returned batch variants, append them directly (skip client-parallelism)
      try {
        if (blueprints.length > 1) {
          for (let i = 1; i < blueprints.length; i++) {
            const vb = blueprints[i]
          const vt = vb.treatment || {}
          const vProjectInfo = (vt as any).project_info || {}
          const vAudience = (() => {
            const parts: string[] = []
            if ((vt as any).target_audience) parts.push(String((vt as any).target_audience))
            if ((vt as any).tone_style) parts.push(`Tone/Style: ${(vt as any).tone_style}`)
            if (Array.isArray((vt as any).themes) && (vt as any).themes.length) parts.push(`Themes: ${(vt as any).themes.join(', ')}`)
            if ((vt as any).estimated_duration) parts.push(`Estimated Duration: ${(vt as any).estimated_duration}`)
            return parts.join(' \u2022 ')
          })()
          const vIdea: ProjectIdea = {
            id: `blueprint-variant-${i+1}`,
            title: vProjectInfo.title || deriveTitle(vb.logline) || 'Generated Concept',
            synopsis: vb.synopsis,
            film_treatment: 'A concise treatment will be expanded in the Film Treatment step.',
            narrative_structure: vb.structure || '3-Act Structure',
            characters: (vb.characters || []).map((c: any) => ({ name: c.name, role: c.role, description: c.description, importance: 'Medium' })),
            act_structure: {
              act_1: { title: ((vb.beats || []).find((b: any) => /Act\s*1/i.test(b.act) || /Opening|Setup/i.test(b.act))?.act_title) || 'Act 1', duration: (() => { const s = (vb.beats || []).find((b: any) => /Act\s*1/i.test(b.act) || /Opening|Setup/i.test(b.act))?.act_duration_seconds; return s ? `${Math.round(s / 60)} min` : 'n/a' })(), beats: (vb.beats || []).filter((b: any) => /Act\s*1/i.test(b.act) || /Opening|Setup/i.test(b.act)).map((b: any, i: number) => ({ beat_number: i + 1, beat_title: (b.beat_title || b.title), beat_description: (b.scene || b.description), duration_estimate: (b.duration_estimate || (b.duration_seconds ? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: (b.key_elements || []) })) },
              act_2: { title: ((vb.beats || []).find((b: any) => /Act\s*2/i.test(b.act) || /Development|Arguments/i.test(b.act))?.act_title) || 'Act 2', duration: (() => { const s = (vb.beats || []).find((b: any) => /Act\s*2/i.test(b.act) || /Development|Arguments/i.test(b.act))?.act_duration_seconds; return s ? `${Math.round(s / 60)} min` : 'n/a' })(), beats: (vb.beats || []).filter((b: any) => /Act\s*2/i.test(b.act) || /Development|Arguments/i.test(b.act)).map((b: any, i: number) => ({ beat_number: i + 1, beat_title: (b.beat_title || b.title), beat_description: (b.scene || b.description), duration_estimate: (b.duration_estimate || (b.duration_seconds ? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: (b.key_elements || []) })) },
              act_3: { title: ((vb.beats || []).find((b: any) => /Act\s*3/i.test(b.act) || /Resolution|Closing/i.test(b.act))?.act_title) || 'Act 3', duration: (() => { const s = (vb.beats || []).find((b: any) => /Act\s*3/i.test(b.act) || /Resolution|Closing/i.test(b.act))?.act_duration_seconds || (vb.beats || []).find((b:any)=>/Act\s*3/i.test(b.act) || /Resolution|Closing/i.test(b.act))?.duration_seconds; return s ? `${Math.round(s / 60)} min` : 'n/a' })(), beats: (vb.beats || []).filter((b: any) => /Act\s*3/i.test(b.act) || /Resolution|Closing/i.test(b.act)).map((b: any, i: number) => ({ beat_number: i + 1, beat_title: (b.beat_title || b.title), beat_description: (b.scene || b.description), duration_estimate: (b.duration_estimate || (b.duration_seconds ? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: (b.key_elements || []) })) },
            },
            beat_outline: (vb.beats || []).map((b: any, i: number) => ({ beat_number: i + 1, beat_title: (b.beat_title || b.title), beat_description: (b.scene || b.description), duration_estimate: (b.duration_estimate || (b.duration_seconds ? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: [] })),
            thumbnail_prompt: 'An engaging thumbnail representing the concept.',
            strength_rating: 4.0,
            dynamic_acts: (() => {
              const beats: any[] = (vb.beats || [])
              const actMap = new Map<string, any[]>()
              for (const b of beats) { const key = String(b.act || 'Act 1'); if (!actMap.has(key)) actMap.set(key, []); actMap.get(key)!.push(b) }
              const acts: DynamicAct[] = []
              for (const [actLabel, list] of actMap.entries()) {
                const first = list[0] || {}
                const minutes = first.act_duration_seconds ? `${Math.round(first.act_duration_seconds / 60)} min` : (first.duration_seconds ? `${Math.round(first.duration_seconds/60)} min` : 'n/a')
                acts.push({ title: first.act_title || actLabel, duration: minutes, beats: list.map((b: any, i: number) => ({ beat_number: i + 1, beat_title: (b.beat_title || b.title), beat_description: (b.scene || b.description), duration_estimate: (b.duration_estimate || (b.duration_seconds ? `${Math.round(b.duration_seconds/60)} min` : 'n/a')), key_elements: (b.key_elements || []) })) })
              }
              return acts
            })(),
            audience_analysis: vAudience,
            details: {
              genre: vb.genre || 'Unspecified',
              duration: vb.durationSeconds ? `${Math.round(vb.durationSeconds / 60)} minutes` : 'Unspecified',
              targetAudience: 'General Audience',
              keyThemes: (vb.coreThemes || []).join(', '),
              characterCount: `${(vb.characters || []).length} characters`,
              tone: 'Professional',
              setting: 'Various locations'
            },
            actStructure: { act1: 'Setup', act2: 'Development', act3: 'Resolution' },
            outline: (vb.beats || []).map((b: any) => b.title),
            logline: vb.logline
          }
            ideas.push(vIdea)
          }
        }
      } catch (e) {
        console.warn('Variant generation failed', e)
      }

      // Note: Direction and Storyboard generation are deferred until the user advances to those steps.

      // Set project details from API response
      const extractedDetails = {
        genre: inferredGenre,
        duration: inferredDuration,
        targetAudience: 'General Audience',
        keyThemes: (blueprint.coreThemes || []).join(', '),
        characterCount: `${(blueprint.characters || []).length} characters`,
        tone: 'Professional',
        setting: 'Various locations'
      };
      
      setProjectDetails(extractedDetails);
      setAnalysisComplete(true);
      setGeneratedIdeas(ideas);
      setGenProgress(100);
      setGenStatus('Done');
      
    } catch (error) {
      console.error('Error generating project ideas:', error);
      const msg = (error && (error as any).message) ? String((error as any).message) : '';
      if (/abort/i.test(msg)) {
        setGenError('Request cancelled.');
      } else if (/429|rate limit|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
        setGenError('Rate limit exceeded. Please wait a minute and try again.');
      } else {
        setGenError('Unexpected error during generation.');
      }
      setIsGeneratingIdeas(false);
      return;
      
      // Fallback to contextual mock data if API fails
      const contextualIdeas: ProjectIdea[] = [
        {
          id: '1',
          title: `${projectDescription.split(' ').slice(0, 2).join(' ')} Success Story`,
          synopsis: `A compelling narrative exploring ${projectDescription.toLowerCase()}, showcasing the journey, challenges, and ultimate success in mastering this skill.`,
          film_treatment: `This documentary-style video will take viewers on an inspiring journey through the world of ${projectDescription.toLowerCase()}. Using a combination of personal storytelling, expert interviews, and practical demonstrations, the film will explore both the challenges and rewards of mastering this skill. The visual style will be warm and inviting, with close-up shots of hands working, ingredients being prepared, and the final results. The tone will be educational yet inspiring, making complex concepts accessible to a general audience.`,
          narrative_structure: 'Documentary Structure',
          characters: [
            {
              name: 'Main Subject',
              role: 'Protagonist',
              description: 'The central character whose journey from beginner to expert drives the narrative. This person represents the audience\'s potential transformation.',
              importance: 'High'
            },
            {
              name: 'Expert Mentor',
              role: 'Supporting',
              description: 'An experienced practitioner who provides guidance, tips, and historical context throughout the journey.',
              importance: 'Medium'
            },
            {
              name: 'Narrator',
              role: 'Narrator',
              description: 'A warm, knowledgeable voice that guides viewers through the process and provides educational context.',
              importance: 'Medium'
            }
          ],
          act_structure: {
            act_1: {
              title: 'Setup and Introduction',
              duration: '12 minutes',
              beats: [
                {
                  beat_number: 1,
                  beat_title: 'Opening Hook',
                  beat_description: `Start with a stunning visual of the final result - a perfect example of ${projectDescription.toLowerCase()}. This creates immediate intrigue and shows viewers what they can achieve. Use close-up shots of hands working with ingredients, the sizzling sounds, and the beautiful final presentation.`,
                  duration_estimate: '3 minutes',
                  key_elements: ['Visual hook', 'Final result showcase', 'Audience engagement', 'Sensory details']
                },
                {
                  beat_number: 2,
                  beat_title: 'The Challenge',
                  beat_description: 'Introduce the main subject as they face the initial challenges and frustrations of learning this skill. Show the common mistakes and obstacles with authentic reactions and struggles. Include failed attempts, burnt ingredients, and the emotional journey of learning.',
                  duration_estimate: '4 minutes',
                  key_elements: ['Character introduction', 'Problem establishment', 'Relatable struggles', 'Emotional connection']
                },
                {
                  beat_number: 3,
                  beat_title: 'Character Development',
                  beat_description: 'Deep dive into the main subject\'s background, motivations, and what drives them to master this skill. Show their personal story, family connections, and the deeper meaning behind their journey.',
                  duration_estimate: '5 minutes',
                  key_elements: ['Character backstory', 'Motivation establishment', 'Personal stakes', 'Emotional depth']
                }
              ]
            },
            act_2: {
              title: 'Rising Action and Development',
              duration: '25 minutes',
              beats: [
                {
                  beat_number: 4,
                  beat_title: 'First Attempts',
                  beat_description: 'Show the character\'s initial attempts to solve the problem, including failures and learning moments. Document the trial and error process with detailed explanations of what went wrong and why.',
                  duration_estimate: '7 minutes',
                  key_elements: ['First attempts', 'Failure analysis', 'Learning moments', 'Problem identification']
                },
                {
                  beat_number: 5,
                  beat_title: 'Mentor/Expert Introduction',
                  beat_description: 'Introduce the mentor or expert who will guide the character through their journey. Show their expertise, teaching style, and the relationship that develops between mentor and student.',
                  duration_estimate: '5 minutes',
                  key_elements: ['Mentor introduction', 'Expertise demonstration', 'Guidance establishment', 'Relationship building']
                },
                {
                  beat_number: 6,
                  beat_title: 'Training and Development',
                  beat_description: 'Detailed training sequence showing the character\'s growth and skill development. Include multiple practice sessions, technique demonstrations, and the gradual improvement over time.',
                  duration_estimate: '13 minutes',
                  key_elements: ['Skill development', 'Training montage', 'Progress tracking', 'Technique mastery']
                }
              ]
            },
            act_3: {
              title: 'Climax and Resolution',
              duration: '8 minutes',
              beats: [
                {
                  beat_number: 7,
                  beat_title: 'Final Challenge',
                  beat_description: 'The ultimate test where the character must apply everything they\'ve learned. Create a high-stakes scenario that tests all their skills and knowledge, with real consequences for success or failure.',
                  duration_estimate: '5 minutes',
                  key_elements: ['Final challenge', 'Skill application', 'Tension building', 'High stakes']
                },
                {
                  beat_number: 8,
                  beat_title: 'Resolution and Transformation',
                  beat_description: 'Show the successful outcome and the character\'s complete transformation. Include celebration, reflection on the journey, and how this skill has changed their life.',
                  duration_estimate: '3 minutes',
                  key_elements: ['Success celebration', 'Transformation completion', 'Future possibilities', 'Life impact']
                }
              ]
            }
          },
          beat_outline: [
            {
              beat_number: 1,
              beat_title: 'Opening Hook',
              beat_description: `Start with a stunning visual of the final result - a perfect example of ${projectDescription.toLowerCase()}. This creates immediate intrigue and shows viewers what they can achieve.`,
              duration_estimate: '3 minutes',
              key_elements: ['Visual hook', 'Final result showcase', 'Audience engagement']
            },
            {
              beat_number: 2,
              beat_title: 'The Challenge',
              beat_description: 'Introduce the main subject as they face the initial challenges and frustrations of learning this skill. Show the common mistakes and obstacles.',
              duration_estimate: '4 minutes',
              key_elements: ['Character introduction', 'Problem establishment', 'Relatable struggles']
            },
            {
              beat_number: 3,
              beat_title: 'The Learning Process',
              beat_description: 'Document the step-by-step learning process, including expert guidance, practice sessions, and gradual improvement.',
              duration_estimate: '13 minutes',
              key_elements: ['Educational content', 'Expert tips', 'Progress tracking']
            },
            {
              beat_number: 4,
              beat_title: 'Breakthrough Moment',
              beat_description: 'Capture the pivotal moment when everything clicks and the subject achieves their first real success.',
              duration_estimate: '5 minutes',
              key_elements: ['Emotional payoff', 'Success celebration', 'Transformation']
            },
            {
              beat_number: 5,
              beat_title: 'Mastery and Beyond',
              beat_description: 'Show the subject now confidently creating and even teaching others, demonstrating the full transformation.',
              duration_estimate: '3 minutes',
              key_elements: ['Mastery demonstration', 'Teaching others', 'Future possibilities']
            }
          ],
          thumbnail_prompt: `A warm, inviting scene showing hands confidently working with ${projectDescription.toLowerCase()} ingredients or tools, with a beautiful final result in the background. Natural lighting, cozy atmosphere, and a sense of mastery and satisfaction.`,
          strength_rating: 4.5,
          // Legacy fields for backward compatibility
          details: {
            genre: 'Documentary',
            duration: '45 minutes',
            targetAudience: 'General Audience',
            keyThemes: projectDescription,
            characterCount: '3 main characters',
            tone: 'Inspiring and educational',
            setting: 'Various locations'
          },
          actStructure: {
            act1: `Introduction to ${projectDescription.toLowerCase()} and its importance`,
            act2: 'Challenges, learning process, and key insights',
            act3: 'Success story and transformation results'
          },
          outline: [
            `Opening with ${projectDescription.toLowerCase()} demonstration`,
            'Historical context and background',
            'Current applications and techniques',
            'Personal journey and challenges',
            'Breakthrough moments and results',
            'Conclusion and call to action'
          ],
          logline: `A compelling narrative exploring ${projectDescription.toLowerCase()}, showcasing the journey, challenges, and ultimate success in mastering this skill.`
        },
        {
          id: '2',
          title: `Master ${projectDescription.split(' ').slice(0, 2).join(' ')} in 60 Seconds`,
          synopsis: `A fast-paced tutorial that breaks down ${projectDescription.toLowerCase()} into actionable steps, perfect for viewers who want quick, valuable insights.`,
          film_treatment: `This high-energy, social media optimized video will deliver maximum value in minimal time. Using rapid-fire editing, clear visual demonstrations, and engaging graphics, the film will teach viewers the essential skills of ${projectDescription.toLowerCase()} in just 60 seconds. The style will be modern and dynamic, with bold typography, quick cuts, and a vibrant color palette that keeps viewers engaged throughout. The pace will be fast but not overwhelming, ensuring information retention while maintaining entertainment value.`,
          narrative_structure: '3-Act Structure',
          characters: [
            {
              name: 'Expert Presenter',
              role: 'Protagonist',
              description: 'A confident, energetic instructor who can demonstrate techniques clearly and maintain viewer engagement throughout the rapid pace.',
              importance: 'High'
            },
            {
              name: 'Voice-Over Narrator',
              role: 'Narrator',
              description: 'A clear, upbeat voice that provides additional context and keeps the energy high during transitions.',
              importance: 'Medium'
            }
          ],
          act_structure: {
            act_1: {
              title: 'Hook and Setup',
              duration: '15 seconds',
              beats: [
                {
                  beat_number: 1,
                  beat_title: 'Attention-Grabbing Hook',
                  beat_description: 'Start with a surprising fact, statistic, or dramatic before/after comparison that immediately captures attention. Use bold graphics and energetic music.',
                  duration_estimate: '5 seconds',
                  key_elements: ['Visual hook', 'Surprising fact', 'Immediate engagement']
                },
                {
                  beat_number: 2,
                  beat_title: 'Problem & Solution Setup',
                  beat_description: 'Quickly establish the common problem and promise the solution, building anticipation for the demonstration.',
                  duration_estimate: '10 seconds',
                  key_elements: ['Problem identification', 'Solution promise', 'Audience connection']
                }
              ]
            },
            act_2: {
              title: 'Demonstration',
              duration: '35 seconds',
              beats: [
                {
                  beat_number: 3,
                  beat_title: 'Step-by-Step Demonstration',
                  beat_description: 'Show the actual process with clear, numbered steps and visual cues that make it easy to follow. Use split-screen techniques and close-ups.',
                  duration_estimate: '35 seconds',
                  key_elements: ['Clear steps', 'Visual demonstration', 'Easy to follow']
                }
              ]
            },
            act_3: {
              title: 'Results and Call to Action',
              duration: '10 seconds',
              beats: [
                {
                  beat_number: 4,
                  beat_title: 'Results & Call to Action',
                  beat_description: 'Show the impressive results and encourage viewers to try it themselves with a clear next step.',
                  duration_estimate: '10 seconds',
                  key_elements: ['Results showcase', 'Call to action', 'Motivation']
                }
              ]
            }
          },
          beat_outline: [
            {
              beat_number: 1,
              beat_title: 'Attention-Grabbing Hook',
              beat_description: 'Start with a surprising fact, statistic, or dramatic before/after comparison that immediately captures attention.',
              duration_estimate: '5-8 seconds',
              key_elements: ['Visual hook', 'Surprising fact', 'Immediate engagement']
            },
            {
              beat_number: 2,
              beat_title: 'Problem & Solution Setup',
              beat_description: 'Quickly establish the common problem and promise the solution, building anticipation for the demonstration.',
              duration_estimate: '8-12 seconds',
              key_elements: ['Problem identification', 'Solution promise', 'Audience connection']
            },
            {
              beat_number: 3,
              beat_title: 'Step-by-Step Demonstration',
              beat_description: 'Show the actual process with clear, numbered steps and visual cues that make it easy to follow.',
              duration_estimate: '30-35 seconds',
              key_elements: ['Clear steps', 'Visual demonstration', 'Easy to follow']
            },
            {
              beat_number: 4,
              beat_title: 'Results & Call to Action',
              beat_description: 'Show the impressive results and encourage viewers to try it themselves with a clear next step.',
              duration_estimate: '7-10 seconds',
              key_elements: ['Results showcase', 'Call to action', 'Motivation']
            }
          ],
          thumbnail_prompt: `A dynamic, colorful scene showing the expert presenter mid-demonstration with ${projectDescription.toLowerCase()} tools or ingredients, with bold text overlay showing "60 SECONDS" and bright, engaging colors that pop on social media feeds.`,
          strength_rating: 4.2,
          // Legacy fields for backward compatibility
          details: {
            genre: 'Educational',
            duration: '60 seconds',
            targetAudience: 'Quick learners, Social media users',
            keyThemes: projectDescription,
            characterCount: '2 characters',
            tone: 'Fast-paced and engaging',
            setting: 'Studio and practical locations'
          },
          actStructure: {
            act1: 'Hook with surprising fact or statistic',
            act2: 'Step-by-step demonstration',
            act3: 'Quick recap and call to action'
          },
          outline: [
            'Opening hook with attention-grabbing fact',
            'Present the problem and why it matters',
            'Show the solution with clear steps',
            'Quick demonstration of results',
            'Key takeaways and next steps'
          ],
          logline: `A fast-paced tutorial that breaks down ${projectDescription.toLowerCase()} into actionable steps, perfect for viewers who want quick, valuable insights.`
        },
        {
          id: '3',
          title: `${projectDescription.split(' ').slice(0, 2).join(' ')}: The Right Way vs. Wrong Way`,
          synopsis: `An engaging comparison that clearly shows the difference between effective and ineffective approaches to ${projectDescription.toLowerCase()}.`,
          film_treatment: `This educational video will use a side-by-side comparison format to demonstrate the stark differences between correct and incorrect approaches to ${projectDescription.toLowerCase()}. The visual style will be clean and professional, with split-screen demonstrations that make it easy to see the contrasts. The tone will be informative yet engaging, using humor and real-world examples to keep viewers interested while they learn. The pacing will be deliberate, giving viewers time to absorb the differences and understand the reasoning behind each approach.`,
          narrative_structure: '5-Act Structure',
          characters: [
            {
              name: 'Expert Instructor',
              role: 'Protagonist',
              description: 'A knowledgeable teacher who demonstrates both the wrong and right ways, explaining the reasoning behind each approach.',
              importance: 'High'
            },
            {
              name: 'Novice Student',
              role: 'Supporting',
              description: 'A beginner who represents the audience, making common mistakes and learning from the expert\'s guidance.',
              importance: 'Medium'
            },
            {
              name: 'Voice-Over Narrator',
              role: 'Narrator',
              description: 'A clear, educational voice that provides additional context and emphasizes key learning points.',
              importance: 'Medium'
            }
          ],
          act_structure: {
            act_1: {
              title: 'Introduction and Setup',
              duration: '18 minutes',
              beats: [
                {
                  beat_number: 1,
                  beat_title: 'Introduction to Comparison',
                  beat_description: 'Set up the format and explain why understanding both right and wrong approaches is valuable for learning.',
                  duration_estimate: '3 minutes',
                  key_elements: ['Format explanation', 'Learning objectives', 'Audience engagement']
                },
                {
                  beat_number: 2,
                  beat_title: 'Common Mistakes Demonstration',
                  beat_description: 'Show the most frequent errors people make, explaining why these approaches fail and what problems they cause.',
                  duration_estimate: '15 minutes',
                  key_elements: ['Mistake identification', 'Consequence explanation', 'Problem awareness']
                }
              ]
            },
            act_2: {
              title: 'Correct Approach and Comparison',
              duration: '25 minutes',
              beats: [
                {
                  beat_number: 3,
                  beat_title: 'Correct Approach Demonstration',
                  beat_description: 'Demonstrate the proper techniques step-by-step, explaining the reasoning behind each decision.',
                  duration_estimate: '20 minutes',
                  key_elements: ['Correct techniques', 'Reasoning explanation', 'Best practices']
                },
                {
                  beat_number: 4,
                  beat_title: 'Side-by-Side Comparison',
                  beat_description: 'Show both approaches simultaneously to highlight the dramatic differences in results and process.',
                  duration_estimate: '5 minutes',
                  key_elements: ['Visual comparison', 'Result contrast', 'Impact demonstration']
                }
              ]
            },
            act_3: {
              title: 'Conclusion and Next Steps',
              duration: '2 minutes',
              beats: [
                {
                  beat_number: 5,
                  beat_title: 'Key Takeaways and Next Steps',
                  beat_description: 'Summarize the most important lessons and provide actionable next steps for viewers to improve their skills.',
                  duration_estimate: '2 minutes',
                  key_elements: ['Summary', 'Action items', 'Continued learning']
                }
              ]
            }
          },
          beat_outline: [
            {
              beat_number: 1,
              beat_title: 'Introduction to Comparison',
              beat_description: 'Set up the format and explain why understanding both right and wrong approaches is valuable for learning.',
              duration_estimate: '3-4 minutes',
              key_elements: ['Format explanation', 'Learning objectives', 'Audience engagement']
            },
            {
              beat_number: 2,
              beat_title: 'Common Mistakes Demonstration',
              beat_description: 'Show the most frequent errors people make, explaining why these approaches fail and what problems they cause.',
              duration_estimate: '15-20 minutes',
              key_elements: ['Mistake identification', 'Consequence explanation', 'Problem awareness']
            },
            {
              beat_number: 3,
              beat_title: 'Correct Approach Demonstration',
              beat_description: 'Demonstrate the proper techniques step-by-step, explaining the reasoning behind each decision.',
              duration_estimate: '20-25 minutes',
              key_elements: ['Correct techniques', 'Reasoning explanation', 'Best practices']
            },
            {
              beat_number: 4,
              beat_title: 'Side-by-Side Comparison',
              beat_description: 'Show both approaches simultaneously to highlight the dramatic differences in results and process.',
              duration_estimate: '10-15 minutes',
              key_elements: ['Visual comparison', 'Result contrast', 'Impact demonstration']
            },
            {
              beat_number: 5,
              beat_title: 'Key Takeaways and Next Steps',
              beat_description: 'Summarize the most important lessons and provide actionable next steps for viewers to improve their skills.',
              duration_estimate: '5-7 minutes',
              key_elements: ['Summary', 'Action items', 'Continued learning']
            }
          ],
          thumbnail_prompt: `A split-screen image showing the dramatic contrast between a messy, incorrect approach to ${projectDescription.toLowerCase()} on the left and a clean, professional approach on the right, with bold text overlay saying "RIGHT vs WRONG WAY".`,
          strength_rating: 4.3,
          // Legacy fields for backward compatibility
          details: {
            genre: 'Educational',
            duration: '90 minutes',
            targetAudience: 'Beginners, Intermediate learners',
            keyThemes: projectDescription,
            characterCount: '3 characters',
            tone: 'Informative and engaging',
            setting: 'Practical demonstration locations'
          },
          actStructure: {
            act1: 'Set up the comparison scenario',
            act2: 'Show wrong way with consequences',
            act3: 'Demonstrate right way with positive outcomes'
          },
          outline: [
            'Introduction to the comparison format',
            'Demonstrate common mistakes and pitfalls',
            'Show the correct approach step by step',
            'Highlight the differences and benefits',
            'Key takeaways and best practices'
          ],
          logline: `An engaging comparison that clearly shows the difference between effective and ineffective approaches to ${projectDescription.toLowerCase()}.`
        },
        {
          id: '4',
          title: `Behind the Scenes: How We ${projectDescription.split(' ').slice(0, 3).join(' ')}`,
          synopsis: `A behind-the-scenes look at the process, people, and passion behind ${projectDescription.toLowerCase()}, building trust through authenticity.`,
          film_treatment: `This intimate, documentary-style video will take viewers behind the scenes to see the real process, challenges, and passion that goes into ${projectDescription.toLowerCase()}. The visual style will be natural and unpolished, using handheld cameras and natural lighting to create an authentic, trustworthy atmosphere. The tone will be conversational and genuine, showing both the successes and the struggles that make the process real and relatable. This approach builds trust and connection with the audience by being transparent about the actual work involved.`,
          narrative_structure: 'Documentary Structure',
          characters: [
            {
              name: 'Main Host',
              role: 'Protagonist',
              description: 'The primary guide who takes viewers through the behind-the-scenes process, sharing personal insights and experiences.',
              importance: 'High'
            },
            {
              name: 'Expert Team Member',
              role: 'Supporting',
              description: 'A skilled practitioner who provides technical insights and demonstrates advanced techniques.',
              importance: 'Medium'
            },
            {
              name: 'Production Team',
              role: 'Supporting',
              description: 'The crew members who help capture the process, adding authenticity and showing the collaborative nature of the work.',
              importance: 'Low'
            }
          ],
          act_structure: {
            act_1: {
              title: 'Team Introduction and Setup',
              duration: '8 minutes',
              beats: [
                {
                  beat_number: 1,
                  beat_title: 'Team Introduction',
                  beat_description: 'Meet the people behind the process, their backgrounds, and what drives their passion for this work.',
                  duration_estimate: '4 minutes',
                  key_elements: ['Team introduction', 'Personal stories', 'Passion explanation']
                },
                {
                  beat_number: 2,
                  beat_title: 'Mission and Goals',
                  beat_description: 'Explain the team\'s mission, what they\'re trying to achieve, and why this process matters.',
                  duration_estimate: '4 minutes',
                  key_elements: ['Mission statement', 'Goal setting', 'Purpose explanation']
                }
              ]
            },
            act_2: {
              title: 'Process and Development',
              duration: '18 minutes',
              beats: [
                {
                  beat_number: 3,
                  beat_title: 'Process Walkthrough',
                  beat_description: 'Show the actual step-by-step process, including the planning, preparation, and execution phases.',
                  duration_estimate: '10 minutes',
                  key_elements: ['Process documentation', 'Behind-the-scenes footage', 'Real-time work']
                },
                {
                  beat_number: 4,
                  beat_title: 'Challenges and Solutions',
                  beat_description: 'Be honest about the difficulties encountered and how the team problem-solves and adapts.',
                  duration_estimate: '4 minutes',
                  key_elements: ['Challenge acknowledgment', 'Problem-solving', 'Adaptation']
                },
                {
                  beat_number: 5,
                  beat_title: 'Expert Insights',
                  beat_description: 'Share professional tips, techniques, and insights that viewers can apply to their own work.',
                  duration_estimate: '4 minutes',
                  key_elements: ['Expert tips', 'Professional insights', 'Practical advice']
                }
              ]
            },
            act_3: {
              title: 'Results and Reflection',
              duration: '4 minutes',
              beats: [
                {
                  beat_number: 6,
                  beat_title: 'Results and Reflection',
                  beat_description: 'Show the final results and reflect on the journey, inviting viewers to join the community.',
                  duration_estimate: '4 minutes',
                  key_elements: ['Results showcase', 'Journey reflection', 'Community invitation']
                }
              ]
            }
          },
          beat_outline: [
            {
              beat_number: 1,
              beat_title: 'Team Introduction',
              beat_description: 'Meet the people behind the process, their backgrounds, and what drives their passion for this work.',
              duration_estimate: '4-5 minutes',
              key_elements: ['Team introduction', 'Personal stories', 'Passion explanation']
            },
            {
              beat_number: 2,
              beat_title: 'Process Walkthrough',
              beat_description: 'Show the actual step-by-step process, including the planning, preparation, and execution phases.',
              duration_estimate: '12-15 minutes',
              key_elements: ['Process documentation', 'Behind-the-scenes footage', 'Real-time work']
            },
            {
              beat_number: 3,
              beat_title: 'Challenges and Solutions',
              beat_description: 'Be honest about the difficulties encountered and how the team problem-solves and adapts.',
              duration_estimate: '6-8 minutes',
              key_elements: ['Challenge acknowledgment', 'Problem-solving', 'Adaptation']
            },
            {
              beat_number: 4,
              beat_title: 'Expert Insights',
              beat_description: 'Share professional tips, techniques, and insights that viewers can apply to their own work.',
              duration_estimate: '5-7 minutes',
              key_elements: ['Expert tips', 'Professional insights', 'Practical advice']
            },
            {
              beat_number: 5,
              beat_title: 'Results and Reflection',
              beat_description: 'Show the final results and reflect on the journey, inviting viewers to join the community.',
              duration_estimate: '3-4 minutes',
              key_elements: ['Results showcase', 'Journey reflection', 'Community invitation']
            }
          ],
          thumbnail_prompt: `A candid, behind-the-scenes moment showing the team working on ${projectDescription.toLowerCase()} with natural lighting and authentic expressions, conveying the real, unpolished process and genuine passion.`,
          strength_rating: 4.1,
          // Legacy fields for backward compatibility
          details: {
            genre: 'Behind-the-Scenes',
            duration: '30 minutes',
            targetAudience: 'Enthusiasts, Curious learners',
            keyThemes: projectDescription,
            characterCount: '3 characters',
            tone: 'Authentic and educational',
            setting: 'Real-world locations'
          },
          actStructure: {
            act1: 'Introduce the team and their mission',
            act2: 'Show the process and methodology',
            act3: 'Highlight results and impact'
          },
          outline: [
            'Team introduction and mission statement',
            'Behind-the-scenes process walkthrough',
            'Expert insights and techniques',
            'Real-world applications and results',
            'Invitation to join the journey'
          ],
          logline: `A behind-the-scenes look at the process, people, and passion behind ${projectDescription.toLowerCase()}, building trust through authenticity.`
        }
      ];
      
      setGeneratedIdeas(contextualIdeas);
      
    } finally {
      setIsGeneratingIdeas(false);
      setTimeout(() => { setGenProgress(0); setGenStatus(''); }, 900);
    }
  };



  const selectProjectIdea = (idea: ProjectIdea) => {
    setSelectedIdea(idea);
  };

  const toggleCardExpansion = (ideaId: string) => {
    const newExpandedCards = new Set(expandedCards);
    if (newExpandedCards.has(ideaId)) {
      newExpandedCards.delete(ideaId);
    } else {
      newExpandedCards.add(ideaId);
    }
    setExpandedCards(newExpandedCards);
  };

  const createCollaborationLink = async () => {
    if (generatedIdeas.length === 0) {
      alert('Please generate some project ideas first before sharing.');
      return;
    }

    setIsCreatingLink(true);
    try {
      const response = await fetch('/api/collaborate/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectDescription,
          projectIdeas: generatedIdeas,
          projectDetails: analysisComplete ? projectDetails : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create collaboration link');
      }

      const data = await response.json();
      const link = `${window.location.origin}/collaborate/${data.sessionId}`;
      setCollaborationLink(link);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(link);
      alert('Collaboration link created and copied to clipboard!');
    } catch (error) {
      console.error('Error creating collaboration link:', error);
      alert('Failed to create collaboration link. Please try again.');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const copyLinkToClipboard = async () => {
    if (collaborationLink) {
      try {
        await navigator.clipboard.writeText(collaborationLink);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link:', error);
        alert('Failed to copy link. Please try again.');
      }
    }
  };

  const fetchCollaborationResults = async (sessionId: string) => {
    try {
      setIsLoadingResults(true);
      const response = await fetch(`/api/collaborate/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setCollaborationResults(data);
      }
    } catch (error) {
      console.error('Error fetching collaboration results:', error);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // Poll for collaboration results when a link is created
  useEffect(() => {
    if (collaborationLink) {
      const sessionId = collaborationLink.split('/').pop();
      if (sessionId) {
        // Fetch immediately
        fetchCollaborationResults(sessionId);
        
        // Set up polling every 10 seconds
        const interval = setInterval(() => {
          fetchCollaborationResults(sessionId);
        }, 10000);

        return () => clearInterval(interval);
      }
    }
  }, [collaborationLink]);

  const handleCreateProject = async (idea?: ProjectIdea) => {
    const activeIdea = idea || selectedIdea
    if (!activeIdea) return;
    
    setIsGenerating(true);
    try {
      // Helper: infer beat template from selected idea/blueprint
      const inferTemplateIdFromIdea = (i: ProjectIdea): string => {
        const s = String(i.narrative_structure || '').toLowerCase();
        const numActs = Array.isArray(i.dynamic_acts) ? i.dynamic_acts.length : 0;
        if (s.includes('debate') || s.includes('educational')) return 'debate-educational';
        if (s.includes('documentary')) return 'documentary';
        if (s.includes('save the cat')) return 'save-the-cat';
        if (s.includes('hero')) return 'hero-journey';
        if (s.includes('5-act') || s.includes('5 act') || numActs >= 5) return 'five-act';
        return 'three-act';
      };

      // Helper: map human act titles to concrete template column IDs
      const mapActToColumnId = (templateId: string, actTitle: string, index: number): string => {
        const t = String(actTitle || '').toLowerCase();
        switch (templateId) {
          case 'debate-educational':
            if (t.includes('setup') || t.includes('stake')) return 'ACT_I';
            if (t.includes('argument') || t.includes('development')) return 'ACT_IIA';
            if (t.includes('balance') || t.includes('synth')) return 'ACT_IIB';
            if (t.includes('resolution') || t.includes('conclusion')) return 'ACT_III';
            return ['ACT_I', 'ACT_IIA', 'ACT_IIB', 'ACT_III'][Math.min(index, 3)];
          case 'three-act':
            return ['ACT_I', 'ACT_II', 'ACT_III'][Math.min(index, 2)];
          case 'five-act':
            return ['EXPOSITION', 'RISING_ACTION', 'CLIMAX', 'FALLING_ACTION', 'DENOUEMENT'][Math.min(index, 4)];
          case 'documentary':
            if (t.includes('hook')) return 'HOOK';
            if (t.includes('investig')) return 'INVESTIGATION';
            if (t.includes('complication') || t.includes('obstacle')) return 'COMPLICATION';
            if (t.includes('revelation') || t.includes('insight')) return 'REVELATION';
            if (t.includes('synthesis') || t.includes('conclusion')) return 'SYNTHESIS';
            return ['HOOK', 'INVESTIGATION', 'COMPLICATION', 'REVELATION', 'SYNTHESIS'][Math.min(index, 4)];
          case 'hero-journey':
            return ['ORDINARY_WORLD', 'CALL_ADVENTURE', 'SPECIAL_WORLD', 'ORDEAL', 'REWARD', 'RETURN'][Math.min(index, 5)];
          case 'save-the-cat':
            return ['SETUP', 'CATALYST', 'DEBATE', 'FUN_GAMES', 'MIDPOINT', 'BAD_GUYS', 'DARK_NIGHT', 'FINALE'][Math.min(index, 7)];
          default:
            return 'ACT_I';
        }
      };

      const templateId = inferTemplateIdFromIdea(activeIdea);
      // Build structured Film Treatment JSON for clean UX rendering
      const treatmentPayload = {
        title: activeIdea.title,
        logline: activeIdea.logline || '',
        synopsis: activeIdea.synopsis || '',
        targetAudience: activeIdea.details?.targetAudience || '',
        genre: activeIdea.details?.genre || '',
        duration: activeIdea.details?.duration || '',
        themes: activeIdea.details?.keyThemes || '',
        structure: activeIdea.narrative_structure || '3-Act Structure'
      };
      const comprehensiveDescription = JSON.stringify(treatmentPayload);

      // Build store from selected idea
      let mappedCharacters = (activeIdea.characters || []).map((c, idx) => ({
        id: `char-${idx}-${Date.now()}`,
        name: c.name,
        archetype: c.role || 'Character',
        motivation: c.description || '',
        internalConflict: '',
        externalConflict: '',
        arc: {
          act1: typeof c.arc === 'string' ? c.arc : '',
          act2: '',
          act3: ''
        }
      }));

      // Fallback: ensure at least one character exists so Characters tab is populated
      if (!mappedCharacters.length) {
        const nowId = `${Date.now()}`;
        mappedCharacters = [
          {
            id: `char-protagonist-${nowId}`,
            name: 'Protagonist',
            archetype: 'Protagonist',
            motivation: activeIdea.logline || 'Lead character pursuing a meaningful goal.',
            internalConflict: 'Undecided between comfort and growth.',
            externalConflict: 'Faces obstacles inherent to the journey.',
            arc: { act1: 'Introduced with a clear want.', act2: 'Confronts obstacles and changes.', act3: 'Resolves want with growth.' }
          }
        ];
      }
      // Build beats from either dynamic_acts or legacy act_structure, mapping to template columns
      const actsSource = (activeIdea.dynamic_acts && activeIdea.dynamic_acts.length > 0)
        ? (activeIdea.dynamic_acts as DynamicAct[]).map(a => ({ title: a.title, beats: a.beats }))
        : [
            { title: activeIdea.act_structure?.act_1?.title || 'Act 1', beats: activeIdea.act_structure?.act_1?.beats || [] },
            { title: activeIdea.act_structure?.act_2?.title || 'Act 2', beats: activeIdea.act_structure?.act_2?.beats || [] },
            { title: activeIdea.act_structure?.act_3?.title || 'Act 3', beats: activeIdea.act_structure?.act_3?.beats || [] }
          ];

      const mappedBeats = actsSource.flatMap((actObj, aIdx) =>
        (actObj.beats || []).map((b, i) => ({
          id: `beat-${aIdx}-${b.beat_number || i + 1}-${Date.now()}`,
          act: mapActToColumnId(templateId, actObj.title, aIdx),
          title: b.beat_title,
          summary: b.beat_description,
          charactersPresent: [],
          estimatedDuration: undefined
        }))
      );

      const createdProjectId = `project-${Date.now()}`

      initializeProject({
        title: activeIdea.title,
        filmTreatment: comprehensiveDescription,
        treatmentDetails: {
          title: activeIdea.title,
          logline: activeIdea.logline,
          synopsis: activeIdea.synopsis || '',
          keyCharacters: (mappedCharacters || []).map(c => `${c.name} — ${c.archetype}`).join('\n'),
          toneAndStyle: activeIdea.details?.tone || '',
          themes: activeIdea.details?.keyThemes || '',
          visualLanguage: '',
          billboardImageUrl: null
        },
        characters: mappedCharacters as any,
        beatSheet: mappedBeats as any,
        beatTemplate: templateId,
        projectId: createdProjectId
      });

      // Persist to DB (best-effort). If DB not configured, continue silently.
      try {
        await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: localStorage.getItem('authUserId') || undefined,
            title: activeIdea.title,
            description: activeIdea.synopsis || activeIdea.logline || '',
            metadata: { concept: activeIdea.logline, selectedIdea: activeIdea },
            currentStep: 'ideation'
          })
        })
      } catch (e) {
        console.warn('Project DB persist skipped:', e)
      }

      // Add lightweight Project shell to Projects list for dashboard
      const now = new Date()
      addProject({
        id: createdProjectId,
        title: activeIdea.title,
        description: activeIdea.synopsis || activeIdea.logline || '',
        currentStep: 'ideation',
        progress: 0,
        status: 'in-progress',
        createdAt: now,
        updatedAt: now,
        completedSteps: [],
        metadata: {
          concept: activeIdea.logline,
          genre: activeIdea.details?.genre,
          duration: Number(String(activeIdea.details?.duration).replace(/\D/g, '')) || undefined,
          targetAudience: activeIdea.details?.targetAudience,
          tone: activeIdea.details?.tone,
          selectedIdea: activeIdea
        }
      } as any)
      setCurrentProject({
        id: createdProjectId,
        title: activeIdea.title,
        description: activeIdea.synopsis || activeIdea.logline || '',
        currentStep: 'ideation',
        progress: 0,
        status: 'in-progress',
        createdAt: now,
        updatedAt: now,
        completedSteps: [],
        metadata: {
          concept: activeIdea.logline
        }
      } as any)

      // Background refinement
      invokeCue({ type: 'text', content: `Refine baseline content for "${activeIdea.title}".` });

      // Hide ideas and switch to treatment
      setGeneratedIdeas([]);
      setSelectedIdea(null);
      setAnalysisComplete(true);
      window.dispatchEvent(new CustomEvent('studio.goto.treatment'));
      
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

    return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      {/* Section 1: Describe Your Project Idea */}
      <div>
        <div className="mb-6 px-8">
          <h1 className="text-[1.875rem] sm:text-[2.125rem] md:text-[2.375rem] lg:text-[2.625rem] font-extrabold text-white mb-2 tracking-tight leading-tight">Describe Your Concept</h1>
          <p className="text-gray-300 text-[1rem] sm:text-[1.05rem]">Share your vision and let our AI create compelling project concepts tailored to your needs.</p>
        </div>
        
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-8">
          {isGeneratingIdeas && (
            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2">{genStatus || 'Working...'}</div>
              <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
                <div className="h-2 bg-blue-600 transition-all" style={{ width: `${Math.min(genProgress, 100)}%` }} />
              </div>
            </div>
          )}
          <Textarea
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Tell us about your video project... Who is it for? What's the goal and tone? Paste a script or brief if you have one."
            rows={6}
            className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 !text-[1.125rem] sm:!text-[1.2rem] md:!text-[1.25rem] lg:!text-[1.3rem] leading-8 tracking-[0.005em] resize-y min-h-[200px] rounded-lg"
          />
          {genError && (
            <div className="mt-3 text-sm text-red-400">{genError}</div>
          )}
          
          <div className="mt-8 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6">
              <button className="text-blue-400 hover:text-blue-300 text-base font-medium transition-colors">
                Upload Script/Document
              </button>
              <button
                onClick={() => setShowGuideCard(!showGuideCard)}
                className="text-gray-400 hover:text-white text-base font-medium transition-colors"
              >
                {showGuideCard ? 'Hide Guide' : 'Show Guide'}
              </button>
              {analysisComplete && (
                <button
                  onClick={() => setShowProjectDetails(!showProjectDetails)}
                  className="text-gray-400 hover:text-white text-base font-medium transition-colors"
                >
                  {showProjectDetails ? 'Hide' : 'View'} Project Details
                </button>
              )}
          </div>
          
            <div className="flex items-center gap-3">
            <Button
                onClick={async () => {
                  const contextPayload = {
                    input: projectDescription,
                    existingIdeas: generatedIdeas.map(i => ({ id: i.id, title: i.title, synopsis: i.synopsis })),
                    expectation: 'Return an improved, copy-ready single input paragraph suitable for generating compelling project ideas/blueprints. Keep the creator intent but strengthen clarity, audience, tone, and hook.'
                  };
                  await invokeCue({ type: 'text', content: 'Optimizing Project Idea input...', payload: contextPayload });
                  window.dispatchEvent(new CustomEvent('flow.optimizeIdea', { detail: contextPayload }));
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 text-lg font-medium flex items-center gap-2"
              >
                <Clapperboard className="w-5 h-5" />
                Ask Flow to Improve
            </Button>
            
              <Button
                onClick={generateProjectIdeas}
                disabled={!projectDescription.trim() || isGeneratingIdeas}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium"
              >
                {isGeneratingIdeas ? 'Generating...' : generatedIdeas.length > 0 ? 'Generate More' : 'Generate Concept Treatments'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Project Details Analysis - Hidden by default */}
      {analysisComplete && showProjectDetails && (
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white mb-3">Project Details Analyzed</h2>
            <p className="text-gray-400 text-base">
              AI has analyzed your input and identified the following project details:
            </p>
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(projectDetails).map(([key, value]) => (
              <div key={key} className="bg-gray-800/50 rounded-lg p-6">
                <div className="mb-3">
                  <span className="text-white font-medium text-base uppercase tracking-wide">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
                <p className="text-gray-300 text-lg">
                  {value === 'Cue Decide' ? (
                    <span className="text-blue-400 italic">AI will decide creatively</span>
                  ) : (
                    value
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide Card - simplified */}
      {showGuideCard && (
        <div className="mb-8 bg-gray-900/50 border border-gray-700/50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-white mb-4">How to Write a Great Project Idea</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-300 text-base">
            <li><strong>Core Idea:</strong> What's the story or message?</li>
            <li><strong>Audience:</strong> Who is this for?</li>
            <li><strong>Genre & Tone:</strong> Documentary, drama, comedy, etc.</li>
            <li><strong>Themes:</strong> What ideas matter?</li>
            <li><strong>Visual Style:</strong> How should it feel on screen?</li>
            <li><strong>Unique Angle:</strong> What makes it different?</li>
          </ul>
          <div className="mt-4 bg-gray-800 rounded-lg p-4">
            <p className="text-gray-300 text-sm"><span className="text-green-300 font-semibold">Example:</span> "The Last Echo" — a near‑future drama about a woman who hears people's last thoughts, exploring connection in a tech‑saturated world.</p>
          </div>
        </div>
      )}

      {/* Section 3: Generated Project Ideas */}
      {generatedIdeas.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-white mb-3">Concept Treatments</h2>
              </div>

          {/* Action Buttons - Above the cards */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button
              onClick={createCollaborationLink}
              disabled={isCreatingLink || generatedIdeas.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-medium"
            >
              {isCreatingLink ? 'Creating Link...' : 'Share for Collaboration'}
            </Button>
            </div>

          {/* Project Idea Collaboration Section */}
          {collaborationLink && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">Project Idea Collaboration</h2>
                <button
                  onClick={() => setShowCollaborationSection(!showCollaborationSection)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  {showCollaborationSection ? 'Hide Collaboration' : 'Show Collaboration'}
                </button>
          </div>

              {showCollaborationSection && (
                <div className="bg-gray-800/50 border border-green-600/30 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-green-400 font-semibold text-lg">Collaboration Link Created!</h3>
                    <button
                      onClick={copyLinkToClipboard}
                      className="text-green-400 hover:text-green-300 text-sm font-medium transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                    <p className="text-gray-300 text-sm mb-2">Share this link with collaborators to let them vote and provide feedback:</p>
                    <p className="text-green-300 text-sm font-mono break-all">{collaborationLink}</p>
                  </div>

                  {/* Collaboration Results */}
                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold text-lg">Collaboration Results</h4>
                      {isLoadingResults && (
                        <div className="flex items-center text-gray-400 text-sm">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                          Updating...
                        </div>
                      )}
                  </div>

                    {collaborationResults ? (
                      <div className="space-y-4">
                        {collaborationResults.projectIdeas.map((idea: any) => {
                          const votes = collaborationResults.votes[idea.id] || { upvotes: 0, downvotes: 0 };
                          const totalVotes = votes.upvotes - votes.downvotes;
                          const ideaFeedback = collaborationResults.feedback ? collaborationResults.feedback.filter((f: any) => f.ideaId === idea.id) : [];

                          return (
                            <div key={idea.id} className="bg-gray-900/50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-white font-medium text-base">{idea.title}</h5>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-sm">{votes.upvotes}</span>
                                    <span className="text-red-400 text-sm">{votes.downvotes}</span>
                                    <span className="text-white text-sm font-medium">Score: {totalVotes}</span>
                  </div>
                    </div>
                  </div>

                              {ideaFeedback.length > 0 && (
                                <div className="mt-3">
                                  <h6 className="text-gray-400 text-sm font-medium mb-2">Feedback ({ideaFeedback.length})</h6>
                                  <div className="space-y-2">
                                    {ideaFeedback.slice(0, 3).map((feedback: any) => (
                                      <div key={feedback.id} className="bg-gray-800/50 rounded p-3">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-blue-400 text-sm font-medium">{feedback.authorName}</span>
                                          <span className="text-gray-500 text-xs">
                                            {new Date(feedback.createdAt).toLocaleDateString()}
                                          </span>
          </div>
                                        <p className="text-gray-300 text-sm">{feedback.feedback}</p>
                                      </div>
                                    ))}
                                    {ideaFeedback.length > 3 && (
                                      <p className="text-gray-500 text-xs">+{ideaFeedback.length - 3} more feedback items</p>
                      )}
                    </div>
                  </div>
                              )}
          </div>
                          );
                        })}
          </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">No collaboration activity yet. Share the link to start collecting feedback!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedIdea && (
            <p className="text-gray-400 text-base mb-8 text-center">
              Create a project or update your input to generate new ideas or blueprint
            </p>
          )}

          {/* Project Ideas - Single Column with Hide/Show Controls */}
          <div className="space-y-6">
            {generatedIdeas.map((idea) => (
              <Card 
                key={idea.id} 
                className={`group bg-gradient-to-br from-gray-800/60 to-gray-900/40 border rounded-xl shadow-sm transition-all duration-200 ${
                  selectedIdea?.id === idea.id 
                    ? 'border-blue-500/60 shadow-blue-900/20' 
                    : 'border-gray-700/60 hover:border-gray-500/60 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <CardContent className="p-8">
                  {/* Header with Title, Selection, and Expand/Collapse */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-6">
                      <h3 className="text-2xl font-semibold text-white flex items-center">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500/80 ring-4 ring-blue-500/10 mr-3" />
                        {idea.title}
                      </h3>
                      <button
                        onClick={(e) => { e.preventDefault(); handleCreateProject(idea); }}
                        className="px-5 py-2.5 rounded-md text-base font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                        title="Create project from this idea"
                      >
                        Create Project
                      </button>
        </div>
                    <button
                      onClick={() => toggleCardExpansion(idea.id)}
                      className="text-gray-300 hover:text-white text-base font-medium transition-colors px-3 py-1 rounded-md hover:bg-gray-700/40"
                    >
                      {expandedCards.has(idea.id) ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>
                  
                  {/* Always visible summary */}
                  <p className="text-gray-300 text-lg mb-6 leading-relaxed">{idea.synopsis || idea.logline}</p>
                  
                  {/* Quick Details - Always visible */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50 shadow-inner">
                      <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Genre</div>
                      <div className="text-white text-base font-medium">{idea.details.genre}</div>
          </div>
                    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50 shadow-inner">
                      <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Duration</div>
                      <div className="text-white text-base font-medium">{idea.details.duration}</div>
                    </div>
                    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50 shadow-inner">
                      <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Audience</div>
                      <div className="text-white text-base font-medium">{idea.details.targetAudience}</div>
                    </div>
                    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50 shadow-inner">
                      <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Tone</div>
                      <div className="text-white text-base font-medium">{idea.details.tone}</div>
                    </div>
        </div>
        
                  {/* Narrative Structure - Always visible */}
                  <div className="bg-gray-800/40 rounded-lg p-4 mb-6 border border-gray-700/50">
                    <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Structure</div>
                    <div className="text-white text-base font-medium">{idea.narrative_structure}</div>
                  </div>

                                    {/* Expandable Content */}
                  {expandedCards.has(idea.id) && (
                    <div className="border-t border-gray-700 pt-8 mt-8 space-y-8">
                      
                                            {/* Film Treatment */}
            <div>
                        <h4 className="text-white font-semibold text-xl mb-4">Audience Analysis</h4>
                        <div className="bg-gray-800/50 p-6 rounded-lg">
                          <p className="text-gray-300 text-lg leading-relaxed">
                            {idea.audience_analysis || 'Target audience insights will appear here based on your input.'}
                          </p>
                        </div>
            </div>
            
                                            {/* Characters */}
            <div>
                        <h4 className="text-white font-semibold text-xl mb-4">Characters</h4>
                        <div className="space-y-4">
                          {idea.characters.map((character, index) => (
                            <div key={index} className="bg-gray-800/50 p-6 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-white font-medium text-lg">{character.name}</h5>
                                <div className="flex items-center gap-3">
                                  <span className={`px-3 py-1 rounded-md text-sm font-medium ${
                                    character.importance === 'High' ? 'bg-red-600/20 text-red-400 border border-red-600/30' :
                                    character.importance === 'Medium' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/30' :
                                    'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                                  }`}>
                                    {character.importance}
                                  </span>
                                  <span className="text-blue-400 text-sm font-medium uppercase tracking-wide">{character.role}</span>
              </div>
                              </div>
                              <p className="text-gray-300 text-base leading-relaxed">{character.description}</p>
                              {character.arc && (
                                <p className="text-gray-400 text-sm mt-2"><span className="text-gray-500">Arc:</span> {character.arc}</p>
                              )}
                            </div>
                          ))}
            </div>
          </div>
          
                                                                  {/* Act Structure */}
                      <div>
                        <h4 className="text-white font-semibold text-xl mb-6">{idea.narrative_structure}</h4>
                        <div className="space-y-8">
                          {(idea.dynamic_acts && idea.dynamic_acts.length > 0 ? idea.dynamic_acts : [
                            { ...idea.act_structure.act_1, title: `Act 1: ${idea.act_structure.act_1.title}` },
                            { ...idea.act_structure.act_2, title: `Act 2: ${idea.act_structure.act_2.title}` },
                            { ...idea.act_structure.act_3, title: `Act 3: ${idea.act_structure.act_3.title}` }
                          ]).map((act, aIndex) => (
                            <div key={aIndex} className="bg-gray-800/30 rounded-lg p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-white font-semibold text-xl">{act.title}</h5>
                                <span className="text-gray-300 text-base font-medium bg-gray-600/20 px-3 py-1 rounded-md">{act.duration}</span>
                </div>
                              <div className="space-y-4">
                                {act.beats.map((beat, index) => (
                                  <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                      <h6 className="text-white font-medium text-lg">
                                        Beat {beat.beat_number}: {beat.beat_title}
                                      </h6>
                                      <span className="text-gray-400 text-sm font-medium bg-gray-600/20 px-2 py-1 rounded">{beat.duration_estimate}</span>
              </div>
                                    <p className="text-gray-300 text-base mb-4 leading-relaxed">{beat.beat_description}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {beat.key_elements.map((element, elemIndex) => (
                                        <span key={elemIndex} className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-md text-sm font-medium">
                                          {element}
                                        </span>
                                      ))}
                </div>
              </div>
                                ))}
                </div>
              </div>
                          ))}
            </div>
          </div>
        </div>
                  )}
                </CardContent>
              </Card>
            ))}
      </div>


        </div>
      )}


    </div>
  );
}

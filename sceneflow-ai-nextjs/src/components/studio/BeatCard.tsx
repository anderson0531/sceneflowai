'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Beat, useStore } from '@/store/useStore';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { GripVertical, MoreVertical, Trash2, Edit, Clapperboard, Image as ImageIcon, RefreshCw, FileText, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BeatCardProps {
  beat: Beat;
  sceneNumber: number;
  onUpdate: (beatId: string, updates: Partial<Beat>) => void;
  onDelete: (beatId: string) => void;
  isDragging?: boolean;
}

export function BeatCard({ beat, sceneNumber, onUpdate, onDelete, isDragging = false }: BeatCardProps) {
  const { currentProject } = useStore()
  const [isEditing, setIsEditing] = useState(false);
  const [slugline, setSlugline] = useState(beat.slugline);
  const [summary, setSummary] = useState(beat.summary || '');
  const [objective, setObjective] = useState(beat.objective || '');
  const [keyAction, setKeyAction] = useState(beat.keyAction || '');
  const [emotionalTone, setEmotionalTone] = useState<Beat['emotionalTone']>(beat.emotionalTone || 'Tense');
  const [thumbUrl, setThumbUrl] = useState<string | null>(beat.thumbnailUrl || null);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptText, setScriptText] = useState<string>(beat.script || '');
  const [showHistory, setShowHistory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveDebounceRef = useRef<number | null>(null)
  const latestVersion = (beat.scriptVersions || []).slice(-1)[0]
  const [showDiff, setShowDiff] = useState(false)

  const splitLines = (t: string)=> (t || '').split(/\r?\n/)
  const computeDiff = (a: string, b: string) => {
    const A = splitLines(a)
    const B = splitLines(b)
    const len = Math.max(A.length, B.length)
    const rows: Array<{ left?: string; right?: string; status: 'same'|'add'|'del'|'mod' }>=[]
    for (let i=0;i<len;i++){
      const l = A[i] ?? ''
      const r = B[i] ?? ''
      if (l === r) rows.push({ left:l, right:r, status:'same' })
      else if (l && !r) rows.push({ left:l, right:'', status:'del' })
      else if (!l && r) rows.push({ left:'', right:r, status:'add' })
      else rows.push({ left:l, right:r, status:'mod' })
    }
    return rows
  }
  const [sceneCharacters, setSceneCharacters] = useState<string[]>(beat.sceneCharacters || []);
  const [targetSeconds, setTargetSeconds] = useState<number | undefined>(beat.targetSeconds);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  useEffect(() => {
    setSlugline(beat.slugline);
    setSummary(beat.summary || '');
    setObjective(beat.objective || '');
    setKeyAction(beat.keyAction || '');
    setEmotionalTone((beat.emotionalTone as any) || 'Tense');
    setThumbUrl(beat.thumbnailUrl || null);
    setScriptText(beat.script || '');
    setSceneCharacters(beat.sceneCharacters || []);
    setTargetSeconds(beat.targetSeconds);
  }, [beat]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Lightweight proactive suggestion
  const suggestion = useMemo(() => {
    if (!summary || summary.length <= 240) return null
    const over = summary.length - 220
    return {
      title: 'Pacing suggestion',
      detail: `Consider shortening this scene by ~${over} characters to improve momentum.`,
      apply: () => {
        const trimmed = summary.slice(0, 220).replace(/\s+\S*$/, '…')
        onUpdate(beat.id, { summary: trimmed })
      }
    }
  }, [summary, beat.id, onUpdate])
  
  const handleSave = () => {
    const versionEntry = scriptText && scriptText.trim() ? { id: `v-${Date.now()}`, createdAt: new Date().toISOString(), text: scriptText } : undefined
    const nextVersions = versionEntry ? ([...(beat.scriptVersions || []), versionEntry]) : (beat.scriptVersions || [])
    onUpdate(beat.id, { slugline, summary, objective, keyAction, emotionalTone, thumbnailUrl: thumbUrl, script: scriptText, sceneCharacters, targetSeconds, scriptVersions: nextVersions });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSlugline(beat.slugline);
    setSummary(beat.summary || '');
    setObjective(beat.objective || '');
    setKeyAction(beat.keyAction || '');
    setEmotionalTone((beat.emotionalTone as any) || 'Tense');
    setThumbUrl(beat.thumbnailUrl || null);
  };

  const generateThumbnail = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!slugline && !summary) return;
    setIsGeneratingThumb(true);
    try {
      const userId = (typeof window !== 'undefined' && localStorage.getItem('authUserId')) || 'anonymous'
      const prompt = `Atmospheric, non-literal cinematic concept for scene: ${slugline}. Tone: ${emotionalTone || 'Tense'}. Focus on mood, light, composition.`
      const resp = await fetch('/api/thumbnails/generate?byok=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ideas: [{ id: beat.id, thumbnail_prompt: prompt }] })
      })
      if (!resp.ok) throw new Error('Thumbnail service unavailable')
      const data = await resp.json()
      const url = data?.thumbnails?.[beat.id]?.imageUrl || null
      setThumbUrl(url)
      onUpdate(beat.id, { thumbnailUrl: url || null })
    } catch (err) {
      // no-op UI toast here to keep BeatCard simple
    } finally {
      setIsGeneratingThumb(false)
    }
  }

  const estimateVideoDuration = (text: string, tone: string | undefined): number => {
    const content = (text || '').trim()
    // Sentence-based pacing with tone multipliers (approx. average shot length in seconds)
    const toneBase: Record<string, number> = {
      Tense: 3.0,
      Joyful: 3.8,
      Contemplative: 5.5,
      Somber: 4.8,
      Wondrous: 5.2,
    }
    const baseShot = toneBase[(tone as any) || ''] || 4.0
    const sentences = content ? content.split(/(?<=[.!?])\s+/).filter(Boolean).length : 0
    let seconds: number
    if (sentences > 0) {
      seconds = Math.round(sentences * baseShot)
    } else {
      // Fallback: words-to-visual pacing (~3.5 wps equivalent visuals)
      const words = content.split(/\s+/).filter(Boolean).length
      seconds = Math.round(words / 3.5)
    }
    // Add small overhead for transitions every ~6 shots
    const overhead = Math.floor((sentences || 1) / 6)
    seconds += overhead
    // Bound per-scene min/max to keep UX sane
    return Math.max(10, Math.min(seconds, 600))
  }

  const regenerateSceneScript = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!summary && !objective && !keyAction) return
    setIsGeneratingScript(true)
    try {
      const treatmentContext = (currentProject as any)?.metadata?.filmTreatment || JSON.stringify(((currentProject as any)?.metadata?.selectedIdea) || {})
      const outlineChunk = [
        {
          id: beat.id,
          slugline: slugline,
          summary: summary || '',
          objective: objective || '',
          keyAction: keyAction || '',
          emotionalTone: emotionalTone || 'Tense',
        }
      ]
      const payload = { outline_chunk: outlineChunk, treatment_context: treatmentContext, previous_scene_summary: '', title: (currentProject as any)?.title || '', episode: (currentProject as any)?.metadata?.episode || '', sceneNumber: sceneNumber }
      const resp = await fetch('/api/generate/script-chunk', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      if (!resp.ok) throw new Error('Script service unavailable')
      const text = await resp.text()
      let secondsParsed: number | undefined
      const m = text.match(/Estimated Duration:\s*(\d+)\s*seconds/i)
      if (m) {
        const val = parseInt(m[1], 10)
        if (!isNaN(val)) secondsParsed = val
      }
      const seconds = (secondsParsed != null) ? secondsParsed : estimateVideoDuration(text, emotionalTone)
      setScriptText(String(text))
      const versionEntry = { id: `v-${Date.now()}`, createdAt: new Date().toISOString(), label: 'AI generate', text: String(text) }
      onUpdate(beat.id, { script: String(text), estimatedDuration: seconds, scriptVersions: [ ...(beat.scriptVersions || []), versionEntry ] })
    } catch {
    } finally {
      setIsGeneratingScript(false)
    }
  }

  const buildImagePrompt = (): string => {
    const treatment: any = (currentProject as any)?.metadata?.treatment || {}
    const charactersText = (sceneCharacters && sceneCharacters.length) ? `\nCharacters in scene: ${sceneCharacters.join(', ')}` : ''
    const toneText = emotionalTone ? `\nTone: ${emotionalTone}` : ''
    return [
      `Film: ${treatment.title || (currentProject as any)?.title || ''}`,
      treatment.logline ? `Logline: ${treatment.logline}` : '',
      treatment.theme ? `Theme: ${treatment.theme}` : '',
      treatment.visualLanguage ? `Visual Style: ${treatment.visualLanguage}` : '',
      `Scene: ${slugline}`,
      `Synopsis: ${summary || ''}`,
      charactersText,
      toneText,
      '',
      'Create a cinematic storyboard still. No text, no watermarks, high contrast lighting, strong composition, photographic realism.'
    ].filter(Boolean).join('\n')
  }

  const generateStoryboard = async () => {
    if (isGeneratingImages) return
    setIsGeneratingImages(true)
    try {
      const userId = (typeof window !== 'undefined' && localStorage.getItem('authUserId')) || 'anonymous'
      const prompt = buildImagePrompt()
      const resp = await fetch('/api/thumbnails/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId, ideas: [{ id: beat.id, thumbnail_prompt: prompt }] })
      })
      const data = await resp.json().catch(()=>({}))
      const url = data?.thumbnails?.[beat.id]?.imageUrl || null
      if (url) {
        const frame = { id: `frame-${Date.now()}`, imageUrl: url as string, prompt, updatedAt: new Date().toISOString() }
        const nextFrames = [ ...(beat.storyboardFrames || []), frame ]
        onUpdate(beat.id, { storyboardFrames: nextFrames, thumbnailUrl: url })
      }
    } catch {}
    finally { setIsGeneratingImages(false) }
  }

  const onUploadImage = async (file: File) => {
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => { reader.onload = ()=> resolve(String(reader.result||'')); reader.readAsDataURL(file) })
      const frame = { id: `frame-${Date.now()}`, imageUrl: dataUrl, prompt: 'Uploaded', updatedAt: new Date().toISOString() }
      const nextFrames = [ ...(beat.storyboardFrames || []), frame ]
      onUpdate(beat.id, { storyboardFrames: nextFrames, thumbnailUrl: beat.thumbnailUrl || dataUrl })
    } catch {}
  }

  const hiddenInputId = `upload-${beat.id}`

  function formatTime(sec?: number) {
    if (sec == null) return '0:00'
    const s = Math.max(0, Math.round(sec))
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2,'0')}`
  }

  // Autosave script with debounce
  useEffect(()=>{
    if (!isEditing) return
    if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = window.setTimeout(()=>{
      setIsSaving(true)
      onUpdate(beat.id, { script: scriptText })
      setTimeout(()=>setIsSaving(false), 300)
    }, 1000)
    return ()=>{ if (saveDebounceRef.current) window.clearTimeout(saveDebounceRef.current) }
  }, [scriptText, isEditing, beat.id, onUpdate])

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`w-full bg-gray-900/50 border border-gray-700/60 rounded-xl text-white transition-shadow ${isDragging ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
      onClick={() => !isEditing && setIsEditing(true)}
    >
      <div className="flex items-center p-4">
        <div {...attributes} {...listeners} className="cursor-grab touch-none pr-4" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="text-gray-400" />
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-400">SCENE {sceneNumber}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(beat.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
                            </div>
          {/* Ask Flow / Suggestions icon */}
          <div className="mt-1 mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label="Scene suggestions" variant="ghost" size="icon" onClick={(e)=>e.stopPropagation()} className={`${suggestion ? 'text-blue-300' : 'text-gray-500'}`}>
                        <Clapperboard className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-w-[300px]">
                      {suggestion ? (
                        <div className="p-2 text-sm">
                          <div className="font-semibold mb-1">{suggestion.title}</div>
                          <div className="text-gray-300 mb-2">{suggestion.detail}</div>
                          <Button size="sm" onClick={(e)=>{ e.stopPropagation(); suggestion.apply(); }}>Apply</Button>
                        </div>
                      ) : (
                        <div className="p-2 text-sm text-gray-400">No suggestions for this scene yet.</div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Suggestions</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {/* Header row with thumbnail and slugline */}
          <div className="mt-2 flex items-start gap-3">
            <div className="w-16 h-16 rounded-md bg-gray-900/40 border border-gray-800 flex items-center justify-center overflow-hidden">
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt="scene" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="flex-1">
              {!isEditing ? (
                <p className="text-lg font-semibold cursor-pointer">{beat.slugline}</p>
              ) : (
                <Textarea
                  value={slugline}
                  onChange={(e) => setSlugline(e.target.value)}
                  className="bg-sf-surface-light border-gray-600 mt-1 text-lg font-semibold"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className="mt-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={generateThumbnail} disabled={isGeneratingThumb}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        {isGeneratingThumb ? 'Generating...' : (thumbUrl ? 'Regenerate' : 'Generate Image')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-700 text-white border border-gray-600">Generate scene image</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={regenerateSceneScript} disabled={isGeneratingScript} className="ml-2">
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        {isGeneratingScript ? 'Scripting…' : (beat.script ? 'Regenerate Script' : 'Generate Script')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-700 text-white border border-gray-600">Generate scene script</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* Removed duplicate script preview under the scene name */}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" />Est. {Math.max(10, beat.estimatedDuration || 0)}s</div>
                {(beat.startTimeSec != null && beat.endTimeSec != null) && (
                  <div className="flex items-center gap-1"><span>Start {formatTime(beat.startTimeSec)}</span><span>•</span><span>End {formatTime(beat.endTimeSec)}</span></div>
                )}
              </div>
            </div>
          </div>
                      </div>
      </div>
      
      {isEditing && (
        <CardContent onClick={(e) => e.stopPropagation()} className="border-t border-gray-800">
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-300">Scene Synopsis</label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="bg-sf-surface-light border-gray-600 mt-1"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs font-medium text-gray-300">Objective</label>
                <Input value={objective} onChange={(e)=>setObjective(e.target.value)} className="bg-sf-surface-light border-gray-600 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-300">Key action / plot point</label>
                <Input value={keyAction} onChange={(e)=>setKeyAction(e.target.value)} className="bg-sf-surface-light border-gray-600 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-300">Target seconds (optional)</label>
                <Input type="number" value={targetSeconds ?? ''} onChange={(e)=>setTargetSeconds(e.target.value ? Number(e.target.value) : undefined)} className="bg-sf-surface-light border-gray-600 mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-300">Characters in this scene</label>
                <Input value={(sceneCharacters || []).join(', ')} onChange={(e)=>setSceneCharacters(e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} className="bg-sf-surface-light border-gray-600 mt-1" placeholder="Comma-separated character names" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-300">Emotional tone</label>
                <Select value={emotionalTone || 'Tense'} onValueChange={(v)=>setEmotionalTone(v as any)}>
                  <SelectTrigger className="bg-sf-surface-light border-gray-600 mt-1"><SelectValue placeholder="Select tone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tense">Tense</SelectItem>
                    <SelectItem value="Wondrous">Wondrous</SelectItem>
                    <SelectItem value="Contemplative">Contemplative</SelectItem>
                    <SelectItem value="Joyful">Joyful</SelectItem>
                    <SelectItem value="Somber">Somber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Script section */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-300">Script</label>
                <div className="flex items-center gap-2">
                  {latestVersion && scriptText !== latestVersion.text && (
                    <Button variant="secondary" size="sm" onClick={()=>setShowDiff(!showDiff)}>
                      {showDiff ? 'Hide compare' : 'Compare to previous'}
                    </Button>
                  )}
                  {isSaving && <span className="text-xs text-gray-400">Saving…</span>}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={()=>setShowHistory(!showHistory)}>History</Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-700 text-white border border-gray-600">Show script versions</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e)=>regenerateSceneScript(e)} disabled={isGeneratingScript}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          {isGeneratingScript ? 'Scripting…' : (scriptText ? 'Regenerate' : 'Generate')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-700 text-white border border-gray-600">Generate or regenerate</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e)=>{ e.stopPropagation(); navigator.clipboard.writeText(scriptText || '') }}>Copy</Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-700 text-white border border-gray-600">Copy script to clipboard</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              {showDiff && latestVersion && (
                <div className="mb-2 overflow-auto border border-gray-800 rounded">
                  <div className="grid grid-cols-2 text-xs">
                    <div className="px-2 py-1 border-r border-gray-800 bg-gray-900/60">Previous</div>
                    <div className="px-2 py-1 bg-gray-900/60">Current</div>
                  </div>
                  <div className="grid grid-cols-2 text-xs max-h-56 overflow-auto">
                    {computeDiff(latestVersion.text, scriptText).map((row, idx)=> (
                      <React.Fragment key={idx}>
                        <div className={`px-2 py-0.5 border-r border-gray-800 whitespace-pre-wrap ${row.status==='del'?'bg-red-900/30': row.status==='mod'?'bg-yellow-900/20': ''}`}>{row.left}</div>
                        <div className={`px-2 py-0.5 whitespace-pre-wrap ${row.status==='add'?'bg-green-900/20': row.status==='mod'?'bg-yellow-900/20': ''}`}>{row.right}</div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
              {showHistory && (
                <div className="mb-2 max-h-40 overflow-auto rounded border border-gray-800 bg-gray-900/40 p-2 text-xs">
                  {(beat.scriptVersions || []).slice().reverse().map(v => (
                    <div key={v.id} className="py-1 border-b border-gray-800 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">{new Date(v.createdAt).toLocaleString()}</span>
                        <Button size="sm" variant="ghost" onClick={()=>setScriptText(v.text)}>Restore</Button>
                      </div>
                    </div>
                  ))}
                  {!(beat.scriptVersions||[]).length && <div className="text-gray-500">No versions yet.</div>}
                </div>
              )}
              <Textarea
                value={scriptText}
                onChange={(e)=>setScriptText(e.target.value)}
                className="bg-sf-surface-light border-gray-600 mt-1"
                rows={8}
                placeholder="Generate or paste the scene script here…"
              />
            </div>

            {/* Storyboard section */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-300">Storyboard</label>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e)=>{ e.stopPropagation(); generateStoryboard() }} disabled={isGeneratingImages}>
                          {isGeneratingImages ? 'Generating…' : 'Generate'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-700 text-white border border-gray-600">Generate storyboard frame</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <input id={hiddenInputId} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) onUploadImage(f) }} />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e)=>{ e.stopPropagation(); const el=document.getElementById(hiddenInputId) as HTMLInputElement|null; el?.click() }}>Upload</Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-700 text-white border border-gray-600">Upload storyboard frame</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(beat.storyboardFrames || []).map(f => (
                  <div key={f.id} className="border border-gray-800 rounded overflow-hidden bg-gray-900/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.imageUrl} alt="frame" className="w-full h-28 object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
              </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

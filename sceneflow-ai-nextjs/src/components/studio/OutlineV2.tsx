"use client";

import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import type { Beat } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Loader2, Plus, Save, FileText } from 'lucide-react'
import { BeatCard } from './BeatCard'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export default function OutlineV2() {
  const { currentProject, setCurrentProject, beatSheet, setBeats, updateBeat, deleteBeat, addBeat, isBeatSheetDirty, saveBeatSheet } = useStore()
  const [mounted, setMounted] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [treatmentOpen, setTreatmentOpen] = useState(true)
  const [initCompleted, setInitCompleted] = useState(false)
  const didInitRef = useRef<string>("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bibleOpen, setBibleOpen] = useState(false)

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  const clearSelection = () => setSelectedIds([])

  const treatment = ((currentProject?.metadata as any)?.treatment || {}) as any
  const [title, setTitle] = useState<string>(treatment.title || (currentProject?.title || ''))
  const [logline, setLogline] = useState<string>(treatment.logline || '')
  const [theme, setTheme] = useState<string>(treatment.theme || '')
  const [genre, setGenre] = useState<string>(treatment.genre || '')
  const [audience, setAudience] = useState<string>(treatment.audience || '')
  const [tone, setTone] = useState<string>(treatment.tone || '')
  const [structure, setStructure] = useState<string>(treatment.structure || 'three-act')
  const [characters, setCharacters] = useState<Array<{ id:string; name:string; description:string }>>(Array.isArray(treatment.characters) ? treatment.characters : [])

  const computeTimeline = (beats: Beat[]) => {
    let cursor = 0
    return beats.map(b => {
      const dur = Math.max(10, Number(b.estimatedDuration||0))
      const start = cursor
      const end = cursor + dur
      cursor = end
      return { ...b, startTimeSec: start, endTimeSec: end }
    })
  }

  const generateFor = async (target: Beat[]) => {
    if (!target.length) return
    setIsBusy(true)
    try {
      const scenes = target.map(b=>({ id:b.id, slugline:String(b.slugline||''), summary:String(b.summary||''), objective:String(b.objective||''), keyAction:String(b.keyAction||''), emotionalTone:String(b.emotionalTone||'') }))
      const payload = { title: String(title||''), episode: '', treatment: { title, logline, theme, genre, audience, tone, structure, characters }, scenes }
      const controller = new AbortController()
      const id = setTimeout(()=>controller.abort(), 180000)
      const resp = await fetch('/api/generate/script-batch?debug=0', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), signal: controller.signal })
      clearTimeout(id)
      if (!resp.ok) throw new Error('Batch scripting failed')
      const txt = String(await resp.text())
      const lines = txt.split(/\r?\n/)
      const parts: string[] = []
      let current: string[] = []
      for (const line of lines) {
        if (/^SCENE:\s+\d+\s*$/i.test(line)) {
          if (current.length) parts.push(current.join('\n'))
          current = [line]
        } else {
          current.push(line)
        }
      }
      if (current.length) parts.push(current.join('\n'))
      const blocks = parts.filter(p=>p && p.trim().length>0)
      // Apply back to matching beats by order of target
      const updated = beatSheet.map(b => {
        const idx = target.findIndex(t => t.id === b.id)
        if (idx === -1) return b
        const script = String(blocks[idx] || b.script || '')
        return { ...b, script }
      })
      const withTimeline = computeTimeline(updated as any)
      setBeats(withTimeline as any)
      toast.success(`Scripts generated for ${target.length} scene(s)`)    
    } catch (e:any) {
      if (e?.name === 'AbortError') toast.error('Generation timed out. Try fewer scenes or retry.')
      else toast.error(e?.message || 'Batch generation failed')
    } finally { setIsBusy(false) }
  }

  const handleGenerateSelected = async ()=>{
    const target = beatSheet.filter(b => selectedIds.includes(b.id))
    await generateFor(target)
    clearSelection()
  }

  const handleGenerateMissing = async ()=>{
    const target = beatSheet.filter(b => !b.script || !b.script.trim())
    await generateFor(target)
  }

  useEffect(()=>{ setMounted(true) }, [])

  // Clean initialization with stable guards
  useEffect(() => {
    const projectId = currentProject?.id || 'current'
    const idea: any = (currentProject?.metadata as any)?.selectedIdea
    const selectedIdeaHash = idea ? `${idea?.title || ''}|${Array.isArray(idea?.beat_outline) ? idea.beat_outline.length : 0}` : 'none'
    const acts = (currentProject?.metadata as any)?.acts || []
    const actsLength = Array.isArray(acts) ? acts.length : 0
    const guardKey = `${projectId}|${selectedIdeaHash}|${actsLength}`

    if (didInitRef.current === guardKey) {
      // already initialized for this context
      return setInitCompleted(true)
    }

    // Source 1: selectedIdea.beat_outline
    if (idea && Array.isArray(idea.beat_outline) && idea.beat_outline.length) {
      const alreadyConcept = beatSheet.length > 0 && String(beatSheet[0]?.id || '').startsWith('beat-concept-')
      if (!alreadyConcept || beatSheet.length !== idea.beat_outline.length) {
        const mapped: Beat[] = idea.beat_outline.map((b: any, i: number) => ({
          id: `beat-concept-${i+1}`,
          // @ts-ignore act loose grouping
          act: i < Math.ceil(idea.beat_outline.length / 3) ? 'ACT_I' : i < Math.ceil(2*idea.beat_outline.length/3) ? 'ACT_II' : 'ACT_III',
          title: String(b.scene_name || b.beat_title || `Scene ${i+1}`),
          slugline: String(b.scene_name || b.beat_title || `Scene ${i+1}`).toUpperCase(),
          summary: String(b.beat_description || ''),
          estimatedDuration: undefined,
        }))
        console.debug('[OutlineV2] init map-from-selectedIdea', { projectId, before: beatSheet.length, after: mapped.length })
        setBeats(mapped)
      } else {
        console.debug('[OutlineV2] init skipped, concept already mapped', { projectId, count: beatSheet.length })
      }
      didInitRef.current = guardKey
      return setInitCompleted(true)
    }

    // Source 2: metadata.acts
    if (beatSheet.length === 0 && actsLength > 0) {
      console.debug('[OutlineV2] init from acts', { projectId, acts: actsLength })
      setBeats(acts as any)
      didInitRef.current = guardKey
      return setInitCompleted(true)
    }

    // No source
    console.debug('[OutlineV2] init no source', { projectId })
    didInitRef.current = guardKey
    setInitCompleted(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id, (currentProject?.metadata as any)?.selectedIdea, (currentProject?.metadata as any)?.acts])

  // Map idea → treatment once (if treatment empty)
  useEffect(() => {
    const idea: any = (currentProject?.metadata as any)?.selectedIdea
    if (idea && !treatment?.logline) {
      const chars = Array.isArray(idea.characters) ? idea.characters.map((c:any, i:number)=>({ id: c.id || `char-${i+1}`, name: c.name || c.role || `Character ${i+1}`, description: c.description || c.role || '' })) : []
      setTitle(idea.title || title)
      setLogline(idea.logline || idea.synopsis || '')
      setGenre(idea.details?.genre || '')
      setAudience(idea.details?.targetAudience || '')
      setTone(idea.details?.tone || '')
      setStructure(idea.narrative_structure || structure)
      if (!characters?.length && chars.length) setCharacters(chars)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id])

  const analysis = useMemo(()=>{
    const totalScenes = beatSheet.length
    const totalSeconds = beatSheet.reduce((s, b)=> s + (Number(b.estimatedDuration)||0), 0)
    return { totalScenes, totalSeconds }
  }, [beatSheet])

  const persistTreatment = async () => {
    if (!currentProject) return
    try {
      const updated = { ...(currentProject.metadata || {}), treatment: { title, logline, theme, genre, audience, tone, structure, characters } }
      setCurrentProject({ ...currentProject, metadata: updated } as any)
      await fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentProject.id, metadata: updated }) })
      toast.success('Treatment saved')
    } catch { toast.error('Failed to save treatment') }
  }

  const handleSave = async ()=>{
    try { await saveBeatSheet(); toast.success('Outline saved') } catch { toast.error('Save failed') }
  }

  const handleGenerateAll = async ()=>{
    if (!beatSheet.length) return
    setIsBusy(true)
    try {
      const scenes = beatSheet.map(b=>({ id:b.id, slugline:String(b.slugline||''), summary:String(b.summary||''), objective:String(b.objective||''), keyAction:String(b.keyAction||''), emotionalTone:String(b.emotionalTone||'') }))
      const payload = { title: String(title||''), episode: '', treatment: { title, logline, theme, genre, audience, tone, structure, characters }, scenes }
      const controller = new AbortController()
      const id = setTimeout(()=>controller.abort(), 180000)
      const resp = await fetch('/api/generate/script-batch?debug=0', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), signal: controller.signal })
      clearTimeout(id)
      if (!resp.ok) throw new Error('Batch scripting failed')
      const txt = String(await resp.text())
      // Robust split: break on lines that start with SCENE: N
      const lines = txt.split(/\r?\n/)
      const parts: string[] = []
      let current: string[] = []
      for (const line of lines) {
        if (/^SCENE:\s+\d+\s*$/i.test(line)) {
          if (current.length) parts.push(current.join('\n'))
          current = [line]
        } else {
          current.push(line)
        }
      }
      if (current.length) parts.push(current.join('\n'))
      const blocks = parts.filter(p=>p && p.trim().length>0)
      setBeats(beatSheet.map((b, i)=> ({ ...b, script: String(blocks[i] || b.script || '') })) as any)
      toast.success('Scripts generated')
    } catch (e:any) {
      if (e?.name === 'AbortError') toast.error('Generation timed out. Try fewer scenes or retry.')
      else toast.error(e?.message || 'Batch generation failed')
    } finally { setIsBusy(false) }
  }

  const handleGenerateImagesAll = async ()=>{
    if (!beatSheet.length) return
    setIsBusy(true)
    try {
      const userId = (typeof window !== 'undefined' && localStorage.getItem('authUserId')) || 'anonymous'
      // Build prompts per scene and call in a single request with first N (cap 5)
      const ideas = beatSheet.slice(0, 5).map(b => ({ id: b.id, thumbnail_prompt: [
        `Film: ${String(title||'')}`,
        logline ? `Logline: ${String(logline)}` : '',
        theme ? `Theme: ${String(theme)}` : '',
        `Scene: ${String(b.slugline||'')}`,
        `Synopsis: ${String(b.summary||'')}`,
        b.emotionalTone ? `Tone: ${String(b.emotionalTone)}` : '',
        '',
        'Create a cinematic storyboard still. No text, no watermarks, high contrast lighting, strong composition, photographic realism.'
      ].filter(Boolean).join('\n') }))
      const controller = new AbortController()
      const id = setTimeout(()=>controller.abort(), 120000)
      const resp = await fetch('/api/thumbnails/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId, ideas }), signal: controller.signal })
      clearTimeout(id)
      const data = await resp.json().catch(()=>({}))
      const updates = beatSheet.map(b => {
        const url = data?.thumbnails?.[b.id]?.imageUrl || null
        if (!url) return b
        const frame = { id: `frame-${Date.now()}`, imageUrl: url as string, prompt: 'Batch generated', updatedAt: new Date().toISOString() }
        const frames = [ ...(b.storyboardFrames || []), frame ]
        return { ...b, thumbnailUrl: b.thumbnailUrl || url, storyboardFrames: frames }
      })
      setBeats(updates as any)
      toast.success('Storyboard images generated (first 5 scenes).')
    } catch (e:any) {
      if (e?.name === 'AbortError') toast.error('Image generation timed out.')
      else toast.error(e?.message || 'Image generation failed')
    } finally { setIsBusy(false) }
  }

  if (!mounted) return <div className="h-full flex items-center justify-center text-gray-400"><div className="text-sm">Loading…</div></div>

  const showSpinner = !initCompleted
  const showCTA = initCompleted && beatSheet.length === 0

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800/70 bg-gray-900/70 rounded-t-xl">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-300">Scenes: <span className="text-white font-semibold">{String(analysis.totalScenes)}</span> • Est. Runtime <span className="text-white font-semibold">{String(Math.round((analysis.totalSeconds||0)/60))}m</span></div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={()=>setBibleOpen(!bibleOpen)}>{bibleOpen ? 'Hide Bible' : 'Show Bible'}</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Toggle Series Bible</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={addBeat}><Plus size={16}/> Add Scene</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Add scene</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleSave} disabled={!isBeatSheetDirty || !beatSheet.length}><Save size={16}/> {isBeatSheetDirty ? 'Save' : 'Saved'}</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Save outline</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleGenerateImagesAll} disabled={isBusy || !beatSheet.length}>Generate Images</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Generate storyboard images</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleGenerateSelected} disabled={isBusy || !selectedIds.length}>Generate Selected</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Generate selected scenes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleGenerateMissing} disabled={isBusy}>Generate Missing</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Generate missing scripts</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleGenerateAll} disabled={isBusy || !beatSheet.length} className="bg-sf-primary-gradient">{isBusy ? <Loader2 size={16}/> : <FileText size={16}/>} Generate All Scripts</Button>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-700 text-white border border-gray-600">Generate scripts for all scenes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Film Treatment Card */}
      <div className="p-4">
        <div className="w-full max-w-6xl mx-auto space-y-4">
          {bibleOpen && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm uppercase tracking-wide text-gray-400">Series Bible</div>
                <Button variant="ghost" onClick={()=>setBibleOpen(false)}>Close</Button>
              </div>
              <div className="mt-3 text-sm text-gray-300">
                Manage your characters, locations, lore and recurring elements here. (Inline Bible panel placeholder)
              </div>
            </div>
          )}
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm uppercase tracking-wide text-gray-400">Film Treatment</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={()=>setTreatmentOpen(!treatmentOpen)}>{treatmentOpen ? 'Hide' : 'Show'}</Button>
                <Button variant="outline" onClick={persistTreatment}>Save Treatment</Button>
              </div>
            </div>
            {treatmentOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1" placeholder="Title" value={title} onChange={e=>setTitle(String(e.target.value))} />
                <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1" placeholder="Genre" value={genre} onChange={e=>setGenre(String(e.target.value))} />
                <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1 md:col-span-2" placeholder="Logline" value={logline} onChange={e=>setLogline(String(e.target.value))} />
                <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1" placeholder="Theme" value={theme} onChange={e=>setTheme(String(e.target.value))} />
                <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1" placeholder="Audience" value={audience} onChange={e=>setAudience(String(e.target.value))} />
                <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1" placeholder="Tone" value={tone} onChange={e=>setTone(String(e.target.value))} />
                <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1" placeholder="Structure" value={structure} onChange={e=>setStructure(String(e.target.value))} />
                {/* Characters editor (simple inline) */}
                <div className="md:col-span-2 border border-gray-800 rounded p-2">
                  <div className="text-xs text-gray-400 mb-1">Characters</div>
                  <div className="space-y-2">
                    {characters.map((c, idx)=> (
                      <div key={c.id} className="grid grid-cols-2 gap-2">
                        <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1" placeholder="Name" value={c.name} onChange={e=>{ const next=[...characters]; next[idx]={...next[idx], name:String(e.target.value)}; setCharacters(next) }} />
                        <input className="bg-sf-surface-light border border-gray-700 rounded px-2 py-1" placeholder="Description" value={c.description} onChange={e=>{ const next=[...characters]; next[idx]={...next[idx], description:String(e.target.value)}; setCharacters(next) }} />
                      </div>
                    ))}
                    <Button variant="ghost" onClick={()=>setCharacters([...characters, { id: `char-${Date.now()}`, name:'', description:'' }])}>Add Character</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pt-0">
        <div className="w-full max-w-6xl mx-auto">
          {showSpinner ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
              <span className="w-12 h-12 mx-auto text-gray-500 mb-4 animate-spin inline-flex items-center justify-center"><Loader2 size={24} /></span>
              <h3 className="text-lg font-semibold text-white">Preparing Scene Outline…</h3>
              <p className="mt-1 text-sm">Initializing from the selected concept or saved acts.</p>
            </div>
          ) : showCTA ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center">
              <h3 className="text-lg font-semibold text-white">No outline found</h3>
              <p className="mt-1 text-sm">Click “Add Scene” or apply a Concept to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {beatSheet.map((beat, i)=> (
                <div key={beat.id} className="flex items-start gap-2 w-full">
                  <input type="checkbox" className="mt-4" checked={selectedIds.includes(beat.id)} onChange={()=>toggleSelect(beat.id)} />
                  <BeatCard beat={beat as any} onUpdate={updateBeat as any} onDelete={deleteBeat as any} sceneNumber={i+1}/>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

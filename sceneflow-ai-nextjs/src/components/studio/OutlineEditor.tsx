'use client';

import { useStore } from '@/store/useStore';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Save, Clapperboard, Sparkles, Loader2, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { BeatCard } from './BeatCard';
import { AskFlowModal } from './AskFlowModal';
import type { Beat } from '@/store/useStore';

export function OutlineEditor({ isGenerating }: { isGenerating?: boolean }) {
  const { 
    currentProject,
    setCurrentProject,
    beatSheet,
    setBeats,
    reorderBeats,
    updateBeat,
    deleteBeat,
    isBeatSheetDirty,
    saveBeatSheet,
    addBeat
  } = useStore();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false)
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  // Only list view is supported (timeline removed)
  const [isAutogenGenerating, setIsAutogenGenerating] = useState(false);

  useEffect(() => { setMounted(true) }, [])

  // Load beats from the project when it changes (single source of truth)
  useEffect(() => {
    const selectedIdea: any = (currentProject?.metadata as any)?.selectedIdea
    if (selectedIdea && Array.isArray(selectedIdea.beat_outline) && selectedIdea.beat_outline.length > 0) {
      // Only map once or when switching projects; avoid re-mapping overlays
      const mappedKey = `__sf_outline_mapped_${currentProject?.id || 'current'}`
      const mappedFlag = typeof window !== 'undefined' ? (window as any)[mappedKey] === true : false
      const alreadyConceptMapped = mappedFlag || (beatSheet.length > 0 && Boolean((beatSheet[0] as any)?.id?.startsWith?.('beat-concept-')))
      if (!alreadyConceptMapped || beatSheet.length !== selectedIdea.beat_outline.length) {
        const mapped: Beat[] = selectedIdea.beat_outline.map((b: any, idx: number) => ({
          id: `beat-concept-${idx + 1}`,
          // @ts-ignore keep act loose; default to ACT_I/II/III split by thirds
          act: idx < Math.ceil(selectedIdea.beat_outline.length / 3) ? 'ACT_I' : idx < Math.ceil(2 * selectedIdea.beat_outline.length / 3) ? 'ACT_II' : 'ACT_III',
          title: String(b.scene_name || b.beat_title || `Scene ${idx + 1}`),
          slugline: String(b.scene_name || b.beat_title || `Scene ${idx + 1}`).toUpperCase(),
          summary: String(b.beat_description || ''),
          estimatedDuration: undefined,
        }))
        console.debug('[Outline] map-from-concept-once', { projectId: currentProject?.id, before: beatSheet.length, after: mapped.length })
        setBeats(mapped as any)
        try { if (typeof window !== 'undefined') (window as any)[mappedKey] = true } catch {}
      }
      return
    }

    if (beatSheet.length === 0 && currentProject?.metadata?.acts && currentProject.metadata.acts.length > 0) {
      // Fall back to stored acts only when no beats are currently set
      console.debug('[Outline] fallback-to-acts', { projectId: currentProject?.id, acts: currentProject.metadata.acts.length })
      setBeats(currentProject.metadata.acts as unknown as Beat[])
    }
  }, [currentProject?.id]);

  // Fallback: if outline is empty but we have a film treatment, auto-generate once
  useEffect(() => {
    const autogen = async () => {
      // Do not autogen if we have a selectedIdea with scenes
      const sel: any = (currentProject?.metadata as any)?.selectedIdea
      if (sel && Array.isArray(sel.beat_outline) && sel.beat_outline.length > 0) return
      const mappedKey = `__sf_outline_mapped_${currentProject?.id || 'current'}`
      if (typeof window !== 'undefined' && (window as any)[mappedKey] === true) return
      if (!(currentProject?.metadata as any)?.filmTreatment) return
      if (beatSheet.length > 0) return
      try {
        setIsAutogenGenerating(true)
        console.debug('[Outline] autogen-from-treatment', { projectId: currentProject?.id })
        const resp = await fetch('/api/generate/outline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ treatment: (currentProject?.metadata as any)?.filmTreatment })
        })
        if (!resp.ok) return
        const json = await resp.json()
        if (Array.isArray(json?.scenes) && json.scenes.length) {
          setBeats(json.scenes as Beat[])
        }
      } catch (e) {
        console.warn('Auto-generate outline failed', e)
      } finally {
        setIsAutogenGenerating(false)
      }
    }
    autogen()
  }, [currentProject?.id, beatSheet.length, setBeats])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = beatSheet.findIndex((b) => b.id === active.id);
      const newIndex = beatSheet.findIndex((b) => b.id === over.id);
      const newOrder = arrayMove(beatSheet, oldIndex, newIndex);
      reorderBeats(newOrder);
    }
  };

  // Simple derived analytics
  const analysis = useMemo(() => {
    const totalScenes = beatSheet.length
    const totalSeconds = beatSheet.reduce((s, b) => s + (Number(b.estimatedDuration) || 0), 0)
    const tones: Record<string, number> = {}
    const characterCounts: Record<string, number> = {}
    for (const b of beatSheet) {
      if (b.emotionalTone) tones[b.emotionalTone] = (tones[b.emotionalTone] || 0) + 1
      if (Array.isArray(b.charactersPresent)) for (const c of b.charactersPresent) {
        const key = String(c).trim(); if (!key) continue; characterCounts[key] = (characterCounts[key] || 0) + 1
      }
    }
    // pacing heuristic: avg duration first act vs rest
    const firstThird = Math.max(1, Math.round(totalScenes / 3))
    const act1 = beatSheet.slice(0, firstThird)
    const rest = beatSheet.slice(firstThird)
    const act1Avg = act1.length ? (act1.reduce((s,b)=>s+(Number(b.estimatedDuration)||0),0)/act1.length) : 0
    const restAvg = rest.length ? (rest.reduce((s,b)=>s+(Number(b.estimatedDuration)||0),0)/rest.length) : 0
    const pacingMsg = act1Avg && restAvg
      ? (act1Avg < restAvg ? 'Act I is faster than later sections.' : act1Avg > restAvg ? 'Act I is slower than later sections.' : 'Pacing is even across acts.')
      : 'Add durations to see pacing.'
    return { totalScenes, totalSeconds, tones, characterCounts, pacingMsg }
  }, [beatSheet])
  
  const handleSave = async () => {
    try {
      await saveBeatSheet();
      toast.success("Outline saved successfully!");
    } catch (error) {
      toast.error("Failed to save outline.");
      console.error(error);
    }
  };

  const handleApplyFlowChanges = (newBeatSheet: Beat[]) => {
    setBeats(newBeatSheet);
    toast.success('Outline updated with suggestions from Flow.');
  };

  const handleGenerateScript = async () => {
    if (!currentProject || beatSheet.length === 0) {
      toast.error("Cannot generate script without an outline.");
      return;
    }

    setIsGeneratingScript(true);
    const toastId = toast.loading("Generating script...");

    try {
      const response = await fetch('/api/generate/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beatSheet }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to generate script.");
      }

      const updatedMetadata = {
        ...currentProject.metadata,
        fountain: result.script,
      };

      // Ensure project has a real UUID (create if this is a temp new-project)
      let targetProjectId = currentProject.id
      if (targetProjectId.startsWith('new-project')) {
        try {
          const userId = (typeof window !== 'undefined' && localStorage.getItem('authUserId')) || ''
          const createResp = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              title: (currentProject as any)?.title || 'Untitled Project',
              description: (currentProject as any)?.description || '',
              metadata: { ...(currentProject.metadata || {}), acts: beatSheet }
            })
          })
          const createJson = await createResp.json().catch(()=>null)
          if (!createResp.ok || !createJson?.success) {
            throw new Error(createJson?.error || 'Failed to create project')
          }
          targetProjectId = createJson.project.id
          // Update state and URL
          setCurrentProject(createJson.project)
          if (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard/studio/')) {
            const parts = window.location.pathname.split('/')
            parts[parts.length-1] = targetProjectId
            const newUrl = parts.join('/') + window.location.search + window.location.hash
            window.history.replaceState({}, '', newUrl)
          }
        } catch (e) {
          console.warn('Project creation failed before saving script:', e)
        }
      }

      // If we still don't have a real UUID, keep it local and prompt user to save later
      if (targetProjectId.startsWith('new-project')) {
        setCurrentProject({ ...currentProject, metadata: updatedMetadata });
        toast.info('Script generated locally. Sign in and Save Project to persist.');
        window.dispatchEvent(new CustomEvent('studio.goto.script'));
        return;
      }

      // Save the new script to the project (now guaranteed to be a UUID id)
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetProjectId, metadata: updatedMetadata }),
      });
      
      setCurrentProject({ ...currentProject, metadata: updatedMetadata });
      toast.success("Script generated successfully!", { id: toastId });
      
      // Navigate to the script tab
      window.dispatchEvent(new CustomEvent('studio.goto.script'));

    } catch (error) {
      console.error("Script generation error:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const activeBeat = activeId ? beatSheet.find((b) => b.id === activeId) : null;

  if (!mounted) {
    // Render a stable placeholder during hydration to avoid mismatch
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-sm">Loading outline...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800/70 bg-gray-900/70 backdrop-blur rounded-t-xl space-x-2">
        <div />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={async ()=>{
            try {
              setIsAutogenGenerating(true)
              const scenes = beatSheet.map(b=>({ id:b.id, slugline:b.slugline, summary:b.summary, objective:b.objective, keyAction:b.keyAction, emotionalTone:b.emotionalTone }))
              if (!scenes.length) return
              const payload = { title: (currentProject as any)?.title || '', episode: '', scenes }
              const resp = await fetch('/api/generate/script-batch', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
              if (!resp.ok) return
              const txt = await resp.text()
              const blocks = txt.split(/\nSCENE:\s+\d+\n/i).filter(Boolean)
              setBeats(beatSheet.map((b, i)=> ({ ...b, script: blocks[i] ? (i===0 ? blocks[i] : ('SCENE: ' + (i+1) + '\n' + blocks[i])) : (b.script || '') })) as any)
            } finally {
              setIsAutogenGenerating(false)
            }
          }} disabled={isAutogenGenerating || beatSheet.length===0}>
            <FileText size={16} /> Generate All Scripts
          </Button>
          <Button variant="outline" onClick={addBeat}>
            <Plus size={16} />
            Add Scene
          </Button>
          <Button variant="outline" onClick={() => setIsFlowModalOpen(true)} disabled={beatSheet.length === 0}>
            <Clapperboard size={16} />
            Ask Flow
          </Button>
          <Button onClick={handleSave} disabled={!isBeatSheetDirty || beatSheet.length === 0}>
            <Save size={16} />
            {isBeatSheetDirty ? 'Save Outline' : 'Saved'}
          </Button>
          <Button onClick={handleGenerateScript} disabled={isGeneratingScript || beatSheet.length === 0} className="bg-sf-primary-gradient">
            {isGeneratingScript ? <Loader2 size={16} /> : <FileText size={16} />}
            Generate Script
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {(isGenerating || isAutogenGenerating || beatSheet.length === 0) ? (
          <div className="flex flex-col h-full items-center justify-center text-center text-gray-400">
              <span className="w-12 h-12 mx-auto text-gray-500 mb-4 animate-spin inline-flex items-center justify-center"><Loader2 size={24} /></span>
              <h3 className="text-lg font-semibold text-white">Generating Scene Outline...</h3>
              <p className="mt-1 text-sm">Flow is creating your initial scenes based on the film treatment.</p>
          </div>
                  ) : (
          <>
          {/* Selected Concept summary at top */}
          {Boolean((currentProject?.metadata as any)?.selectedIdea) && (
            <div className="lg:col-span-12">
              <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm uppercase tracking-wide text-gray-400">Selected Concept</div>
                  <button className="text-xs text-blue-400 hover:underline" onClick={(e)=>{
                    e.stopPropagation();
                    // toggle hide/show by attaching a flag on project metadata for session only
                    const root = document.getElementById('concept-card-body');
                    if (root) root.classList.toggle('hidden');
                  }}>Hide/Show</button>
                </div>
                <div id="concept-card-body" className="mt-2">
                  {(() => {
                    const idea: any = (currentProject?.metadata as any)?.selectedIdea || {}
                    const chips = (str?: string) => String(str || '').split(',').filter(Boolean)
                    return (
                      <div>
                        <div className="text-xl font-semibold text-white mb-2">{idea.title || 'Untitled Concept'}</div>
                        {idea.logline && (<p className="text-sm text-gray-300 mb-3">{idea.logline}</p>)}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="bg-gray-800/40 rounded border border-gray-700 p-3"><div className="text-xs text-gray-400 mb-1">Genre</div><div className="flex flex-wrap gap-1">{chips(idea.details?.genre).map((t:string,i:number)=>(<span key={i} className="px-2 py-0.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200">{t.trim()}</span>))}</div></div>
                          <div className="bg-gray-800/40 rounded border border-gray-700 p-3"><div className="text-xs text-gray-400 mb-1">Duration</div><div className="text-sm text-gray-200">{idea.details?.duration || '—'}</div></div>
                          <div className="bg-gray-800/40 rounded border border-gray-700 p-3"><div className="text-xs text-gray-400 mb-1">Audience</div><div className="text-sm text-gray-200">{idea.details?.targetAudience || '—'}</div></div>
                          <div className="bg-gray-800/40 rounded border border-gray-700 p-3"><div className="text-xs text-gray-400 mb-1">Tone</div><div className="flex flex-wrap gap-1">{chips(idea.details?.tone).map((t:string,i:number)=>(<span key={i} className="px-2 py-0.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200">{t.trim()}</span>))}</div></div>
                        </div>
                        {Array.isArray(idea.beat_outline) && idea.beat_outline.length>0 && (
                          <div className="mt-2 text-xs text-gray-300">
                            <div className="text-gray-400 mb-1">Scenes</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                              {idea.beat_outline.map((b:any,i:number)=>(<div key={i} className="bg-gray-900/40 border border-gray-800 rounded px-2 py-1">{String(b.scene_number||i+1).padStart(2,'0')}. {b.scene_name||b.beat_title||'Scene'} {b.scene_duration?`— ${b.scene_duration}`:''}</div>))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}


          <div className="lg:col-span-8 xl:col-span-9">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={beatSheet.map(b => b.id) as any}
                  strategy={verticalListSortingStrategy as any}
                  children={(
                    <div className="space-y-4">
                      {beatSheet.map((beat, index) => (
                        <div key={beat.id}>
                          <BeatCard 
                            beat={beat as any}
                            onUpdate={updateBeat as any}
                            onDelete={deleteBeat as any}
                            sceneNumber={index + 1}
                          />
            </div>
                      ))}
                    </div>
                  )}
                />
                <DragOverlay>
                  {activeBeat ? (
                    <BeatCard 
                      beat={activeBeat as any} 
                      isDragging 
                      sceneNumber={beatSheet.findIndex(b => b.id === activeId) + 1} 
                      onUpdate={() => {}} 
                      onDelete={() => {}}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
          </div>
          {/* Analysis Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-3">
            <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
              <div className="text-sm font-semibold text-white mb-2">Story Analysis</div>
              <div className="text-sm text-gray-300">Scenes: <span className="text-white font-medium">{analysis.totalScenes}</span></div>
              <div className="text-sm text-gray-300">Estimated Runtime: <span className="text-white font-medium">{Math.round((analysis.totalSeconds||0)/60)} min</span></div>
              <div className="text-xs text-gray-400 mt-2">{analysis.pacingMsg}</div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
              <div className="text-sm font-semibold text-white mb-2">Emotional Tone</div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(analysis.tones).length === 0 ? (
                  <span className="text-xs text-gray-500">No tones yet</span>
                ) : (
                  Object.entries(analysis.tones).map(([tone,count]) => (
                    <span key={tone} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200">{tone}: {count}</span>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
              <div className="text-sm font-semibold text-white mb-2">Character Screen Time</div>
              <div className="space-y-1">
                {Object.keys(analysis.characterCounts).length === 0 ? (
                  <span className="text-xs text-gray-500">Add characters to scenes to see stats.</span>
                ) : (
                  Object.entries(analysis.characterCounts).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name, count]) => {
                    const pct = Math.round((count as number) / Math.max(1, analysis.totalScenes) * 100)
                    return (
                      <div key={name} className="text-xs text-gray-300 flex items-center gap-2">
                        <span className="w-20 truncate" title={name}>{name}</span>
                        <div className="flex-1 h-2 bg-gray-800 rounded">
                          <div className="h-2 bg-blue-500 rounded" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-gray-400">{pct}%</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </aside>
          </>
            )}
          </div>
      <AskFlowModal
        isOpen={isFlowModalOpen}
        onClose={() => setIsFlowModalOpen(false)}
        beatSheet={beatSheet}
        onApply={handleApplyFlowChanges}
      />
    </div>
  );
}

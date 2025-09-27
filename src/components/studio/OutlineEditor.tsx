import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Save, Clapperboard, Sparkles, Loader2, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { BeatCard } from './BeatCard';
import { DndContext } from '@dnd-kit/core';
import { useStore } from '@/store/useStore';
import { AskFlowModal } from './AskFlowModal';
import { Beat } from '@/types/Beat';

export function OutlineEditor({ isGenerating }: { isGenerating?: boolean }) {
  const { 
    currentProject,
    setCurrentProject,
    beatSheet,
    setBeats,
    isBeatSheetDirty,
    saveBeatSheet,
    addBeat
  } = useStore();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Load beats from the project when it changes
  useEffect(() => {
    setBeats(currentProject?.metadata?.beatSheet || []);
  }, [currentProject?.metadata?.beatSheet, setBeats]);

  const handleSave = async () => {
    if (!currentProject) return;

    const toastId = toast.loading("Saving outline...");
    try {
      await saveBeatSheet();
      setCurrentProject({ ...currentProject, metadata: { ...currentProject.metadata, beatSheet } });
      toast.success("Outline saved!", { id: toastId });
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.", { id: toastId });
    }
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

      // Save the new script to the project
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentProject.id,
          metadata: updatedMetadata,
        }),
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end p-4 border-b border-gray-700 bg-gray-800 space-x-2">
        <Button variant="outline" onClick={addBeat}>
          <Plus className="w-4 h-4 mr-2" />
          Add Scene
        </Button>
        <Button variant="outline" onClick={() => setIsFlowModalOpen(true)} disabled={beatSheet.length === 0}>
          <Clapperboard className="w-4 h-4 mr-2" />
          Ask Flow
        </Button>
        <Button onClick={handleSave} disabled={!isBeatSheetDirty || beatSheet.length === 0}>
          <Save className="w-4 h-4 mr-2" />
          {isBeatSheetDirty ? 'Save Outline' : 'Saved'}
        </Button>
        <Button onClick={handleGenerateScript} disabled={isGeneratingScript || beatSheet.length === 0} className="bg-sf-primary-gradient">
          {isGeneratingScript ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          Generate Script
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {(isGenerating || beatSheet.length === 0) ? (
          <div className="flex flex-col h-full items-center justify-center text-center text-gray-400">
            {isGenerating ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto text-gray-500 mb-4 animate-spin" />
                <h3 className="text-lg font-semibold text-white">Generating Scene Outline...</h3>
                <p className="mt-1 text-sm">Flow is creating your initial scenes based on the film treatment.</p>
              </>
            ) : (
              <>
                <Clapperboard className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                <h3 className="text-lg font-semibold text-white">Your Scene Outline is Empty</h3>
                <p className="mt-1 text-sm">
                  Click "+ Add Scene" to begin building your outline.
                </p>
              </>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={beatSheet.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {beatSheet.map((beat, index) => (
                  <BeatCard 
                    key={beat.id} 
                    beat={beat}
                    onUpdate={updateBeat}
                    sceneNumber={index + 1}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeBeat ? (
                <BeatCard 
                  beat={activeBeat} 
                  isDragging 
                  sceneNumber={beatSheet.findIndex(b => b.id === activeId) + 1} 
                  onUpdate={() => {}} 
                />
              ) : null}
            </DragOverlay>
          </DndContext>
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

// Forced re-deployment comment

'use client';

import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { Act, Beat } from '@/types/productionGuide';
import { BeatCard } from './BeatCard';
import { Button } from '@/components/ui/Button';
import { Plus, Sparkles } from 'lucide-react';
import { groupBy } from 'lodash';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
  rectIntersection
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

export function BeatSheetTab() {
  const { guide, updateBeats, addBeat } = useGuideStore();
  const { invokeCue } = useCue();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isAddingBeat, setIsAddingBeat] = useState<string | null>(null);

  // Group beats by act
  const groupedBeats = groupBy(guide.beatSheet, 'act');
  const acts: Act[] = ['ACT_I', 'ACT_IIA', 'ACT_IIB', 'ACT_III'];

  const actLabels = {
    'ACT_I': 'Setup & Stakes',
    'ACT_IIA': 'The Arguments', 
    'ACT_IIB': 'Finding Balance',
    'ACT_III': 'Resolution'
  };

  const actDescriptions = {
    'ACT_I': 'Introduce CRISPR and establish the debate',
    'ACT_IIA': 'Present both sides of the argument', 
    'ACT_IIB': 'Explore common ground and understanding',
    'ACT_III': 'Synthesize and conclude the discussion'
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddBeat = async (act: Act) => {
    setIsAddingBeat(act);
    
    // Create context for AI beat suggestion
    const actContext = {
      act,
      actLabel: actLabels[act as keyof typeof actLabels],
      existingBeats: groupedBeats[act] || [],
      storyContext: guide.title,
      characters: guide.characters.map(c => c.name).join(', ')
    };
    
    // Generate a new beat ID
    const beatId = `beat-${Date.now()}`;
    
    // Create a placeholder beat
    const newBeat: Beat = {
      id: beatId,
      act,
      title: 'New Beat',
      summary: 'Click to get AI suggestions for this beat...',
      charactersPresent: [],
      structuralPurpose: `Support the ${actLabels[act as keyof typeof actLabels]} narrative`
    };
    
    // Add the beat immediately
    addBeat(newBeat);
    
    // Invoke Cue to help refine this beat
    invokeCue({
      type: 'beatCard',
      id: beatId,
      content: `New beat for ${actLabels[act as keyof typeof actLabels]} - suggest title, summary, and structural purpose`
    });
    
    setIsAddingBeat(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setOverId(null);
      return;
    }

    setOverId(over.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active beat
    const activeBeat = guide.beatSheet.find(beat => beat.id === activeId);
    if (!activeBeat) return;

    // Determine if we're dropping on an act column or another beat
    let targetAct: Act;
    let targetIndex: number;

    if (acts.includes(overId as Act)) {
      // Dropping on an act column
      targetAct = overId as Act;
      targetIndex = groupedBeats[targetAct]?.length || 0;
    } else {
      // Dropping on another beat
      const overBeat = guide.beatSheet.find(beat => beat.id === overId);
      if (!overBeat) return;
      
      targetAct = overBeat.act;
      const actBeats = groupedBeats[targetAct] || [];
      targetIndex = actBeats.findIndex(beat => beat.id === overId);
    }

    // Update the beat sheet
    const newBeatSheet = [...guide.beatSheet];
    const beatIndex = newBeatSheet.findIndex(beat => beat.id === activeId);
    
    if (beatIndex !== -1) {
      // Update the beat's act
      newBeatSheet[beatIndex] = { ...activeBeat, act: targetAct };
      
      // If moving within the same act, reorder
      if (activeBeat.act === targetAct) {
        const actBeats = newBeatSheet.filter(beat => beat.act === targetAct);
        const oldIndex = actBeats.findIndex(beat => beat.id === activeId);
        const newIndex = targetIndex;
        
        if (oldIndex !== newIndex) {
          const reorderedBeats = arrayMove(actBeats, oldIndex, newIndex);
          
          // Replace the beats for this act in the main array
          const otherBeats = newBeatSheet.filter(beat => beat.act !== targetAct);
          const updatedBeatSheet = [...otherBeats, ...reorderedBeats];
          updateBeats(updatedBeatSheet);
        }
      } else {
        // Moving to a different act
        updateBeats(newBeatSheet);
      }
    }

    setActiveId(null);
    setOverId(null);
  };

  const getActiveBeat = () => {
    return activeId ? guide.beatSheet.find(beat => beat.id === activeId) : null;
  };

  return (
    <div className="h-full flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-6 overflow-x-auto pb-4 px-2">
          {acts.map(act => (
            <div 
              key={act} 
              id={act}
              className={`min-w-[320px] max-w-[400px] w-[320px] flex-shrink-0 bg-gray-900 rounded-lg flex flex-col h-[calc(100vh-200px)] border transition-colors ${
                overId === act ? 'border-blue-500 bg-gray-800' : 'border-gray-700'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-gray-700 bg-gray-800 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{actLabels[act as keyof typeof actLabels]}</h3>
                    <p className="text-sm text-gray-50 mb-1 font-medium">{actDescriptions[act as keyof typeof actDescriptions]}</p>
                    <p className="text-sm text-gray-100 font-medium">{groupedBeats[act]?.length || 0} beats</p>
                  </div>
                  <Button
                    onClick={() => handleAddBeat(act)}
                    variant="ghost"
                    size="sm"
                    disabled={isAddingBeat === act}
                    className="text-white hover:text-white hover:bg-gray-700 p-2 transition-all duration-200"
                    aria-label={`Add beat to ${actLabels[act as keyof typeof actLabels]}`}
                  >
                    {isAddingBeat === act ? (
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Column Content */}
              <SortableContext
                items={groupedBeats[act]?.map(beat => beat.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {groupedBeats[act]?.map(beat => (
                    <BeatCard 
                      key={beat.id} 
                      beat={beat} 
                      isDragging={activeId === beat.id}
                    />
                  )) || []}
                  
                  {/* Empty state */}
                  {(!groupedBeats[act] || groupedBeats[act].length === 0) && (
                    <div className={`flex flex-col items-center justify-center py-8 transition-colors ${
                      overId === act ? 'text-blue-200' : 'text-gray-100'
                    }`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
                        overId === act ? 'bg-blue-900 border-2 border-blue-500' : 'bg-gray-800'
                      }`}>
                        <Plus className="w-6 h-6" />
                      </div>
                      <p className="text-sm text-center font-medium">
                        {overId === act ? 'Drop beat here' : 'No beats yet'}
                      </p>
                      <p className="text-sm text-center mt-1 font-medium">
                        {overId === act ? '' : 'Click + to add a beat'}
                      </p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-50 rotate-3 scale-105">
              {(() => {
                const beat = getActiveBeat();
                return beat ? <BeatCard beat={beat} isDragging={true} /> : null;
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

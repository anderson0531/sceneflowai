'use client';

import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { Act, Beat } from '@/types/productionGuide';
import { BeatCard } from './BeatCard';
import { BeatTemplateSelector } from './BeatTemplateSelector';
import { ViewModeSwitcher } from './ViewModeSwitcher';
import { TimelineView } from './TimelineView';
import { BoneyardSidebar } from './BoneyardSidebar';
import { StoryInsights } from '@/components/StoryInsights';
import { Button } from '@/components/ui/Button';
import { Plus, Sparkles, Layout, Clapperboard } from 'lucide-react';
import { groupBy } from 'lodash';
import { useState } from 'react';
import { getTemplateById, debateTemplate } from '@/types/beatTemplates';
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

// Icon mapping for dynamic icon rendering
const iconMap = {
  Layout, Plus, Sparkles, Play: Plus, Zap: Sparkles, CheckCircle: Plus, 
  TrendingUp: Plus, TrendingDown: Plus, Camera: Plus, Settings: Plus, 
  Scale: Plus, Home: Plus, MapPin: Plus, Compass: Plus, Skull: Plus, 
  Award: Plus, RotateCcw: Plus, Eye: Plus, Search: Plus, 
  AlertTriangle: Plus, Puzzle: Plus, MessageSquare: Plus, 
  Gamepad2: Plus, Target: Plus, Shield: Plus, Moon: Plus, Crown: Plus,
  BookOpen: Plus, Lightbulb: Plus
};

export function BeatSheetTab() {
  const { guide, updateBeats, addBeat } = useGuideStore();
  const { invokeCue } = useCue();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isAddingBeat, setIsAddingBeat] = useState<string | null>(null);

  // Get current template or fallback to debate template
  const currentTemplate = getTemplateById(guide.beatTemplate || 'debate-educational') || debateTemplate;

  // Group beats by act
  const groupedBeats = groupBy(guide.beatSheet, 'act');
  
  // Use template columns instead of hardcoded acts
  const columns = currentTemplate.columns.sort((a, b) => a.order - b.order);
  const columnIds = columns.map(col => col.id);

  // Create dynamic labels and descriptions from template
  const columnLabels = columns.reduce((acc, col) => {
    acc[col.id] = col.label;
    return acc;
  }, {} as Record<string, string>);

  const columnDescriptions = columns.reduce((acc, col) => {
    acc[col.id] = col.description;
    return acc;
  }, {} as Record<string, string>);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddBeat = async (columnId: string) => {
    setIsAddingBeat(columnId);
    
    // Get column info from template
    const column = columns.find(col => col.id === columnId);
    if (!column) return;
    
    // Create context for AI beat suggestion
    const columnContext = {
      columnId,
      columnLabel: column.label,
      columnDescription: column.description,
      existingBeats: groupedBeats[columnId] || [],
      storyContext: guide.title,
      characters: guide.characters.map(c => c.name).join(', '),
      template: currentTemplate.name
    };
    
    // Generate a new beat ID
    const beatId = `beat-${Date.now()}`;
    
    // Create a placeholder beat
    const newBeat: Beat = {
      id: beatId,
      act: columnId, // Now using dynamic column ID
      title: 'New Beat',
      summary: 'Click to get AI suggestions for this beat...',
      charactersPresent: [],
      structuralPurpose: `Support the ${column.label} narrative`
    };
    
    // Add the beat immediately
    addBeat(newBeat);
    
    // Invoke Cue to help refine this beat
    invokeCue({
      type: 'beatCard',
      id: beatId,
      content: `New beat for ${column.label} - suggest title, summary, and structural purpose`
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

    // Determine if we're dropping on a column or another beat
    let targetAct: string;
    let targetIndex: number;

    if (columnIds.includes(overId)) {
      // Dropping on a column
      targetAct = overId;
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
      {/* Header with Template Selector and View Switcher */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Beat Structure</h2>
          </div>
          <div className="text-base text-gray-200">
            <span className="font-semibold text-blue-300">{currentTemplate.name}</span>
          </div>
          <ViewModeSwitcher />
        </div>
        <BeatTemplateSelector 
          trigger={
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              Change Template
            </Button>
          }
        />
      </div>
      
      {/* Main Content Area with Boneyard */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conditional View Rendering */}
        <div className="flex-1 overflow-hidden">
          {guide.viewMode === 'timeline' ? (
            <TimelineView />
          ) : (
        <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-8 overflow-x-auto pb-6 px-4">
          {columns.map(column => {
            // Get the icon component for this column
            const IconComponent = column.icon ? (iconMap[column.icon as keyof typeof iconMap] || Layout) : Layout;
            
            return (
              <div 
                key={column.id} 
                id={column.id}
                className={`min-w-[340px] max-w-[420px] w-[360px] flex-shrink-0 bg-gray-900 rounded-lg flex flex-col h-[calc(100vh-240px)] border transition-colors ${
                  overId === column.id ? 'border-blue-500 bg-gray-800' : 'border-gray-700'
                }`}
              >
                {/* Column Header */}
                <div className="p-5 border-b border-gray-700 bg-gray-800 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded bg-${column.color}-500/20`}>
                          <IconComponent className={`w-4 h-4 text-${column.color}-400`} />
                        </div>
                                                        <h3 className="text-xl font-bold text-white">{column.label}</h3>
                      </div>
                                                    <p className="text-base text-gray-100 mb-1 font-semibold">{column.description}</p>
                                                    <p className="text-base text-gray-100 font-semibold">{groupedBeats[column.id]?.length || 0} beats</p>
                    </div>
                    <Button
                      onClick={() => handleAddBeat(column.id)}
                      variant="ghost"
                      size="sm"
                      disabled={isAddingBeat === column.id}
                      className="text-white hover:text-white hover:bg-gray-700 p-2 transition-all duration-200"
                      aria-label={`Add beat to ${column.label}`}
                    >
                      {isAddingBeat === column.id ? (
                        <Clapperboard className="w-4 h-4 animate-pulse" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              
                              {/* Column Content */}
                <SortableContext
                  items={groupedBeats[column.id]?.map(beat => beat.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {groupedBeats[column.id]?.map(beat => (
                      <BeatCard 
                        key={beat.id} 
                        beat={beat} 
                        isDragging={activeId === beat.id}
                      />
                    )) || []}
                    
                    {/* Empty state */}
                    {(!groupedBeats[column.id] || groupedBeats[column.id].length === 0) && (
                      <div className={`flex flex-col items-center justify-center py-12 transition-colors ${
                        overId === column.id ? 'text-blue-200' : 'text-gray-100'
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
                          overId === column.id ? 'bg-blue-900 border-2 border-blue-500' : 'bg-gray-800'
                        }`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                                                        <p className="text-base text-center font-semibold">
                          {overId === column.id ? 'Drop beat here' : 'No beats yet'}
                        </p>
                                                        <p className="text-base text-center mt-1 font-semibold">
                          {overId === column.id ? '' : 'Click + to add a beat'}
                        </p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
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
          )}
        </div>
        
                              {/* Right Sidebars */}
                      <div className="flex">
                        <StoryInsights
                          currentStoryData={{
                            title: guide.title,
                            acts: columns.map(col => ({
                              id: col.id,
                              name: col.label,
                              beats: (groupedBeats[col.id] || []).map(beat => ({
                                id: beat.id,
                                title: beat.title,
                                duration: beat.estimatedDuration || 20,
                                summary: beat.summary
                              }))
                            })),
                            characters: guide.characters.map(char => ({
                              id: char.id,
                              name: char.name,
                              motivation: char.motivation || 'Character motivation not specified'
                            })),
                            treatment: {
                              synopsis: guide.title,
                              themes: ['General'],
                              targetAudience: 'General audience'
                            }
                          }}
                        />
                        <BoneyardSidebar />
                      </div>
      </div>
    </div>
  );
}

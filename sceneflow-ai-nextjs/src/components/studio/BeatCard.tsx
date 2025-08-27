'use client';

import { Beat } from '@/types/productionGuide';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVerticalIcon, LightbulbIcon } from 'lucide-react';
import { useCue } from '@/store/useCueStore';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BeatCardProps {
  beat: Beat;
  isDragging?: boolean;
}

export function BeatCard({ beat, isDragging = false }: BeatCardProps) {
  const { activeContext, invokeCue } = useCue();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging
  } = useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Check if this card is currently selected in the context
  const isContextActive = activeContext?.type === 'beatCard' && activeContext?.id === beat.id;
  const isBeingDragged = isDragging || sortableIsDragging;

  const handleCardClick = () => {
    // Don't trigger Cue if we're dragging
    if (isBeingDragged) return;
    
    // Invoke Cue with this beat card's context
    invokeCue({
      type: 'beatCard',
      id: beat.id,
      content: beat.title
    });
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-slate-800 border-gray-600 text-white shadow-lg transition-all duration-200 hover:bg-slate-750 hover:border-gray-500 cursor-pointer w-full max-w-full",
        isContextActive && "ring-2 ring-blue-500 bg-slate-750 border-blue-400",
        isBeingDragged && "opacity-50 scale-105 rotate-2 shadow-xl"
      )}
    >
      <div className="flex w-full">
        <div 
          {...attributes}
          {...listeners}
          className="p-3 cursor-grab active:cursor-grabbing touch-none border-r border-gray-600 flex items-center hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          <GripVerticalIcon className="text-gray-400 w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0" onClick={handleCardClick}>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-lg font-bold text-white leading-tight">{beat.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-base text-gray-100 mb-3 line-clamp-4 leading-relaxed break-words whitespace-normal">{beat.summary}</p>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                  {beat.charactersPresent.length} Characters
                </span>
                {isContextActive && (
                  <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-500/30">
                    Active in Cue
                  </span>
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <LightbulbIcon className="w-4 h-4 text-yellow-500 hover:text-yellow-400 transition-colors"/>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-gray-700 text-white border border-gray-600">
                    <p className="font-semibold text-yellow-400">Structural Purpose:</p>
                    <p className="text-sm mt-1">{beat.structuralPurpose}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

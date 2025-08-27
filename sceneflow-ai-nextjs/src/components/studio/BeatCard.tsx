'use client';

import { Beat } from '@/types/productionGuide';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVerticalIcon, LightbulbIcon, Settings, Users, Scale, CheckCircle, Tag } from 'lucide-react';
import { useCue } from '@/store/useCueStore';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BeatCardProps {
  beat: Beat;
  isDragging?: boolean;
}

// Column icon configuration
const getColumnIcon = (act: string) => {
  const iconConfig = {
    'ACT_I': { icon: LightbulbIcon, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Setup' },
    'ACT_IIA': { icon: Settings, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Arguments' },
    'ACT_IIB': { icon: Scale, color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Balance' },
    'ACT_III': { icon: CheckCircle, color: 'text-purple-500', bgColor: 'bg-purple-500/10', label: 'Resolution' }
  };
  return iconConfig[act as keyof typeof iconConfig] || iconConfig['ACT_I'];
};

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
  
  // Get column icon configuration
  const columnConfig = getColumnIcon(beat.act);
  const ColumnIcon = columnConfig.icon;
  
  // Mock data for interactive labels (in real app, this would come from the beat data)
  const keywordCount = Math.floor(Math.random() * 4); // 0-3 keywords

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
          className="p-4 cursor-grab active:cursor-grabbing touch-none border-r border-gray-600 flex items-center hover:bg-slate-700 transition-colors flex-shrink-0"
        >
          <GripVerticalIcon className="text-gray-100 w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0" onClick={handleCardClick}>
          <CardHeader className="pb-3 p-5">
            {/* Column Icon and Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className={cn("p-1.5 rounded-md", columnConfig.bgColor)}>
                <ColumnIcon className={cn("w-4 h-4", columnConfig.color)} />
              </div>
              <span className={cn("text-xs font-medium uppercase tracking-wide", columnConfig.color)}>
                {columnConfig.label}
              </span>
            </div>
            
            {/* Improved Title Typography */}
            <CardTitle className="text-xl font-bold text-white leading-tight mb-2">{beat.title}</CardTitle>
          </CardHeader>
          
          <CardContent className="p-5 pt-0">
            {/* Improved Description Typography */}
            <p className="text-base text-gray-100 font-normal mb-4 line-clamp-4 leading-relaxed break-words whitespace-normal">
              {beat.summary}
            </p>
            
            {/* Interactive Labels and Actions */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                {/* Characters Badge */}
                <span className="text-sm text-white bg-gray-700 px-3 py-1.5 rounded-md font-semibold border border-gray-600">
                  <Users className="w-3 h-3 inline mr-1" />
                  {beat.charactersPresent.length} Characters
                </span>
                
                {/* Interactive Keywords Label */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-sm text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 px-2 py-1 rounded transition-colors">
                        <Tag className="w-3 h-3 inline mr-1" />
                        {keywordCount} keywords
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                      <p>{keywordCount > 0 ? `View ${keywordCount} keywords` : 'No keywords found'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {/* Active in Cue Badge */}
                {isContextActive && (
                  <span className="text-sm text-blue-100 bg-blue-800/50 px-3 py-1.5 rounded-md font-semibold border border-blue-500/50">
                    Active in Cue
                  </span>
                )}
              </div>
              
              {/* Structural Purpose Tooltip */}
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

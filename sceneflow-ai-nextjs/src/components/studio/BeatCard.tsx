'use client';

import React, { useState } from 'react';
import { Beat, BeatFunction, EmotionalCharge } from '@/types/productionGuide';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  GripVerticalIcon, LightbulbIcon, Settings, Users, Scale, CheckCircle, Tag,
  HelpCircle, Swords, Zap, Eye, ArrowUp, ArrowDown, TrendingUp, TrendingDown,
  Target, RefreshCw, RotateCcw, ChevronDown, ChevronUp, Clock, MapPin, 
  Sun, Moon, Cloud, Palette, Camera, MoreHorizontal, Link, Split, Merge,
  Trash2, Archive, MoreVertical, Clapperboard
} from 'lucide-react';
import { useCue } from '@/store/useCueStore';
import { useGuideStore } from '@/store/useGuideStore';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BeatCardProps {
  beat: Beat;
  isDragging?: boolean;
}

// Beat function icon mapping
const getBeatFunctionIcon = (beatFunction?: BeatFunction) => {
  const iconMap = {
    'inciting_incident': { icon: HelpCircle, color: 'text-orange-500', label: 'Inciting Incident' },
    'plot_point': { icon: Target, color: 'text-red-500', label: 'Plot Point' },
    'conflict': { icon: Swords, color: 'text-red-600', label: 'Conflict' },
    'revelation': { icon: Eye, color: 'text-purple-500', label: 'Revelation' },
    'climax': { icon: Zap, color: 'text-yellow-500', label: 'Climax' },
    'resolution': { icon: CheckCircle, color: 'text-green-500', label: 'Resolution' },
    'setup': { icon: Settings, color: 'text-blue-500', label: 'Setup' },
    'payoff': { icon: Target, color: 'text-green-600', label: 'Payoff' },
    'transition': { icon: RefreshCw, color: 'text-gray-500', label: 'Transition' },
    'character_development': { icon: Users, color: 'text-indigo-500', label: 'Character Development' },
    'exposition': { icon: LightbulbIcon, color: 'text-yellow-400', label: 'Exposition' },
    'rising_action': { icon: TrendingUp, color: 'text-orange-500', label: 'Rising Action' },
    'falling_action': { icon: TrendingDown, color: 'text-blue-400', label: 'Falling Action' },
    'complication': { icon: MoreHorizontal, color: 'text-red-400', label: 'Complication' },
    'turning_point': { icon: RotateCcw, color: 'text-purple-600', label: 'Turning Point' }
  };
  return iconMap[beatFunction as keyof typeof iconMap] || { icon: MoreHorizontal, color: 'text-gray-400', label: 'Unknown' };
};

// Emotional charge indicator
const getEmotionalChargeIndicator = (charge?: EmotionalCharge) => {
  switch (charge) {
    case 'very_negative': return { color: 'bg-red-600', symbol: '--', label: 'Very Negative' };
    case 'negative': return { color: 'bg-red-400', symbol: '-', label: 'Negative' };
    case 'neutral': return { color: 'bg-gray-400', symbol: '=', label: 'Neutral' };
    case 'positive': return { color: 'bg-green-400', symbol: '+', label: 'Positive' };
    case 'very_positive': return { color: 'bg-green-600', symbol: '++', label: 'Very Positive' };
    default: return { color: 'bg-gray-400', symbol: '?', label: 'Unknown' };
  }
};

// Generate character initials and colors
const getCharacterAvatar = (characterId: string, characters: any[]) => {
  const character = characters.find(c => c.id === characterId);
  if (!character) return { initials: '?', color: 'bg-gray-500' };
  
  const initials = character.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2);
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
    'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
  ];
  const colorIndex = characterId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
  
  return { 
    initials, 
    color: colors[colorIndex], 
    name: character.name,
    archetype: character.archetype 
  };
};

// Column icon configuration (keeping existing for backward compatibility)
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
  const { guide, splitBeat, moveToBoneyard } = useGuideStore();
  const [showProductionTags, setShowProductionTags] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
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
  
  // Get visual metadata
  const beatFunctionConfig = getBeatFunctionIcon(beat.beatFunction);
  const BeatFunctionIcon = beatFunctionConfig.icon;
  const emotionalCharge = getEmotionalChargeIndicator(beat.emotionalCharge);
  const columnConfig = getColumnIcon(beat.act);
  const ColumnIcon = columnConfig.icon;

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
        "group bg-slate-800 border-gray-600 text-white shadow-lg transition-all duration-200 hover:bg-slate-750 hover:border-gray-500 cursor-pointer w-full max-w-full",
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
                    {/* Visual Metadata Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Beat Function Icon */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="p-1.5 rounded-md bg-gray-700/50 border border-gray-600">
                                <BeatFunctionIcon className={cn("w-4 h-4", beatFunctionConfig.color)} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                              <p className="font-semibold">{beatFunctionConfig.label}</p>
                              <p className="text-sm text-gray-200">Narrative function of this beat</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Column Context */}
                        <div className={cn("p-1.5 rounded-md", columnConfig.bgColor)}>
                          <ColumnIcon className={cn("w-4 h-4", columnConfig.color)} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Beat Actions Menu */}
                        <div className="relative">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActions(!showActions);
                                  }}
                                  className="p-1 h-6 w-6 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                                <p>Beat Actions</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Actions Dropdown */}
                          {showActions && (
                            <div className="absolute top-6 right-0 z-20 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-[140px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  splitBeat(beat.id);
                                  setShowActions(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Split className="w-3 h-3" />
                                Split Beat
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveToBoneyard(beat.id, 'Moved by user');
                                  setShowActions(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Archive className="w-3 h-3" />
                                Move to Boneyard
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  invokeCue({
                                    type: 'beatCard',
                                    content: `Generate alternative versions of "${beat.title}"`,
                                    id: beat.id
                                  });
                                  setShowActions(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Clapperboard className="w-3 h-3" />
                                Generate Alternatives
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Emotional Charge Indicator */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={cn("w-8 h-3 rounded-full flex items-center justify-center", emotionalCharge.color)}>
                                <span className="text-white text-xs font-bold">{emotionalCharge.symbol}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                              <p className="font-semibold">{emotionalCharge.label}</p>
                              <p className="text-sm text-gray-200">Emotional trajectory</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    {/* Title with Character Avatars */}
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl font-bold text-white leading-tight flex-1 mr-2">
                        {beat.title}
                      </CardTitle>
                      
                      {/* Character Avatars */}
                      <div className="flex -space-x-1">
                        {(beat.charactersPresent || []).slice(0, 3).map((characterId, index) => {
                          const avatar = getCharacterAvatar(characterId, guide.characters);
                          return (
                            <TooltipProvider key={characterId}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-gray-700 hover:scale-110 transition-transform",
                                      avatar.color
                                    )}
                                    style={{ zIndex: 10 - index }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // TODO: Navigate to character breakdown
                                      invokeCue({
                                        type: 'character',
                                        content: avatar.name,
                                        id: characterId
                                      });
                                    }}
                                  >
                                    {avatar.initials}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                                  <p className="font-semibold">{avatar.name}</p>
                                  <p className="text-sm text-gray-200">{avatar.archetype}</p>
                                  <p className="text-xs text-gray-300 mt-1">Click to view character details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                        {(beat.charactersPresent || []).length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold border-2 border-gray-700">
                            +{(beat.charactersPresent || []).length - 3}
                          </div>
                        )}
                      </div>
      </div>
        </CardHeader>
          
          <CardContent className="p-5 pt-0">
            {/* Description */}
            <p className="text-base text-white font-normal mb-4 line-clamp-3 leading-relaxed break-words whitespace-normal">
              {beat.summary}
            </p>
            
            {/* Keywords (Visual Pills) */}
            {beat.keywords && beat.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {beat.keywords.slice(0, 4).map((keyword, index) => (
                  <Badge 
                    key={index}
                    className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                  >
                    {keyword}
                  </Badge>
                ))}
                {beat.keywords.length > 4 && (
                  <Badge className="text-xs bg-gray-500/20 text-gray-300 border border-gray-500/30">
                    +{beat.keywords.length - 4} more
                  </Badge>
                )}
              </div>
            )}
            
            {/* Footer Actions */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {/* Production Tags Toggle (Expert Feature) */}
                {beat.productionTags && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowProductionTags(!showProductionTags);
                          }}
                          className="p-1 h-6 w-6 text-gray-400 hover:text-white"
                        >
                          <Camera className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                        <p className="font-semibold">Production Tags</p>
                        <p className="text-sm text-gray-200">Expert metadata for shot planning</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Active in Cue Badge */}
                {isContextActive && (
                  <Badge className="text-xs text-blue-100 bg-blue-800/50 border border-blue-500/50">
                    Active in Cue
                  </Badge>
                )}
              </div>
              
              {/* Structural Purpose */}
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

            {/* Production Tags (Progressive Disclosure) */}
            {showProductionTags && beat.productionTags && (
              <div className="mt-4 pt-3 border-t border-gray-600 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    Production Tags
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProductionTags(false);
                    }}
                    className="p-1 h-5 w-5 text-gray-400 hover:text-white"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {beat.productionTags.location && (
                    <div className="flex items-center gap-1 text-gray-300">
                      <MapPin className="w-3 h-3" />
                      <span>{beat.productionTags.locationType} - {beat.productionTags.location}</span>
                    </div>
                  )}
                  {beat.productionTags.timeOfDay && (
                    <div className="flex items-center gap-1 text-gray-300">
                      {beat.productionTags.timeOfDay === 'DAY' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                      <span>{beat.productionTags.timeOfDay}</span>
                    </div>
                  )}
                  {beat.productionTags.mood && (
                    <div className="flex items-center gap-1 text-gray-300">
                      <Palette className="w-3 h-3" />
                      <span>{beat.productionTags.mood}</span>
                    </div>
                  )}
                  {beat.productionTags.weatherCondition && (
                    <div className="flex items-center gap-1 text-gray-300">
                      <Cloud className="w-3 h-3" />
                      <span>{beat.productionTags.weatherCondition}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
        </CardContent>
        </div>
      </div>
    </Card>
  );
}

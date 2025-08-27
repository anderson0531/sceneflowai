'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Edit,
  Zap,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Users,
  MoreHorizontal,
  Ruler,
  BarChart3
} from 'lucide-react';
import { Beat } from '@/types/productionGuide';
import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { getTemplateById, debateTemplate } from '@/types/beatTemplates';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineViewProps {
  className?: string;
}

interface TimelineBeat extends Beat {
  widthPercentage: number;
  leftOffset: number;
}

export function TimelineView({ className }: TimelineViewProps) {
  const { guide, updateBeatTiming } = useGuideStore();
  const { invokeCue } = useCue();
  const [selectedBeat, setSelectedBeat] = useState<string | null>(null);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Get current template
  const currentTemplate = getTemplateById(guide.beatTemplate || 'debate-educational') || debateTemplate;

  // Calculate timeline data
  const timelineData = useMemo(() => {
    const beats = guide.beatSheet.filter(beat => beat.estimatedDuration && beat.startTime !== undefined);
    const totalDuration = Math.max(...beats.map(beat => (beat.startTime || 0) + (beat.estimatedDuration || 0)));
    
    const timelineBeats: TimelineBeat[] = beats.map(beat => ({
      ...beat,
      widthPercentage: ((beat.estimatedDuration || 0) / totalDuration) * 100,
      leftOffset: ((beat.startTime || 0) / totalDuration) * 100
    }));

    return {
      beats: timelineBeats,
      totalDuration,
      isEmpty: beats.length === 0
    };
  }, [guide.beatSheet]);

  const getPacingColor = (pacing?: Beat['pacing']) => {
    switch (pacing) {
      case 'slow': return 'bg-blue-500';
      case 'medium': return 'bg-green-500';
      case 'fast': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getImportanceColor = (importance?: Beat['importance']) => {
    switch (importance) {
      case 'low': return 'border-gray-400';
      case 'medium': return 'border-yellow-400';
      case 'high': return 'border-orange-400';
      case 'critical': return 'border-red-400';
      default: return 'border-gray-500';
    }
  };

  const getImportanceIcon = (importance?: Beat['importance']) => {
    switch (importance) {
      case 'critical': return AlertTriangle;
      case 'high': return CheckCircle;
      case 'medium': return Clock;
      case 'low': return MoreHorizontal;
      default: return MoreHorizontal;
    }
  };

  const formatTime = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBeatClick = (beat: Beat) => {
    setSelectedBeat(beat.id);
    invokeCue({
      type: 'beatCard',
      content: beat.title,
      id: beat.id
    });
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement actual playback functionality
  };

  const generateTimeMarkers = () => {
    const markers = [];
    const interval = Math.max(1, Math.floor(timelineData.totalDuration / 10));
    
    for (let i = 0; i <= timelineData.totalDuration; i += interval) {
      markers.push(
        <div
          key={i}
          className="absolute top-0 h-full border-l border-gray-600"
          style={{ left: `${(i / timelineData.totalDuration) * 100}%` }}
        >
          <div className="absolute -top-6 -ml-4 text-xs text-gray-400 font-mono">
            {formatTime(i)}
          </div>
        </div>
      );
    }
    
    return markers;
  };

  if (timelineData.isEmpty) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">No Timeline Data</h3>
            <p className="text-gray-300 max-w-md">
              Add duration and timing information to your beats to see them in timeline view.
            </p>
            <Button
              onClick={() => invokeCue({
                type: 'template',
                content: 'Help me add timing information to my beats for timeline view',
                id: 'timeline-setup'
              })}
              className="mt-4"
            >
              <Zap className="w-4 h-4 mr-2" />
              Ask Cue to Add Timing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlayheadPosition(0)}
              className="p-2"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="p-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlayheadPosition(timelineData.totalDuration)}
              className="p-2"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Timeline Info */}
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Total: {formatTime(timelineData.totalDuration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span>{timelineData.beats.length} beats</span>
            </div>
          </div>
        </div>

        {/* Timeline Tools */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => invokeCue({
              type: 'template',
              content: 'Analyze the pacing of my timeline and suggest improvements',
              id: 'pacing-analysis'
            })}
          >
            <Gauge className="w-4 h-4 mr-2" />
            Analyze Pacing
          </Button>
        </div>
      </div>

      {/* Timeline Ruler */}
      <div className="relative h-8 bg-gray-900 border-b border-gray-700">
        {generateTimeMarkers()}
      </div>

      {/* Timeline Track */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="relative h-32 bg-gray-900 rounded-lg border border-gray-700 mb-6">
          {/* Playhead */}
          <div
            className="absolute top-0 h-full w-0.5 bg-yellow-400 z-20 pointer-events-none"
            style={{ left: `${(playheadPosition / timelineData.totalDuration) * 100}%` }}
          >
            <div className="absolute -top-2 -ml-2 w-4 h-4 bg-yellow-400 rotate-45" />
          </div>

          {/* Beat Blocks */}
          {timelineData.beats.map((beat) => {
            const ImportanceIcon = getImportanceIcon(beat.importance);
            const isSelected = selectedBeat === beat.id;
            
            return (
              <TooltipProvider key={beat.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute top-4 h-20 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg",
                        getPacingColor(beat.pacing),
                        getImportanceColor(beat.importance),
                        isSelected ? "ring-2 ring-blue-500 shadow-lg scale-105 z-10" : "hover:scale-102"
                      )}
                      style={{
                        left: `${beat.leftOffset}%`,
                        width: `${Math.max(beat.widthPercentage, 2)}%`
                      }}
                      onClick={() => handleBeatClick(beat)}
                    >
                      <div className="p-2 h-full flex flex-col justify-between text-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate">{beat.title}</h4>
                            <div className="flex items-center gap-1 text-xs opacity-90">
                              <Clock className="w-3 h-3" />
                              <span>{beat.estimatedDuration}min</span>
                            </div>
                          </div>
                          <ImportanceIcon className="w-4 h-4 flex-shrink-0" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span className="text-xs">{beat.charactersPresent.length}</span>
                          </div>
                          <Badge 
                            className={cn(
                              "text-xs px-1 py-0",
                              beat.pacing === 'fast' ? "bg-red-600" :
                              beat.pacing === 'slow' ? "bg-blue-600" : "bg-green-600"
                            )}
                          >
                            {beat.pacing}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-gray-700 text-white border border-gray-600">
                    <div className="space-y-2">
                      <p className="font-semibold">{beat.title}</p>
                      <p className="text-sm text-gray-200">{beat.summary}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Duration: {beat.estimatedDuration}min</div>
                        <div>Start: {formatTime(beat.startTime || 0)}</div>
                        <div>Pacing: {beat.pacing}</div>
                        <div>Importance: {beat.importance}</div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Beat Details Panel */}
        {selectedBeat && (
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Beat Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBeat(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const beat = timelineData.beats.find(b => b.id === selectedBeat);
                if (!beat) return null;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300">Duration (minutes)</label>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white">{beat.estimatedDuration}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement duration editing
                              invokeCue({
                                type: 'beatCard',
                                content: `Help me adjust the timing for "${beat.title}"`,
                                id: beat.id
                              });
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Start Time</label>
                        <div className="text-white mt-1">{formatTime(beat.startTime || 0)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Pacing</label>
                        <Badge className={cn("mt-1", getPacingColor(beat.pacing))}>
                          {beat.pacing}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-300">Importance</label>
                        <Badge className={cn("mt-1", getImportanceColor(beat.importance))}>
                          {beat.importance}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-300">Summary</label>
                      <p className="text-gray-200 text-sm mt-1 leading-relaxed">{beat.summary}</p>
                    </div>
                    
                    <Button
                      onClick={() => invokeCue({
                        type: 'beatCard',
                        content: beat.title,
                        id: beat.id
                      })}
                      className="w-full"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Refine with Cue
                    </Button>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { 
  LayoutGrid, 
  Clock, 
  BarChart3,
  Info 
} from 'lucide-react';
import { ViewMode } from '@/types/productionGuide';
import { useGuideStore } from '@/store/useGuideStore';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ViewModeSwitcherProps {
  className?: string;
}

export function ViewModeSwitcher({ className }: ViewModeSwitcherProps) {
  const { guide, setViewMode } = useGuideStore();
  const currentMode = guide.viewMode || 'kanban';

  const viewModes = [
    {
      id: 'kanban' as ViewMode,
      label: 'Kanban View',
      description: 'Organize beats by story structure for high-level sequence planning',
      icon: LayoutGrid,
      color: 'blue',
      isExpert: false
    },
    {
      id: 'timeline' as ViewMode,
      label: 'Timeline View',
      description: 'Visualize beats by duration and timing for precise pacing control',
      icon: Clock,
      color: 'purple',
      isExpert: true
    }
  ];

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
        {viewModes.map((mode) => {
          const IconComponent = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <TooltipProvider key={mode.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleModeChange(mode.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 transition-all duration-200",
                      isActive 
                        ? `bg-${mode.color}-600 text-white hover:bg-${mode.color}-700` 
                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="font-medium">{mode.label}</span>
                    {mode.isExpert && (
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-yellow-400 font-semibold">EXPERT</span>
                      </div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  className="max-w-xs bg-gray-700 text-white border border-gray-600"
                  side="bottom"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{mode.label}</p>
                    <p className="text-sm text-gray-200">{mode.description}</p>
                    {mode.isExpert && (
                      <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium">
                        <BarChart3 className="w-3 h-3" />
                        Expert Feature - Advanced pacing control
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
      
      {/* View Mode Info */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-white">
              <Info className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm bg-gray-700 text-white border border-gray-600">
            <div className="space-y-2">
              <p className="font-semibold text-white">View Modes</p>
              <div className="space-y-1 text-sm">
                <p><strong>Kanban:</strong> Best for organizing story structure and sequence</p>
                <p><strong>Timeline:</strong> Perfect for timing, pacing, and duration control</p>
              </div>
              <p className="text-xs text-gray-300 mt-2">
                Switch between views to match your creative workflow
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

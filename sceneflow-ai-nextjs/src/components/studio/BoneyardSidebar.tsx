'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  RotateCcw,
  Lightbulb,
  Sparkles,
  Clock,
  User,
  X,
  AlertCircle,
  FileText,
  Zap
} from 'lucide-react';
import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { getTemplateById, debateTemplate } from '@/types/beatTemplates';
import { BoneyardItem } from '@/types/productionGuide';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BoneyardSidebarProps {
  className?: string;
}

export function BoneyardSidebar({ className }: BoneyardSidebarProps) {
  const { guide, toggleBoneyard, restoreFromBoneyard, removeFromBoneyard, clearBoneyard, addToBoneyard } = useGuideStore();
  const { invokeCue } = useCue();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const isCollapsed = guide.boneyardCollapsed ?? true;
  const boneyardItems = guide.boneyard || [];
  const currentTemplate = getTemplateById(guide.beatTemplate || 'debate-educational') || debateTemplate;

  const handleRestoreBeat = (item: BoneyardItem, targetAct?: string) => {
    const act = targetAct || currentTemplate.columns[0]?.id || 'ACT_I';
    restoreFromBoneyard(item.id, act);
  };

  const handleDeleteItem = (itemId: string) => {
    removeFromBoneyard(itemId);
    setSelectedItems(prev => prev.filter(id => id !== itemId));
  };

  const handleGenerateAlternatives = () => {
    invokeCue({
      type: 'template',
      content: 'Generate alternative beat ideas for my story based on the current structure and theme',
      id: 'boneyard-alternatives'
    });
  };

  const getSourceIcon = (source: BoneyardItem['source']) => {
    switch (source) {
      case 'cue_generated': return Sparkles;
      case 'alternative_idea': return Lightbulb;
      case 'user_moved': return User;
      default: return FileText;
    }
  };

  const getSourceColor = (source: BoneyardItem['source']) => {
    switch (source) {
      case 'cue_generated': return 'text-purple-400';
      case 'alternative_idea': return 'text-yellow-400';
      case 'user_moved': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div 
      className={cn(
        "h-full bg-gray-900 border-l border-gray-700 flex flex-col transition-all duration-300",
        isCollapsed ? "w-12" : "w-80",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-white">Boneyard</h3>
            {boneyardItems.length > 0 && (
              <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {boneyardItems.length}
              </Badge>
            )}
          </div>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBoneyard}
                className="p-2 text-gray-400 hover:text-white"
              >
                {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "left" : "bottom"} className="bg-gray-700 text-white border border-gray-600">
              <p>{isCollapsed ? 'Expand Boneyard' : 'Collapse Boneyard'}</p>
              <p className="text-xs text-gray-300">Parking lot for unused beats and alternative ideas</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <>
          {/* Actions Bar */}
          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateAlternatives}
                      className="flex-1 text-xs"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Generate Ideas
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                    <p>Ask Cue to generate alternative beat ideas</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {boneyardItems.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearBoneyard}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                      <p>Clear all items from boneyard</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {boneyardItems.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <h4 className="text-sm font-medium text-gray-400 mb-1">Empty Boneyard</h4>
                <p className="text-xs text-gray-500 mb-4">
                  Drag beats here or use "Generate Ideas" to populate with alternatives
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAlternatives}
                  className="text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Get Started
                </Button>
              </div>
            ) : (
              boneyardItems.map((item) => {
                const SourceIcon = getSourceIcon(item.source);
                const sourceColor = getSourceColor(item.source);
                
                return (
                  <Card key={item.id} className="bg-gray-800 border-gray-600 hover:bg-gray-750 transition-colors">
                    <CardHeader className="pb-2 p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-medium text-white leading-tight mb-1">
                            {item.beat.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <SourceIcon className={cn("w-3 h-3", sourceColor)} />
                            <span>{formatTimeAgo(item.addedAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRestoreBeat(item)}
                                  className="p-1 h-6 w-6 text-green-400 hover:text-green-300"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                                <p>Restore to story</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 h-6 w-6 text-red-400 hover:text-red-300"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-700 text-white border border-gray-600">
                                <p>Delete permanently</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed mb-2">
                        {item.beat.summary}
                      </p>
                      
                      {item.reason && (
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>{item.reason}</span>
                        </div>
                      )}
                      
                      {/* Quick Actions */}
                      <div className="flex gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            invokeCue({
                              type: 'beatCard',
                              content: item.beat.title,
                              id: item.beat.id
                            });
                          }}
                          className="text-xs px-2 py-1 h-6 text-blue-400 hover:text-blue-300"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Refine
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestoreBeat(item)}
                          className="text-xs px-2 py-1 h-6 text-green-400 hover:text-green-300"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Use
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          {boneyardItems.length > 0 && (
            <div className="p-3 border-t border-gray-700 bg-gray-800">
              <p className="text-xs text-gray-400 text-center">
                {boneyardItems.length} item{boneyardItems.length !== 1 ? 's' : ''} in boneyard
              </p>
            </div>
          )}
        </>
      )}

      {/* Collapsed State Icon */}
      {isCollapsed && boneyardItems.length > 0 && (
        <div className="p-3 flex flex-col items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Archive className="w-6 h-6 text-orange-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{boneyardItems.length}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-gray-700 text-white border border-gray-600">
                <p>{boneyardItems.length} items in boneyard</p>
                <p className="text-xs text-gray-300">Click to expand</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

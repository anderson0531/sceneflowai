'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Layout, 
  BookOpen, 
  Lightbulb, 
  Sparkles,
  Play,
  Zap,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Camera,
  Settings,
  Scale,
  Home,
  MapPin,
  Compass,
  Skull,
  Award,
  RotateCcw,
  Eye,
  Search,
  AlertTriangle,
  Puzzle,
  MessageSquare,
  Gamepad2,
  Target,
  Shield,
  Moon,
  Crown
} from 'lucide-react';
import { allTemplates, BeatTemplate, getTemplatesByCategory } from '@/types/beatTemplates';
import { useGuideStore } from '@/store/useGuideStore';
import { useCue } from '@/store/useCueStore';
import { cn } from '@/lib/utils';

// Icon mapping for dynamic icon rendering
const iconMap = {
  Layout, BookOpen, Lightbulb, Sparkles, Play, Zap, CheckCircle, TrendingUp, TrendingDown,
  Camera, Settings, Scale, Home, MapPin, Compass, Skull, Award, RotateCcw, Eye, Search,
  AlertTriangle, Puzzle, MessageSquare, Gamepad2, Target, Shield, Moon, Crown
};

interface BeatTemplateSelectorProps {
  trigger?: React.ReactNode;
  onTemplateChange?: (templateId: string) => void;
}

export function BeatTemplateSelector({ trigger, onTemplateChange }: BeatTemplateSelectorProps) {
  const { guide, applyBeatTemplate } = useGuideStore();
  const { invokeCue } = useCue();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(guide.beatTemplate || 'debate-educational');
  const [preserveBeats, setPreserveBeats] = useState(true);

  const currentTemplate = allTemplates.find(t => t.id === selectedTemplate);
  const hasExistingBeats = guide.beatSheet.length > 0;

  const handleApplyTemplate = () => {
    applyBeatTemplate(selectedTemplate, preserveBeats);
    onTemplateChange?.(selectedTemplate);
    
    // Invoke Cue with context about the template change
    const template = allTemplates.find(t => t.id === selectedTemplate);
    if (template) {
      invokeCue({
        type: 'template',
        content: `Applied ${template.name} template`,
        id: selectedTemplate
      });
    }
    
    setIsOpen(false);
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || Layout;
  };

  const getCategoryColor = (category: BeatTemplate['category']) => {
    switch (category) {
      case 'classical': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'modern': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'genre-specific': return 'bg-green-500/10 text-green-400 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getCategoryLabel = (category: BeatTemplate['category']) => {
    switch (category) {
      case 'classical': return 'Classical';
      case 'modern': return 'Modern';
      case 'genre-specific': return 'Genre-Specific';
      default: return 'Other';
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="flex items-center gap-2">
      <Layout className="w-4 h-4" />
      Change Structure
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Choose Beat Structure Template
          </DialogTitle>
          <DialogDescription>
            Select a storytelling framework that best fits your project. Each template provides a proven structure for organizing your narrative beats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Template Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Quick Select:</label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {allTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(template.category)}>
                        {getCategoryLabel(template.category)}
                      </Badge>
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Template Categories */}
          <div className="space-y-4">
            {['classical', 'modern', 'genre-specific'].map(category => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold text-white capitalize">
                  {getCategoryLabel(category as BeatTemplate['category'])} Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getTemplatesByCategory(category as BeatTemplate['category']).map(template => (
                    <Card 
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:bg-slate-750",
                        selectedTemplate === template.id 
                          ? "ring-2 ring-blue-500 bg-slate-750" 
                          : "bg-slate-800 border-gray-600"
                      )}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg text-white">{template.name}</CardTitle>
                          <Badge className={getCategoryColor(template.category)}>
                            {template.columns.length} Acts
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {template.description}
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {template.columns.map(column => {
                            const IconComponent = getIconComponent(column.icon);
                            return (
                              <div 
                                key={column.id}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border",
                                  `text-${column.color}-400 bg-${column.color}-500/10 border-${column.color}-500/20`
                                )}
                              >
                                <IconComponent className="w-3 h-3" />
                                {column.label}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Template Preview */}
          {currentTemplate && (
            <div className="border border-gray-600 rounded-lg p-4 bg-slate-750">
              <h4 className="text-lg font-semibold text-white mb-3">
                Preview: {currentTemplate.name}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentTemplate.columns.map(column => {
                  const IconComponent = getIconComponent(column.icon);
                  return (
                    <div key={column.id} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          "p-1.5 rounded",
                          `bg-${column.color}-500/20`
                        )}>
                          <IconComponent className={cn(
                            "w-4 h-4",
                            `text-${column.color}-400`
                          )} />
                        </div>
                        <h5 className="font-medium text-white text-sm">{column.label}</h5>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {column.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Options */}
          {hasExistingBeats && (
            <div className="space-y-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-medium text-amber-200">Existing Beats Detected</span>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="preserveBeats"
                    checked={preserveBeats}
                    onChange={(e) => setPreserveBeats(e.target.checked)}
                    className="text-blue-500"
                  />
                  <span className="text-sm text-gray-200">
                    Keep existing beats and adapt them to the new structure
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="preserveBeats"
                    checked={!preserveBeats}
                    onChange={(e) => setPreserveBeats(!e.target.checked)}
                    className="text-blue-500"
                  />
                  <span className="text-sm text-gray-200">
                    Start fresh with the new template structure
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-600">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  invokeCue({
                    type: 'template',
                    content: `Help me choose the best template for: ${guide.title}`,
                    id: 'template-suggestion'
                  });
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Ask Cue for Suggestions
              </Button>
              <Button onClick={handleApplyTemplate}>
                Apply Template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

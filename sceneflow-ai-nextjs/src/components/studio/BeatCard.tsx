'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Beat } from '@/store/useStore';
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { GripVertical, MoreVertical, Trash2, Edit, Sparkles, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BeatCardProps {
  beat: Beat;
  sceneNumber: number;
  onUpdate: (beatId: string, updates: Partial<Beat>) => void;
  onDelete: (beatId: string) => void;
  isDragging?: boolean;
}

export function BeatCard({ beat, sceneNumber, onUpdate, onDelete, isDragging = false }: BeatCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [slugline, setSlugline] = useState(beat.slugline);
  const [summary, setSummary] = useState(beat.summary || '');
  const [objective, setObjective] = useState(beat.objective || '');
  const [keyAction, setKeyAction] = useState(beat.keyAction || '');
  const [emotionalTone, setEmotionalTone] = useState<Beat['emotionalTone']>(beat.emotionalTone || 'Tense');
  const [thumbUrl, setThumbUrl] = useState<string | null>(beat.thumbnailUrl || null);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);

  useEffect(() => {
    setSlugline(beat.slugline);
    setSummary(beat.summary || '');
    setObjective(beat.objective || '');
    setKeyAction(beat.keyAction || '');
    setEmotionalTone((beat.emotionalTone as any) || 'Tense');
    setThumbUrl(beat.thumbnailUrl || null);
  }, [beat]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: beat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Lightweight proactive suggestion
  const suggestion = useMemo(() => {
    if (!summary || summary.length <= 240) return null
    const over = summary.length - 220
    return {
      title: 'Pacing suggestion',
      detail: `Consider shortening this scene by ~${over} characters to improve momentum.`,
      apply: () => {
        const trimmed = summary.slice(0, 220).replace(/\s+\S*$/, '…')
        onUpdate(beat.id, { summary: trimmed })
      }
    }
  }, [summary, beat.id, onUpdate])
  
  const handleSave = () => {
    onUpdate(beat.id, { slugline, summary, objective, keyAction, emotionalTone, thumbnailUrl: thumbUrl });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSlugline(beat.slugline);
    setSummary(beat.summary || '');
    setObjective(beat.objective || '');
    setKeyAction(beat.keyAction || '');
    setEmotionalTone((beat.emotionalTone as any) || 'Tense');
    setThumbUrl(beat.thumbnailUrl || null);
  };

  const generateThumbnail = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!slugline && !summary) return;
    setIsGeneratingThumb(true);
    try {
      const userId = (typeof window !== 'undefined' && localStorage.getItem('authUserId')) || 'anonymous'
      const prompt = `Atmospheric, non-literal cinematic concept for scene: ${slugline}. Tone: ${emotionalTone || 'Tense'}. Focus on mood, light, composition.`
      const resp = await fetch('/api/thumbnails/generate?byok=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ideas: [{ id: beat.id, thumbnail_prompt: prompt }] })
      })
      if (!resp.ok) throw new Error('Thumbnail service unavailable')
      const data = await resp.json()
      const url = data?.thumbnails?.[beat.id]?.imageUrl || null
      setThumbUrl(url)
      onUpdate(beat.id, { thumbnailUrl: url || null })
    } catch (err) {
      // no-op UI toast here to keep BeatCard simple
    } finally {
      setIsGeneratingThumb(false)
    }
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`bg-sf-surface border border-sf-border text-white transition-shadow ${isDragging ? 'shadow-lg' : ''}`}
      onClick={() => !isEditing && setIsEditing(true)}
    >
      <div className="flex items-center p-4">
        <div {...attributes} {...listeners} className="cursor-grab touch-none pr-4" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="text-gray-400" />
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-400">SCENE {sceneNumber}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(beat.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
                            </div>
          {/* Suggestion pill */}
          <div className="mt-1 mb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e)=>e.stopPropagation()} className={`px-2 py-1 h-7 ${suggestion ? 'text-blue-300' : 'text-gray-500'}`}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  {suggestion ? 'Suggestion' : 'No suggestions'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-w-[280px]">
                {suggestion ? (
                  <div className="p-2 text-sm">
                    <div className="font-semibold mb-1">{suggestion.title}</div>
                    <div className="text-gray-300 mb-2">{suggestion.detail}</div>
                    <Button size="sm" onClick={(e)=>{ e.stopPropagation(); suggestion.apply(); }}>Apply</Button>
                  </div>
                ) : (
                  <div className="p-2 text-sm text-gray-400">No suggestions for this scene yet.</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* Header row with thumbnail and slugline */}
          <div className="mt-2 flex items-start gap-3">
            <div className="w-16 h-16 rounded-md bg-gray-900/40 border border-gray-800 flex items-center justify-center overflow-hidden">
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt="scene" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="flex-1">
              {!isEditing ? (
                <p className="text-lg font-semibold cursor-pointer">{beat.slugline}</p>
              ) : (
                <Textarea
                  value={slugline}
                  onChange={(e) => setSlugline(e.target.value)}
                  className="bg-sf-surface-light border-gray-600 mt-1 text-lg font-semibold"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <div className="mt-2">
                <Button variant="ghost" size="sm" onClick={generateThumbnail} disabled={isGeneratingThumb}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  {isGeneratingThumb ? 'Generating...' : (thumbUrl ? 'Regenerate' : 'Generate Image')}
                </Button>
              </div>
            </div>
          </div>
                      </div>
      </div>
      
      {isEditing && (
        <CardContent onClick={(e) => e.stopPropagation()}>
          <div className="mt-2">
            <label className="text-xs font-semibold text-gray-400">SUMMARY</label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="bg-sf-surface-light border-gray-600 mt-1"
              rows={3}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs font-semibold text-gray-400">OBJECTIVE</label>
                <Input value={objective} onChange={(e)=>setObjective(e.target.value)} className="bg-sf-surface-light border-gray-600 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400">KEY ACTION / PLOT POINT</label>
                <Input value={keyAction} onChange={(e)=>setKeyAction(e.target.value)} className="bg-sf-surface-light border-gray-600 mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400">EMOTIONAL TONE</label>
                <Select value={emotionalTone || 'Tense'} onValueChange={(v)=>setEmotionalTone(v as any)}>
                  <SelectTrigger className="bg-sf-surface-light border-gray-600 mt-1"><SelectValue placeholder="Select tone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tense">Tense</SelectItem>
                    <SelectItem value="Wondrous">Wondrous</SelectItem>
                    <SelectItem value="Contemplative">Contemplative</SelectItem>
                    <SelectItem value="Joyful">Joyful</SelectItem>
                    <SelectItem value="Somber">Somber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
              </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

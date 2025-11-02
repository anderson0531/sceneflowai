'use client';

import React from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '@/store/editorStore';
import { Clip, Track } from '@/types/editor';

function TimelineClip({ clip, track }: { clip: Clip; track: Track }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: clip.id,
    data: { clip, trackId: track.id }
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
    left: `${(clip.startFrame / 30) * 10}px`, // 10px per second
    width: `${(clip.durationInFrames / 30) * 10}px`
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="absolute h-12 bg-blue-500 rounded border border-blue-700 cursor-move hover:bg-blue-600"
    >
      <span className="text-xs text-white p-1 truncate">{clip.id}</span>
    </div>
  );
}

function TimelineTrack({ track }: { track: Track }) {
  const { setNodeRef } = useDroppable({ id: track.id });
  
  return (
    <div ref={setNodeRef} className="relative h-16 bg-gray-800 border-b border-gray-700">
      <div className="absolute left-0 w-32 h-full bg-gray-900 flex items-center px-4 z-10">
        <span className="text-sm text-white truncate">{track.name}</span>
      </div>
      <div className="ml-32 relative h-full">
        {track.clips.map(clip => (
          <TimelineClip key={clip.id} clip={clip} track={track} />
        ))}
      </div>
    </div>
  );
}

export function Timeline() {
  const { tracks, moveClip } = useEditorStore();
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const clipId = active.id as string;
    const newTrackId = over.id as string;
    const newStartFrame = 0; // Calculate based on drop position
    
    moveClip(clipId, newTrackId, newStartFrame);
  };
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="w-full h-full overflow-auto bg-gray-900">
        {tracks.map(track => (
          <TimelineTrack key={track.id} track={track} />
        ))}
      </div>
    </DndContext>
  );
}


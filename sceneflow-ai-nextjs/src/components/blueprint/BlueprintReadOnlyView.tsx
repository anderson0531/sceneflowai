'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  )
}

export function BlueprintReadOnlyView({ variant }: { variant: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    core: true,
    story: false,
    characters: false,
    beats: false,
    tone: false,
  })

  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  const beats = (variant.beats as Array<{ title?: string; synopsis?: string }>) ||
    (variant.beat_outline as Array<{ beat_title?: string; beat_description?: string }>)?.map((b) => ({
      title: b.beat_title,
      synopsis: b.beat_description,
    })) ||
    []

  const chars =
    (variant.character_descriptions as Array<{ name?: string; role?: string; description?: string }>) ||
    (variant.characters as Array<{ name?: string; role?: string; description?: string }>) ||
    []

  const sections = [
    {
      key: 'core',
      title: 'Core',
      content: (
        <>
          <ReadOnlyField label="Title" value={String(variant.title || '')} />
          <ReadOnlyField label="Logline" value={String(variant.logline || '')} />
          <ReadOnlyField label="Genre" value={String(variant.genre || '')} />
        </>
      ),
    },
    {
      key: 'story',
      title: 'Story',
      content: (
        <>
          <ReadOnlyField
            label="Synopsis"
            value={String(variant.synopsis || variant.content || '')}
          />
          <ReadOnlyField label="Protagonist" value={String(variant.protagonist || '')} />
          <ReadOnlyField label="Antagonist" value={String(variant.antagonist || '')} />
        </>
      ),
    },
    {
      key: 'characters',
      title: 'Characters',
      content: (
        <div className="space-y-2">
          {chars.map((c, i) => (
            <div key={i} className="text-sm text-gray-300">
              <span className="font-medium text-gray-200">{c.name || 'Character'}</span>
              {c.role ? <span className="text-gray-500"> — {c.role}</span> : null}
              {c.description ? <p className="mt-0.5 text-gray-400">{c.description}</p> : null}
            </div>
          ))}
          {chars.length === 0 && <p className="text-sm text-gray-500">No characters listed.</p>}
        </div>
      ),
    },
    {
      key: 'beats',
      title: 'Beats',
      content: (
        <div className="space-y-2">
          {beats.map((b, i) => (
            <div key={i} className="text-sm">
              <div className="text-gray-200 font-medium">{b.title || `Beat ${i + 1}`}</div>
              {b.synopsis ? <p className="text-gray-400 mt-0.5">{b.synopsis}</p> : null}
            </div>
          ))}
          {beats.length === 0 && <p className="text-sm text-gray-500">No beats listed.</p>}
        </div>
      ),
    },
    {
      key: 'tone',
      title: 'Tone & style',
      content: (
        <>
          <ReadOnlyField label="Tone" value={String(variant.tone || '')} />
          <ReadOnlyField
            label="Themes"
            value={
              Array.isArray(variant.themes)
                ? (variant.themes as string[]).join(', ')
                : String(variant.themes || '')
            }
          />
        </>
      ),
    },
  ]

  return (
    <div className="space-y-2">
      {sections.map((s) => (
        <div
          key={s.key}
          className="rounded-xl border border-slate-700/50 bg-slate-900/40 overflow-hidden"
        >
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-200 hover:bg-slate-800/50"
            onClick={() => toggle(s.key)}
          >
            {expanded[s.key] ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
            {s.title}
          </button>
          {expanded[s.key] && <div className="px-3 pb-3">{s.content}</div>}
        </div>
      ))}
    </div>
  )
}

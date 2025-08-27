'use client'

import { Button } from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { TemplateManager } from '@/components/workflow/TemplateManager'
import type { ConceptAttribute } from '@/types/SceneFlow'
import { getCurrentStructuredTemplate, hydrateReadinessFromTemplate } from '@/services/TemplateService'

interface WorkshopCardProps {
  uiMode: 'guided' | 'advanced'
  attributes: any | null
  setAttributes: (updater: any) => void
  isRefreshingConcept: boolean
  refreshConceptFromAttributes: () => Promise<void>
  isAutoPopulatingMustHaves: boolean
  setHasUnscoredChanges: (v: boolean) => void
  showWorkshop: boolean
  setShowWorkshop: (fn: (v: boolean) => boolean | boolean) => void
}

export function WorkshopCard(props: WorkshopCardProps) {
  const { uiMode, attributes, setAttributes, isRefreshingConcept, refreshConceptFromAttributes, isAutoPopulatingMustHaves, setHasUnscoredChanges, showWorkshop, setShowWorkshop } = props
  const [showReadiness, setShowReadiness] = useState(true)
  const readinessFields = [
    { label: 'Key Beats (3–5)', key: 'sr_beats', multiline: true, rows: 3, placeholder: '1) Hook...\n2) Problem...\n3) Demonstration...'},
    { label: 'Act Structure', key: 'sr_actStructure', multiline: false, placeholder: 'three-act / hero-journey / custom' },
    { label: 'Target Runtime (sec)', key: 'sr_runtime', multiline: false, placeholder: 'e.g., 60' },
    { label: 'Scene Count Target', key: 'sr_sceneCount', multiline: false, placeholder: 'e.g., 8' },
    { label: 'Characters (roles, goals, voice)', key: 'sr_characters', multiline: true, rows: 3, placeholder: 'Name — role/goal/voice' },
    { label: 'Locations & Time', key: 'sr_locations', multiline: true, rows: 3, placeholder: 'INT/EXT, time of day, look/notes' },
    { label: 'Visual Style & References', key: 'sr_visualStyle', multiline: true, rows: 3, placeholder: 'Style refs, palette, lighting, composition rules' },
    { label: 'Cinematography', key: 'sr_cinematography', multiline: true, rows: 3, placeholder: 'Aspect ratio, framing, camera motion, lens, transitions' },
    { label: 'Audio Direction', key: 'sr_audio', multiline: true, rows: 3, placeholder: 'VO/dialogue, music brief, SFX, silence' },
    { label: 'Editorial Pacing', key: 'sr_pacing', multiline: true, rows: 2, placeholder: 'Cuts/min, max shot length, hook timing' },
    { label: 'Platform & Deliverables', key: 'sr_platformDeliverables', multiline: true, rows: 3, placeholder: 'Primary platform, safe areas, captions, end card, variants' },
    { label: 'Branding & Compliance', key: 'sr_branding', multiline: true, rows: 3, placeholder: 'Voice/tone guardrails, logo/type, legal' },
    { label: 'Props & Continuity', key: 'sr_propsContinuity', multiline: true, rows: 2, placeholder: 'Hero props, wardrobe, must-match' },
    { label: 'Accessibility & Localization', key: 'sr_accessibility', multiline: true, rows: 2, placeholder: 'Captions style/language, alt text, VO variants' },
    { label: 'Storyboard Hints', key: 'sr_storyboardHints', multiline: true, rows: 3, placeholder: 'Per-beat intents, coverage plan, B-roll, graphics, on-screen text buckets' },
  ] as const

  const computeReadiness = () => {
    const total = readinessFields.length
    let done = 0
    const a: any = attributes || {}
    readinessFields.forEach(f => {
      const v = a?.[f.key]?.value
      if (typeof v === 'string' && v.trim().length > 0) done += 1
    })
    return Math.round((done / total) * 100)
  }

  // Default examples for pre-population
  const defaultReadiness: Record<string, string> = {
    sr_beats: '1) Hook: Bold on-screen line promises key benefit to target audience\n2) Problem: Show the pain the product solves\n3) Demonstration: Product in action with 3 clear steps\n4) Social Proof: Before/after or testimonial snippet\n5) CTA: Strong on-screen CTA and VO',
    sr_actStructure: 'three-act',
    sr_runtime: '60',
    sr_sceneCount: '8',
    sr_characters: 'Alex — host/narrator, friendly/curious\nJamie — user, skeptical but open',
    sr_locations: 'INT: Studio — day — clean, high-key\nEXT: City street — golden hour — bustling',
    sr_visualStyle: 'Modern minimal; bold captions; palette: #1E88E5, #7B1FA2; soft key + rim lighting; composition: center-framing for hooks',
    sr_cinematography: '16:9; mix WS/MS/CU; gentle gimbal moves; 24–35mm lens look; whip cuts between demos; occasional match cuts',
    sr_audio: 'Conversational VO; upbeat electronic track ~110 BPM; light SFX (whooshes/clicks); purposeful silence for emphasis',
    sr_pacing: '12–16 cuts/min; max shot 4s; hook by 0–3s; beat-cuts aligned to music',
    sr_platformDeliverables: 'Primary: YouTube; captions on (large, high-contrast); end card 5s with CTA; variants: 60/30/15s; safe areas respected',
    sr_branding: 'Voice: helpful, no hype; logo 3s open/close; typeface: Inter; avoid superlatives like “best ever”; include legal disclaimer if claims',
    sr_propsContinuity: 'Product v2.1 (blue trim); consistent wardrobe; hero mug present in all desk shots; avoid prop swaps between scenes',
    sr_accessibility: 'Closed captions EN/ES; on-screen text ≤ 12 words/shot; alt text for thumbnails; VO pacing friendly to captions',
    sr_storyboardHints: 'Beat1: hook (CU + on-screen text)\nBeat2: problem (split-screen contrast)\nBeat3: demo (OTS + CU inserts)\nB‑roll: hands-on details\nGraphics: lower thirds for features\nText buckets: benefits/CTA'
  }

  // Pre-populate readiness fields once when attributes available
  useEffect(() => {
    if (!attributes) return
    let changed = false
    setAttributes((prev: any) => {
      const next: any = { ...(prev || {}) }
      readinessFields.forEach((f) => {
        const existing = next?.[f.key]?.value
        if (!existing || String(existing).trim().length === 0) {
          const defVal = defaultReadiness[f.key]
          if (defVal) {
            next[f.key] = { value: defVal, source: 'user_modified' }
            changed = true
          }
        }
      })
      return next
    })
    if (changed) setHasUnscoredChanges(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!attributes])

  // Hydrate template data when available
  useEffect(() => {
    if (!attributes) return
    
    const structuredTemplate = getCurrentStructuredTemplate()
    if (structuredTemplate) {
      console.log('Hydrating template data:', structuredTemplate.template_name)
      hydrateReadinessFromTemplate(structuredTemplate, setAttributes)
      setHasUnscoredChanges(true)
      
      // Clear the stored template after hydration
      localStorage.removeItem('currentStructuredTemplate')
    }
  }, [attributes, setAttributes, setHasUnscoredChanges])
  return (
    <div className="card">
      <div className="mb-6">
        <TemplateManager
          defaultTemplate={`CRITICAL Production Directives (Non-Negotiable):\nVisual Pacing: Visuals must change every 8–10 seconds.\nDialogue Pacing: No character should speak for more than 30 seconds without an interjection, clarification, or reaction.`}
          onApplyToConcept={(tmpl) => {
            setAttributes((prev: any) => {
              const next = { ...(prev || {}) } as any
              const existing = next?.corePremise?.value || ''
              const merged = existing ? `${tmpl.trim()}\n\n${existing}` : tmpl.trim()
              next.corePremise = { value: merged, source: 'user_modified' }
              return next
            })
            setHasUnscoredChanges(true)
          }}
        />
        <div className="mt-2 text-sm text-sf-text-secondary">Use your saved Creator Template to standardize structure across Concept, Storyboard, and Scene Direction.</div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading text-lg">The Workshop</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowWorkshop(v=>!v)} aria-expanded={showWorkshop}>{showWorkshop ? 'Hide' : 'Show'}</Button>
          <Button size="sm" className="bg-sf-primary text-sf-background hover:bg-sf-accent border-sf-primary hover:border-sf-accent" onClick={refreshConceptFromAttributes} disabled={isRefreshingConcept}>
            {isRefreshingConcept ? 'Refreshing…' : 'Refresh Concept'}
          </Button>
        </div>
      </div>

      {showWorkshop && !attributes && (
        <div className="text-caption">Attributes will appear here after analysis.</div>
      )}

      {showWorkshop && attributes && (
        <div className="space-y-4">
          {([
            ['Working Title','workingTitle'],
            ['Core Premise','corePremise'],
          ] as const).map(([label, key]) => {
            const attr = (attributes as any)[key] as ConceptAttribute<any>
            const isUser = attr?.source === 'user_modified'
            const value = Array.isArray(attr?.value) ? attr?.value.join(', ') : (attr?.value ?? '')
            if (key === 'corePremise') {
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-heading text-sm">{label}</label>
                    <div className="flex items-center gap-2">
                      {isAutoPopulatingMustHaves && <span className="ml-2 text-caption">optimizing…</span>}
                      <span className={`text-sm px-2 py-1 rounded-full border font-emphasis ${isUser ? 'border-sf-primary text-sf-accent' : 'border-sf-border text-sf-text-secondary'}`}>{isUser ? 'User defined' : 'AI suggestion'}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const template = `\n\nAttributes (inline) — edit any line:\n- Target Audience: \n- Goal / Objective: \n- Key Message / CTA: \n- Genre / Format: \n- Tone / Mood: \n- Visual Aesthetic: \n- Intended Platform: \n- Estimated Duration: `
                          const currentVal = String(value || '')
                          if (currentVal.includes('Attributes (inline)')) return
                          const newVal = currentVal + template
                          setAttributes((prev: any) => {
                            if (!prev) return prev
                            const updated: any = { ...prev }
                            updated[key] = { value: newVal, source: 'user_modified' }
                            setHasUnscoredChanges(true)
                            return updated
                          })
                        }}
                      >
                        Insert Creator Template
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={value}
                      onChange={(e) => {
                        const v = e.target.value
                        setAttributes((prev: any) => {
                          if (!prev) return prev
                          const updated: any = { ...prev }
                          updated[key] = { value: v, source: 'user_modified' }
                          setHasUnscoredChanges(true)
                          return updated
                        })
                      }}
                      rows={3}
                      className="input-field flex-1"
                      placeholder="Describe your core concept..."
                    />
                    {uiMode==='guided' && String(value).length < 50 && (
                      <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={refreshConceptFromAttributes}>
                        Expand Brief
                      </Button>
                    )}
                  </div>
                </div>
              )
            }
            return uiMode==='advanced' ? (
              <div key={key} className="opacity-90">
                <div className="mb-1 text-heading text-sm">{label}</div>
                <input
                  value={value as any}
                  onChange={(e)=>{
                    const v=e.target.value
                    setAttributes((prev: any)=>{
                      if(!prev) return prev
                      const updated:any={...prev}
                      updated[key]={ value:v, source:'user_modified' }
                      setHasUnscoredChanges(true)
                      return updated
                    })
                  }}
                  className="input-field w-full"
                />
              </div>
            ) : null
          })}
        </div>
      )}

      {/* Storyboard Readiness */}
      <div className="mt-6 card-elevated p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-heading text-sm">Storyboard Readiness</div>
            <div className="text-caption">Fill these to generate a professional storyboard.</div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={()=>setShowReadiness(v=>!v)} 
              className="text-xs px-2 py-1 rounded border border-sf-border hover:bg-sf-surface-light text-sf-text-secondary hover:text-sf-text-primary transition-colors font-emphasis interactive-hover"
              aria-expanded={showReadiness}
            >
              {showReadiness ? 'Hide' : 'Show'}
            </button>
            <div className="text-sm px-2 py-1 rounded-full border border-sf-border text-sf-text-primary font-emphasis">{computeReadiness()}% Ready</div>
          </div>
        </div>
        {showReadiness && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {readinessFields.map((f) => {
            const attr = (attributes as any)?.[f.key] as ConceptAttribute<any>
            const value = (attr?.value ?? '') as any
            const commonProps = {
              className: 'input-field w-full hover:bg-sf-surface-light transition-colors',
              placeholder: f.placeholder,
            } as any
            return (
              <div key={f.key}>
                <div className="mb-1 text-heading text-sm">{f.label}</div>
                {f.multiline ? (
                  <textarea
                    rows={f.rows || 2}
                    value={value}
                    onChange={(e)=>{
                      const v=e.target.value
                      setAttributes((prev: any)=>{
                        if(!prev) return prev
                        const updated:any={...prev}
                        updated[f.key]={ value:v, source:'user_modified' }
                        return updated
                      })
                      setHasUnscoredChanges(true)
                    }}
                    {...commonProps}
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(e)=>{
                      const v=e.target.value
                      setAttributes((prev: any)=>{
                        if(!prev) return prev
                        const updated:any={...prev}
                        updated[f.key]={ value:v, source:'user_modified' }
                        return updated
                      })
                      setHasUnscoredChanges(true)
                    }}
                    {...commonProps}
                  />
                )}
              </div>
            )
          })}
        </div>
        )}
      </div>
    </div>
  )
}



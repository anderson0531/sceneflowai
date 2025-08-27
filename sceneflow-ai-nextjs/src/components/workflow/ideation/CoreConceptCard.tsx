'use client'

import { Button } from '@/components/ui/Button'
import { Share2 } from 'lucide-react'
import { formatCoreConceptAsTemplate } from '@/services/TemplateService'
import { useTemplateStore } from '@/store/templateStore'

interface CoreConceptCardProps {
  attributes: any | null
  workshopRationale: string
  showConceptAnalysis: boolean
  setShowConceptAnalysis: (fn: (v: boolean) => boolean | boolean) => void
  scores: any | null
  selectedRecs: string[]
  setSelectedRecs: (fn: (v: string[]) => string[] | string[]) => void
  isApplyingRecs: boolean
  applySelectedRecommendations: () => void
  inspoOutline: string[]
  outlineVariants: { title: string; outline: string[] }[]
  selectedOutlineIdx: number | null
  setSelectedOutlineIdx: (idx: number) => void
  collapsedOutlines: Record<number, boolean>
  setCollapsedOutlines: (fn: (v: Record<number, boolean>) => any) => void
  isLoadingOutline: boolean
  refreshOutline: () => void
  showCoreConcept: boolean
  setShowCoreConcept: (fn: (v: boolean) => boolean | boolean) => void
  handleShareCoreConcept: () => Promise<void>
  GenerateStoryboardButton: React.ReactNode
}

export function CoreConceptCard(p: CoreConceptCardProps) {
  const { attributes, workshopRationale, showConceptAnalysis, setShowConceptAnalysis, scores, selectedRecs, setSelectedRecs, isApplyingRecs, applySelectedRecommendations, inspoOutline, outlineVariants, selectedOutlineIdx, setSelectedOutlineIdx, collapsedOutlines, setCollapsedOutlines, isLoadingOutline, refreshOutline, showCoreConcept, setShowCoreConcept, handleShareCoreConcept, GenerateStoryboardButton } = p
  const { saveTemplate } = useTemplateStore()
  const readinessKeys = [
    'sr_beats','sr_actStructure','sr_runtime','sr_sceneCount','sr_characters','sr_locations','sr_visualStyle','sr_cinematography','sr_audio','sr_pacing','sr_platformDeliverables','sr_branding','sr_propsContinuity','sr_accessibility','sr_storyboardHints'
  ]
  const readiness = (()=>{
    const a:any = attributes || {}
    const total = readinessKeys.length
    let done = 0
    readinessKeys.forEach(k => { if (a?.[k]?.value && String(a[k].value).trim().length>0) done += 1 })
    return Math.round((done/total)*100)
  })()
  return (
    <div className="bg-sf-surface rounded-xl border border-sf-border p-6 shadow-md order-1">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sf-text-primary flex items-center">
          <svg className="w-5 h-5 mr-2 text-sf-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm0-4H6v-2h6v2zm0-4H6V7h6v2z"/>
          </svg>
          Core Concept
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowCoreConcept(v=>!v)} aria-expanded={showCoreConcept}>{showCoreConcept ? 'Hide' : 'Show'}</Button>
          <span className="text-xs px-2 py-1 border border-sf-border rounded">{readiness}% Ready</span>
          <Button size="sm" variant="secondary" onClick={handleShareCoreConcept} className="border-sf-border text-sf-text-secondary hover:text-sf-text-primary">
            <Share2 className="w-4 h-4 mr-2"/> Share Core Concept
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const core = {
                title: attributes?.workingTitle?.value || 'Untitled',
                premise: attributes?.corePremise?.value || '',
                targetAudience: attributes?.targetAudience?.value || '',
                keyMessage: attributes?.keyMessage?.value || '',
                genre: attributes?.genre?.value || '',
                tone: attributes?.tone?.value || '',
                platform: attributes?.platform?.value || '',
                duration: attributes?.duration?.value || undefined,
              } as any
              const tpl = formatCoreConceptAsTemplate(core)
              const name = (core.title || 'Custom Template').slice(0, 60)
              saveTemplate(name, tpl)
            }}
          >
            Save as Template
          </Button>
          {GenerateStoryboardButton}
        </div>
      </div>
      {showCoreConcept && (
        <>
          <div className="text-sm text-sf-text-secondary mb-2">
            The Core Concept is the foundational blueprint for your entire video. Here, we'll refine your initial concept into powerful, well-defined ideas that are ready for storyboarding.
          </div>
          <div className="text-base text-sf-text-secondary mb-4">{workshopRationale || 'I analyzed your concept. Edit attributes on the left or ask me for changes.'}</div>
          <div className="mb-6 p-4 bg-sf-surface-light border border-sf-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sf-text-primary">Concept Analysis</h4>
              <button onClick={() => setShowConceptAnalysis(v=>!v)} className="text-sm px-2 py-1 border border-sf-border rounded text-sf-text-secondary hover:bg-sf-primary/10">{showConceptAnalysis ? 'Hide' : 'Show'}</button>
            </div>
            {showConceptAnalysis && (
              <>
                <div className="text-base text-sf-text-secondary space-y-2">
                  <p><strong>Creative Direction:</strong> {attributes?.corePremise?.value ? `"${attributes.corePremise.value}"` : 'Your concept will be analyzed for maximum audience engagement and creative potential.'}</p>
                </div>
                {scores?.recommendations && (
                  <div className="mt-4">
                    <h5 className="text-base font-semibold text-sf-text-primary mb-2">Recommendations to Improve Scores</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-sf-surface border border-sf-border rounded p-3">
                        <div className="text-sm font-semibold text-sf-text-primary mb-1">Boost Audience Score</div>
                        <ul className="text-sm text-sf-text-secondary list-disc ml-4 space-y-1">
                          {scores.recommendations.audience.map((r: string, i: number)=> (
                            <li key={i} className="flex items-start gap-2">
                              <input type="checkbox" className="mt-0.5" checked={selectedRecs.includes(r)} onChange={(e)=>{
                                setSelectedRecs((prev: string[])=> e.target.checked ? [...prev, r] : prev.filter(x=>x!==r))
                              }} />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-sf-surface border border-sf-border rounded p-3">
                        <div className="text-sm font-semibold text-sf-text-primary mb-1">Boost Director's Score</div>
                        <ul className="text-sm text-sf-text-secondary list-disc ml-4 space-y-1">
                          {scores.recommendations.technical.map((r: string, i: number)=> (
                            <li key={i} className="flex items-start gap-2">
                              <input type="checkbox" className="mt-0.5" checked={selectedRecs.includes(r)} onChange={(e)=>{
                                setSelectedRecs((prev: string[])=> e.target.checked ? [...prev, r] : prev.filter(x=>x!==r))
                              }} />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button disabled={selectedRecs.length===0 || isApplyingRecs} onClick={applySelectedRecommendations} className={`text-sm px-3 py-1 rounded border ${selectedRecs.length>0 ? 'border-sf-primary text-sf-primary hover:bg-sf-primary/10' : 'border-sf-border text-sf-text-secondary cursor-not-allowed'}`}>{isApplyingRecs ? 'Applying…' : 'Apply to Core Premise'}</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="border border-sf-border rounded-lg p-3 bg-sf-surface-light">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-medium text-sf-text-primary">Outline</div>
                  <div className="text-sm text-sf-text-secondary">Select the outline that you want to use</div>
                </div>
                <button onClick={refreshOutline} className="text-sm px-2 py-1 border border-sf-border rounded text-sf-text-secondary hover:bg-sf-primary hover:text-sf-background">{isLoadingOutline ? 'Refreshing…' : 'Refresh'}</button>
              </div>
              {outlineVariants.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {outlineVariants.map((v, idx) => (
                    <div key={idx} className={`text-left rounded-md border ${selectedOutlineIdx===idx ? 'border-sf-primary bg-sf-primary/10' : 'border-sf-border bg-sf-surface'} p-3 transition-colors`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-semibold text-sf-text-primary">{v.title}</div>
                        <div className="flex items-center gap-2">
                          <button className="text-sm px-2 py-1 rounded border border-sf-border text-sf-text-secondary hover:bg-sf-primary/10" onClick={() => setCollapsedOutlines((prev: Record<number, boolean>) => ({ ...prev, [idx]: !prev[idx] }))}>{collapsedOutlines[idx] ? 'Show' : 'Hide'}</button>
                          <button className={`text-sm px-2 py-1 rounded border ${selectedOutlineIdx===idx ? 'border-sf-primary text-sf-primary' : 'border-sf-border text-sf-text-secondary'}`} onClick={() => { setSelectedOutlineIdx(idx); }}>
                            {selectedOutlineIdx===idx ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                      {!collapsedOutlines[idx] && (
                        <ul className="text-sm text-sf-text-secondary ml-4 space-y-1 list-disc">
                          {v.outline.map((line, i) => (<li key={i}>{line.replace(/^\d+\)\s*/, '')}</li>))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : inspoOutline.length === 0 ? (
                <div className="text-sm text-sf-text-secondary">No outline yet.</div>
              ) : (
                <ul className="text-sm text-sf-text-secondary ml-5 space-y-1 list-disc">
                  {inspoOutline.map((line, i) => (<li key={i}>{line.replace(/^\d+\)\s*/, '')}</li>))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}



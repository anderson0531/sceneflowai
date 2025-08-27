'use client'

import { useState } from 'react'
import { useTemplateStore } from '@/store/templateStore'
import { TEMPLATE_PRESETS } from '@/constants/templatePresets'
import { Button } from '@/components/ui/Button'
import { useEnhancedStore } from '@/store/enhancedStore'

export function TemplateManager({
  onApplyToConcept,
  defaultTemplate,
}: {
  onApplyToConcept: (tmpl: string) => void
  defaultTemplate?: string
}) {
  const { currentTemplate, setCurrentTemplate, templates, saveTemplate, loadTemplate, deleteTemplate, listPresets, loadPreset } = useTemplateStore()
  const [name, setName] = useState('')

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-heading font-medium">Creator Template</div>
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Preset name"
            className="input-field text-sm px-2 py-1"
          />
          <Button size="sm" variant="secondary" onClick={() => saveTemplate(name)}>
            Save as Preset
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (defaultTemplate && !currentTemplate) setCurrentTemplate(defaultTemplate)
            }}
          >
            Load Default
          </Button>
        </div>
      </div>

      {/* Presets */}
      <div className="mb-3">
        <div className="text-heading text-sm mb-1">Preset Library</div>
        <div className="flex flex-wrap gap-2">
          {listPresets().map((p)=> (
            <button 
              key={p.name} 
              onClick={() => loadPreset(p.name)} 
              className="px-2 py-1 text-sm border border-sf-border rounded hover:bg-sf-surface-light text-sf-text-secondary hover:text-sf-text-primary transition-colors font-emphasis interactive-hover"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <textarea
        rows={10}
        value={currentTemplate}
        onChange={(e) => setCurrentTemplate(e.target.value)}
        placeholder="Paste your script template here (acts, directives, pacing, etc.)"
        className="input-field w-full p-3 text-sm"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {Object.keys(templates).map((k) => (
          <div key={k} className="flex items-center gap-2 border border-sf-border rounded px-2 py-1 text-sm bg-sf-surface-light">
            <button 
              onClick={() => loadTemplate(k)} 
              className="hover:text-sf-primary text-sf-text-primary font-emphasis interactive-hover"
            >
              {k}
            </button>
            <button 
              onClick={() => deleteTemplate(k)} 
              className="text-sf-text-secondary hover:text-red-400 font-emphasis interactive-hover"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          size="sm"
          onClick={() => {
            try {
              useEnhancedStore.getState().setTemplateApplied(true)
            } catch {}
            if (!currentTemplate && defaultTemplate) onApplyToConcept(defaultTemplate)
            else onApplyToConcept(currentTemplate)
          }}
        >
          Apply to Concept
        </Button>
      </div>
    </div>
  )
}



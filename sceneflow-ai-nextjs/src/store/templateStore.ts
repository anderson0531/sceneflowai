'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { TEMPLATE_PRESETS } from '@/constants/templatePresets'

type Templates = Record<string, string>

interface TemplateState {
  currentTemplate: string
  templates: Templates
  setCurrentTemplate: (content: string) => void
  saveTemplate: (name: string, content?: string) => void
  loadTemplate: (name: string) => void
  deleteTemplate: (name: string) => void
  listPresets: () => { name: string; description: string }[]
  loadPreset: (name: string) => void
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      currentTemplate: '',
      templates: {},
      setCurrentTemplate: (content) => set({ currentTemplate: content }),
      saveTemplate: (name, content) => {
        const data = content ?? get().currentTemplate
        if (!name || !data) return
        const next = { ...get().templates, [name]: data }
        set({ templates: next })
      },
      loadTemplate: (name) => {
        const t = get().templates[name]
        if (t) set({ currentTemplate: t })
      },
      deleteTemplate: (name) => {
        const next = { ...get().templates }
        delete next[name]
        set({ templates: next })
      },
      listPresets: () => TEMPLATE_PRESETS.map(p => ({ name: p.name, description: p.description })),
      loadPreset: (name) => {
        const p = TEMPLATE_PRESETS.find(p => p.name === name)
        if (p) set({ currentTemplate: p.content })
      }
    }),
    {
      name: 'sceneflow-templates-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ currentTemplate: s.currentTemplate, templates: s.templates })
    }
  )
)



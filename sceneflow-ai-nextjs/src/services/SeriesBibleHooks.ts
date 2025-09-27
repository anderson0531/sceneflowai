import { ProjectBibleManager } from '@/services/ProjectBibleManager'

type Scene = { id: string; slugline: string; characters?: string[]; summary?: string; objective?: string }

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)) }

function deriveLocationsFromSluglines(scenes: Scene[]): string[] {
  return unique((scenes||[]).map(s => s.slugline || '')
    .filter(Boolean)
    .map(sl => {
      // INT. LOCATION - TIME → LOCATION
      const parts = sl.split('-')[0]?.trim() || sl
      const loc = parts.replace(/^INT\.|^EXT\.|^INT\/EXT\./i, '').trim()
      return loc || sl
    })
    .filter(v => v.length>0))
}

function deriveCharacters(scenes: Scene[]): string[] {
  const names: string[] = []
  ;(scenes||[]).forEach(s => (s.characters||[]).forEach(n => { if(n && n.trim()) names.push(n.trim()) }))
  return unique(names)
}

export const SeriesBibleHooks = {
  ensureBibleForProject(projectId: string, title: string, treatment?: any) {
    const mgr = ProjectBibleManager.getInstance()
    let bible = mgr.getProjectBibleByProjectId(projectId)
    if (!bible) {
      bible = mgr.createProjectBible(projectId, `${title || 'Untitled'} – Series Bible`, 'three-act')
    }
    mgr.updateProjectBible(bible!.id, {
      logline: typeof treatment === 'string' ? undefined : treatment?.logline || undefined,
      synopsis: typeof treatment === 'string' ? treatment : JSON.stringify(treatment || {})
    })
    return bible!
  },

  updateFromOutline(projectId: string, title: string, treatment: any, scenes: Scene[]) {
    const mgr = ProjectBibleManager.getInstance()
    const bible = this.ensureBibleForProject(projectId, title, treatment)
    const locations = deriveLocationsFromSluglines(scenes).map((name, i) => ({ id: `loc_${i}_${name.toLowerCase().replace(/\s+/g,'_')}`, name })) as any
    const characters = deriveCharacters(scenes).map((name, i) => ({ id: `char_${i}_${name.toLowerCase().replace(/\s+/g,'_')}`, name })) as any
    const structure = scenes.map((s, i) => ({ index: i+1, slugline: s.slugline, summary: s.summary, objective: s.objective }))
    mgr.updateProjectBible(bible.id, {
      locations,
      characters,
      acts: [],
      productionNotes: [{ id: `note_${Date.now()}`, text: 'Blueprint outline synced.', createdAt: new Date() } as any],
      references: [],
      // store structure snapshot in references for now
      inspirations: [{ id: `structure_${Date.now()}`, type: 'outline', data: structure } as any]
    })
  },

  finalizeForActionPlan(projectId: string) {
    const mgr = ProjectBibleManager.getInstance()
    const bible = mgr.getProjectBibleByProjectId(projectId)
    if (!bible) return
    mgr.updateProjectBible(bible.id, {
      version: (Number(bible.version?.split('.')[0]||'1')+1)+'.0.0',
      productionNotes: [...(bible.productionNotes||[]), { id: `lock_${Date.now()}`, text: 'Action Plan lock: bible finalized for continuity.', createdAt: new Date() } as any]
    })
  }
}






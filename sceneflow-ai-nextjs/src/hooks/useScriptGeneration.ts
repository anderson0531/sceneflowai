import { useState } from 'react'
import { useGuideStore } from '@/store/useGuideStore'

type Scene = { id: string; slugline: string; summary?: string }

function chunk<T>(arr: T[], n: number): T[][] {
  if (n <= 0) return [arr]
  const groups: T[][] = []
  for (let i=0;i<arr.length;i+=n) groups.push(arr.slice(i, i+n))
  return groups
}

export function useScriptGeneration() {
  const { guide, setFullScriptText } = useGuideStore()
  const [progress, setProgress] = useState({ running:false, done:0, total:0 })
  const [error, setError] = useState<string | null>(null)

  async function generateFromOutline({ scenesPerChunk=10 }: { scenesPerChunk?: number } = {}) {
    setError(null)
    const scenes = (Array.isArray((guide as any).scenesOutline) ? (guide as any).scenesOutline : []) as Scene[]
    if (!scenes.length) return false
    const groups = chunk(scenes, scenesPerChunk)
    setProgress({ running:true, done:0, total: scenes.length })
    let full = ''

    for (let i=0;i<groups.length;i++) {
      const prev = i>0 ? (groups[i-1][groups[i-1].length-1]?.summary || '') : ''
      const payload = { outline_chunk: groups[i], treatment_context: (guide as any).filmTreatment, previous_scene_summary: prev }
      const body = JSON.stringify(payload)

      for (let attempt=0; attempt<2; attempt++) {
        try {
          const resp = await fetch('/api/generate/script-chunk', { method:'POST', headers:{'Content-Type':'application/json'}, body })
          if (!resp.ok || !resp.body) throw new Error('Bad response')
          const reader = resp.body.getReader()
          const dec = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const text = dec.decode(value)
            full += text
            try { setFullScriptText(full) } catch {}
          }
          break
        } catch (e:any) {
          if (attempt === 1) { setError(e?.message || 'Generation failed'); setProgress(p=>({ ...p, running:false })); return false }
        }
      }
      setProgress(p => ({ ...p, done: Math.min(p.done + groups[i].length, p.total) }))
    }
    setProgress({ running:false, done: scenes.length, total: scenes.length })
    return true
  }

  return { progress, error, generateFromOutline }
}






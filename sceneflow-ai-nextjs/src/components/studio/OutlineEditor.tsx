import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export interface SceneItem {
  id: string
  slugline: string
  characters: string[]
  summary: string
  objective: string
}

interface OutlineEditorProps {
  scenes: SceneItem[]
  onChange: (scenes: SceneItem[]) => void
}

export function OutlineEditor({ scenes, onChange }: OutlineEditorProps) {
  const [local, setLocal] = useState<SceneItem[]>(scenes)

  const update = (next: SceneItem[]) => {
    setLocal(next)
    onChange(next)
  }

  const addScene = (index: number) => {
    const id = `s${Date.now()}`
    const next: SceneItem[] = [
      ...local.slice(0, index + 1),
      { id, slugline: 'INT. LOCATION - DAY', characters: [], summary: '', objective: '' },
      ...local.slice(index + 1)
    ]
    update(next)
  }

  const removeScene = (index: number) => {
    const next = local.slice()
    next.splice(index, 1)
    update(next)
  }

  const moveScene = (from: number, to: number) => {
    if (to < 0 || to >= local.length) return
    const next = local.slice()
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    update(next)
  }

  const updateField = (index: number, field: keyof SceneItem, value: any) => {
    const next = local.slice()
    ;(next[index] as any)[field] = value
    update(next)
  }

  return (
    <div className="space-y-4">
      {local.map((scene, i) => (
        <div key={scene.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-gray-400">Scene {i + 1}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => moveScene(i, i - 1)}>↑</Button>
              <Button variant="outline" size="sm" onClick={() => moveScene(i, i + 1)}>↓</Button>
              <Button variant="outline" size="sm" onClick={() => addScene(i)}>Add After</Button>
              <Button variant="outline" size="sm" onClick={() => removeScene(i)}>Delete</Button>
            </div>
          </div>

          <label className="block text-xs text-gray-400 mb-1">Slugline</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 mb-3"
            value={scene.slugline}
            onChange={e => updateField(i, 'slugline', e.target.value)}
          />

          <label className="block text-xs text-gray-400 mb-1">Characters (comma-separated)</label>
          <input
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 mb-3"
            value={scene.characters.join(', ')}
            onChange={e => updateField(i, 'characters', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />

          <label className="block text-xs text-gray-400 mb-1">Summary</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 min-h-[100px] mb-3"
            value={scene.summary}
            onChange={e => updateField(i, 'summary', e.target.value)}
          />

          <label className="block text-xs text-gray-400 mb-1">Objective</label>
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 min-h-[80px]"
            value={scene.objective}
            onChange={e => updateField(i, 'objective', e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}



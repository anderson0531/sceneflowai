import { describe, expect, it } from 'vitest'
import { extractPropScalePhrase, propScaleClause, PROP_SCALE_GENERIC, PROP_SCALE_FURNITURE } from '@/lib/imagen/propScaleClause'
import { buildSceneImagePropLabel } from '@/lib/imagen/sceneImageReferenceLabels'
import { buildObjectReferencePrompt } from '@/lib/vision/referenceExpressPrompts'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('propScaleClause', () => {
  it('quotes a 12-inch description', () => {
    const clause = propScaleClause('A 12-inch metal canister, scuffed paint', 'Canister')
    expect(clause).toContain('12-inch')
    expect(clause).toMatch(/do not enlarge to fill the frame/)
    expect(extractPropScalePhrase('A 12-inch metal canister', 'Canister')).toBe('12-inch')
  })

  it('quotes handheld when that is the only scale cue', () => {
    expect(propScaleClause('handheld brass cylinder', 'Cylinder')).toBe(PROP_SCALE_GENERIC)
    expect(extractPropScalePhrase('handheld brass cylinder', 'Cylinder')).toBe('handheld')
  })

  it('still emits a generic lock when the description has no size', () => {
    expect(propScaleClause('Brushed steel canister with a red stripe', 'Canister')).toBe(
      PROP_SCALE_GENERIC
    )
  })

  it('does not call a workbench handheld', () => {
    expect(propScaleClause(undefined, 'Zinc workbench')).toBe(PROP_SCALE_FURNITURE)
    expect(propScaleClause('handheld zinc workbench', 'Zinc workbench')).toBe(PROP_SCALE_FURNITURE)
    expect(propScaleClause(undefined, 'Zinc workbench')).not.toMatch(/handheld/)
  })

  it('reads a size from the name when description is empty', () => {
    expect(propScaleClause(undefined, '12-inch Canister')).toContain('12-inch')
  })

  it('appends the scale lock to prop image labels', () => {
    const label = buildSceneImagePropLabel(
      'Canister',
      3,
      'prop [3]',
      '12-inch stainless sample canister'
    )
    expect(label).toContain('PROP prop [3] (Canister)')
    expect(label).toContain('12-inch')
    expect(label).toContain('do not enlarge to fill the frame')
  })

  it('requires real-world scale on object still prompts', () => {
    const prompt = buildObjectReferencePrompt({
      id: 'obj-1',
      type: 'object',
      name: 'Canister',
      description: '12-inch metal sample canister, handheld',
    })
    expect(prompt).toMatch(/true real-world scale/i)
    expect(prompt).toMatch(/handheld/i)

    const suggest = readFileSync(
      join(process.cwd(), 'src/app/api/vision/suggest-objects/route.ts'),
      'utf8'
    )
    expect(suggest).toContain('MUST include real-world scale')
  })
})

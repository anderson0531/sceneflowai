import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

/**
 * The Assistant's direction field takes typing *and* dictation.
 *
 * docs/HOW_IT_WORKS_VIDEO_SCRIPTS.md described the dialog as dictation-capable
 * while the field was a plain Textarea, so the docs and the UI disagreed.
 */

const ROOT = path.resolve(__dirname, '../..')

function readSource(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8')
}

describe('the Assistant direction field', () => {
  const dialog = readSource('src/components/blueprint/BlueprintRefineDialog.tsx')

  it('uses the shared dictation field, not a plain textarea', () => {
    expect(dialog).toContain("import { DictationTextarea } from '../ui/DictationTextarea'")
    expect(dialog).toContain('<DictationTextarea')
    expect(dialog).not.toMatch(/<Textarea\b/)
  })

  it('keeps the same value contract, so the character counter still works', () => {
    const start = dialog.indexOf('<DictationTextarea')
    const field = dialog.slice(start, dialog.indexOf('/>', start))
    expect(field).toContain('value={userIntent}')
    expect(field).toContain('onChange={setUserIntent}')
    expect(dialog).toContain('MAX_INTENT_CHARS')
  })

  it('locks the field while a revision is generating', () => {
    const start = dialog.indexOf('<DictationTextarea')
    const field = dialog.slice(start, dialog.indexOf('/>', start))
    expect(field).toContain('disabled={isGenerating}')
  })

  it('takes its placeholder from the catalog', () => {
    const start = dialog.indexOf('<DictationTextarea')
    const field = dialog.slice(start, dialog.indexOf('/>', start))
    expect(field).toContain("placeholder={t('whatShouldChangePlaceholder')}")

    const catalog = JSON.parse(readSource('messages/app/en/blueprint.json'))
    expect(typeof catalog.assistant.whatShouldChangePlaceholder).toBe('string')
    expect(catalog.assistant.whatShouldChangePlaceholder.length).toBeGreaterThan(0)
  })

  it('routes the focus-scope chip labels through the catalog too', () => {
    expect(dialog).toContain('labelKey:')
    expect(dialog).toContain('{t(opt.labelKey)}')

    const catalog = JSON.parse(readSource('messages/app/en/blueprint.json'))
    for (const scope of ['all', 'core', 'story', 'characters', 'beats', 'tone']) {
      expect(typeof catalog.assistant.scopes[scope]).toBe('string')
    }
  })
})

describe('resonance recommendations become instruction text', () => {
  const dialog = readSource('src/components/blueprint/BlueprintRefineDialog.tsx')
  const catalog = JSON.parse(readSource('messages/app/en/blueprint.json'))

  it('prefills the direction field from the concrete fix, not the chip label', () => {
    expect(dialog).toContain('formatResonanceFixInstructions(resonanceRecommendations)')
    expect(dialog).toContain('fixInstructionForRecommendation(rec)')
    expect(dialog).not.toContain('rec.intentLabel || rec.title || rec.text.slice(0, 80)')
  })

  it('lets the user add or remove a fix in the instruction field', () => {
    expect(dialog).toContain('appendFixInstruction')
    expect(dialog).toContain('removeFixInstruction')
    expect(dialog).toContain("t('addToInstructions')")
    expect(dialog).toContain("t('addedToInstructions')")
    expect(typeof catalog.assistant.addToInstructions).toBe('string')
    expect(typeof catalog.assistant.addedToInstructions).toBe('string')
    expect(catalog.assistant.addToInstructions.length).toBeGreaterThan(0)
    expect(catalog.assistant.addedToInstructions.length).toBeGreaterThan(0)
  })

  it('opens full-balance when the selected fixes span sections', () => {
    const panel = readSource('src/components/blueprint/AudienceResonancePanelV3.tsx')
    const studio = readSource('src/app/dashboard/studio/[projectId]/StudioPageClient.tsx')
    const tabs = readSource('src/components/blueprint/SidePanelTabs.tsx')
    expect(panel).toContain('focusScopeForRecommendations(list)')
    expect(studio).toContain('focusScopeForRecommendations(pending)')
    expect(tabs).toContain('focusScopeForRecommendations(selected)')
  })
})

describe('DictationTextarea', () => {
  const field = readSource('src/components/ui/DictationTextarea.tsx')

  it('accepts a disabled prop', () => {
    expect(field).toContain('disabled?: boolean')
    expect(field).toContain('disabled = false')
  })

  it('threads disabled to both the textarea and the mic button', () => {
    const matches = field.match(/disabled=\{disabled\}/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  // Otherwise the recogniser keeps appending into a field the user cannot see.
  it('stops recording when the field is disabled mid-utterance', () => {
    expect(field).toContain('if (disabled && isRecording) stop()')
  })

  it('refuses to start recording while disabled', () => {
    expect(field).toContain('if (!sttSupported || !isSecure || disabled) return')
  })
})

describe('the share feedback notes field', () => {
  const form = readSource('src/components/blueprint/BlueprintShareFeedbackForm.tsx')

  it('offers dictation for the freeform notes', () => {
    expect(form).toContain('DictationTextarea')
    const start = form.indexOf('<DictationTextarea')
    expect(start).toBeGreaterThan(0)
    const field = form.slice(start, form.indexOf('/>', start))
    expect(field).toContain('value={freeformNotes}')
    expect(field).toContain('onChange={setFreeformNotes}')
    expect(field).toContain('disabled={submitting}')
  })
})

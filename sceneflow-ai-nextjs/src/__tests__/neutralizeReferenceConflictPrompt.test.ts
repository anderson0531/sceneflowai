import { describe, expect, it } from 'vitest'
import { neutralizeReferenceConflictPrompt } from '@/lib/gemini/neutralizeReferenceConflictPrompt'

describe('neutralizeReferenceConflictPrompt', () => {
  it('softens temple mark and possessive character re-description', () => {
    const raw =
      "CLOSE UP: Elara's hands, now visibly trembling. Her eyes are heavy with emotion, a faint shadowed mark visible on her temple."

    const neutral = neutralizeReferenceConflictPrompt(raw)

    expect(neutral).toContain("the subject's hands")
    expect(neutral).toContain('expression shows deep emotion')
    expect(neutral).not.toContain('Elara')
    expect(neutral).not.toContain('shadowed mark visible on her temple')
    expect(neutral).toContain('quiet emotional tension')
  })

  it('softens distress phrasing in audio-adjacent scene text', () => {
    const raw =
      'Desperate denial collapsing into intense realization and emotional exhaustion with escalating panic.'

    const neutral = neutralizeReferenceConflictPrompt(raw)

    expect(neutral).not.toContain('Desperate denial')
    expect(neutral).not.toContain('escalating panic')
    expect(neutral.toLowerCase()).toContain('rising tension')
  })

  it('softens bloodshot trembling distress and temple mark forming phrasing', () => {
    const raw =
      "CLOSE UP: hands visibly trembling, bloodshot eyes, a faint mark forming on her temple, capturing every detail of her distress and absolute defeat."

    const neutral = neutralizeReferenceConflictPrompt(raw)

    expect(neutral.toLowerCase()).not.toContain('bloodshot')
    expect(neutral.toLowerCase()).not.toContain('trembling')
    expect(neutral.toLowerCase()).not.toContain('distress')
    expect(neutral.toLowerCase()).not.toContain('absolute defeat')
    expect(neutral.toLowerCase()).not.toContain('mark forming on her temple')
    expect(neutral.toLowerCase()).toContain('weary')
    expect(neutral.toLowerCase()).toContain('tension')
  })

  it('strips inline wardrobe clauses and eye-color descriptions that conflict with reference plates', () => {
    const raw =
      'Marcus, wearing a tailored charcoal suit and crimson silk tie, steps into the doorway with piercing blue eyes and pauses.'
    const neutral = neutralizeReferenceConflictPrompt(raw)

    expect(neutral.toLowerCase()).not.toContain('charcoal suit')
    expect(neutral.toLowerCase()).not.toContain('crimson silk tie')
    expect(neutral.toLowerCase()).not.toContain('blue eyes')
    expect(neutral).toContain('steps into the doorway')
  })

  it('removes jaw-masseter, nostril, eyebrow, and bare-lip overrides that erase beards (bt_3f0e54b8-977)', () => {
    const raw =
      '5s–8s (Action progression): He jerks his prop [1]-streaked right fist back against his collarbone while his chest heaves in rapid breaths and his jaw tightens rigidly as the camera slowly pushes in on his profile. Shot: Medium Close-Up. Emotion: person [1]: obsessive intellectual strain shifting into sudden bitter frustration, shown by tightly bunched jaw masseters, flared nostrils drawing cold air, an intensely furrowed brow, and a sharp tremor along his parted lower lip. Props: prop [1].'

    const neutral = neutralizeReferenceConflictPrompt(raw)

    expect(neutral.toLowerCase()).not.toContain('masseters')
    expect(neutral.toLowerCase()).not.toContain('jaw tightens')
    expect(neutral.toLowerCase()).not.toContain('flared nostrils')
    expect(neutral.toLowerCase()).not.toContain('parted lower lip')
    expect(neutral).toContain(
      'Emotion: person [1]: obsessive intellectual strain shifting into sudden bitter frustration.'
    )
    expect(neutral).toContain(
      'while his chest heaves in rapid breaths as the camera slowly pushes in on his profile.'
    )
  })

  it('removes invented eye colors and eyebrow/lid/lip sculpting in Emotion clauses (bt_f6502bff-4bf)', () => {
    const raw =
      'Shot: Close-Up. Emotion: person [1]: Widened amber-hazel eyes with glassy lower lids, eyebrows flattened and pulled slightly upward at the center, parted lips slightly unsteady on a soft exhalation, and defensive facial tension deflated into stunned reverence. Props: prop [1].'

    const neutral = neutralizeReferenceConflictPrompt(raw)

    expect(neutral.toLowerCase()).not.toContain('amber-hazel')
    expect(neutral.toLowerCase()).not.toContain('eyebrows flattened')
    expect(neutral.toLowerCase()).not.toContain('glassy lower lids')
    expect(neutral.toLowerCase()).not.toContain('parted lips')
    expect(neutral).toContain(
      'Emotion: person [1]: defensive quiet tension deflated into stunned reverence.'
    )
  })
})

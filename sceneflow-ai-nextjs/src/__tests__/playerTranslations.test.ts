import { describe, it, expect } from 'vitest'
import { translatePlayerLabel } from '@/lib/storyboard/playerTranslations'

describe('translatePlayerLabel', () => {
  const labels = {
    Action: 'Acción',
    Narrator: 'Narrador',
    Dialogue: 'Diálogo',
  }

  it('translates known role labels', () => {
    expect(translatePlayerLabel('Action', labels)).toBe('Acción')
    expect(translatePlayerLabel('Narrator', labels)).toBe('Narrador')
  })

  it('translates numbered dialogue labels', () => {
    expect(translatePlayerLabel('Dialogue 2', labels)).toBe('Diálogo 2')
  })

  it('passes through character names', () => {
    expect(translatePlayerLabel('ALEX', labels)).toBe('ALEX')
  })
})

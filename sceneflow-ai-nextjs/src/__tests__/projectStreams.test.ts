import { describe, it, expect } from 'vitest'
import {
  getConfiguredStreamLanguages,
  mergeStreamSelectorLanguages,
  type ProjectStream,
} from '@/lib/streams/projectStreams'

describe('projectStreams language selectors', () => {
  it('getConfiguredStreamLanguages always includes English', () => {
    expect(getConfiguredStreamLanguages([])).toEqual(['en'])
  })

  it('mergeStreamSelectorLanguages unions configured streams with audio keys', () => {
    const streams: ProjectStream[] = [
      { id: 'stream-ar', language: 'ar', format: 'full-video', status: 'draft' },
    ]
    expect(mergeStreamSelectorLanguages(streams, ['es'])).toEqual(['en', 'ar', 'es'])
  })

  it('mergeStreamSelectorLanguages dedupes and sorts non-English codes', () => {
    const streams: ProjectStream[] = [
      { id: 'stream-fr', language: 'fr', format: 'full-video', status: 'draft' },
    ]
    expect(mergeStreamSelectorLanguages(streams, ['fr', 'de'])).toEqual(['en', 'de', 'fr'])
  })
})

/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ObjectSuggestionPanel } from '@/components/vision/ObjectSuggestionPanel'

const PANEL_SOURCE = path.join(
  process.cwd(),
  'src/components/vision/ObjectSuggestionPanel.tsx',
)

describe('ObjectSuggestionPanel isAnalyzing state', () => {
  it('declares isAnalyzing so Review suggestions can render', () => {
    const source = readFileSync(PANEL_SOURCE, 'utf8')
    expect(source).toContain('const [isAnalyzing, setIsAnalyzing] = useState(false)')
    expect(source).toContain('setIsAnalyzing(true)')
    expect(source).toContain('disabled={isAnalyzing}')
  })
})

describe('ObjectSuggestionPanel Objects tab render', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
  })

  it('opens the Key Objects panel without throwing ReferenceError', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    expect(() => {
      act(() => {
        root.render(
          React.createElement(ObjectSuggestionPanel, {
            scenes: [
              {
                sceneNumber: 1,
                heading: 'INT. STUDY - NIGHT',
                action: 'A brass lamp sits on the desk.',
              },
            ],
            existingObjects: [],
            onObjectGenerated: () => undefined,
          })
        )
      })
    }).not.toThrow()

    expect(container.textContent).toContain('Key Objects')
    expect(container.textContent).toContain('Review suggestions')
    expect(container.textContent).toContain('Update Objects')
  })

  it('offers a duplicate checker when synonym object rows already exist', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(
        React.createElement(ObjectSuggestionPanel, {
          scenes: [
            {
              sceneNumber: 1,
              heading: 'INT. RAIL YARD - NIGHT',
              action: 'Elara lifts the spanner.',
            },
          ],
          existingObjects: [
            { id: 'a', type: 'object', name: 'Thirty-Inch Iron Rail Spanner' },
            { id: 'b', type: 'object', name: 'Spud wrench' },
          ],
          onObjectGenerated: () => undefined,
          onMergeObjects: () => undefined,
        })
      )
    })

    expect(container.textContent).toContain('Review duplicate objects (1)')
  })

  it('lists every duplicate group in a scrollable review dialog', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(
        React.createElement(ObjectSuggestionPanel, {
          scenes: [
            {
              sceneNumber: 1,
              heading: 'INT. RAIL YARD - NIGHT',
              action: 'Elara lifts the spanner and the journal.',
            },
          ],
          existingObjects: [
            { id: 'a', type: 'object', name: 'Thirty-Inch Iron Rail Spanner' },
            { id: 'b', type: 'object', name: 'Spud wrench' },
            { id: 'c', type: 'object', name: 'Water-damaged leather journal' },
            { id: 'd', type: 'object', name: 'Leather journal' },
          ],
          onObjectGenerated: () => undefined,
          onMergeObjects: () => undefined,
          onDeleteDuplicateObjects: () => undefined,
          onIgnoreObjectDuplicates: () => undefined,
        })
      )
    })

    expect(container.textContent).toContain('Review duplicate objects (2)')

    const reviewButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Review duplicate objects')
    )
    expect(reviewButton).toBeTruthy()
    act(() => {
      reviewButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const dialog = document.body.querySelector('[data-testid="object-duplicate-dialog"]')
    const scroll = document.body.querySelector('[data-testid="object-duplicate-scroll"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.className).toContain('max-h-[85vh]')
    expect(scroll?.className).toContain('overflow-y-auto')
    expect(document.body.querySelectorAll('[data-testid="object-duplicate-group"]')).toHaveLength(2)
    expect(document.body.textContent).toContain('Thirty-Inch Iron Rail Spanner')
    expect(document.body.textContent).toContain('Water-damaged leather journal')
    expect(document.body.textContent).toContain('Delete')
    expect(document.body.textContent).toContain('Not a duplicate')
    expect(document.body.textContent).toContain('Ignore group')
    expect(document.body.textContent).toContain('Merge group')
  })
})

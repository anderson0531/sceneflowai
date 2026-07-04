/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
  })

  function renderCheckbox(props: React.ComponentProps<typeof Checkbox>) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(React.createElement(Checkbox, props))
    })
  }

  it('auto-generates id linking visual label to input', () => {
    renderCheckbox({ checked: false })

    const input = container.querySelector('input')
    const label = container.querySelector('label')

    expect(input?.id).toBeTruthy()
    expect(label?.htmlFor).toBe(input?.id)
  })

  it('uses explicit id when provided', () => {
    renderCheckbox({ checked: false, id: 'my-checkbox' })

    const input = container.querySelector('input')
    const label = container.querySelector('label')

    expect(input?.id).toBe('my-checkbox')
    expect(label?.htmlFor).toBe('my-checkbox')
  })

  it('calls onCheckedChange when visual label is clicked', () => {
    const onCheckedChange = vi.fn()
    renderCheckbox({ checked: false, onCheckedChange })

    const label = container.querySelector('label')
    act(() => {
      label?.click()
    })

    expect(onCheckedChange).toHaveBeenCalledTimes(1)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('does not call onCheckedChange when disabled', () => {
    const onCheckedChange = vi.fn()
    renderCheckbox({ checked: false, disabled: true, onCheckedChange })

    const label = container.querySelector('label')
    act(() => {
      label?.click()
    })

    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})

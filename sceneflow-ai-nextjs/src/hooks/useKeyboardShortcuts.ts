'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean  // Command key on Mac
  shift?: boolean
  alt?: boolean
  action: () => void
  description?: string
  enabled?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  preventDefault?: boolean
}

/**
 * Hook for registering keyboard shortcuts
 * Supports modifier keys: Ctrl, Meta (Cmd), Shift, Alt
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 's', meta: true, action: handleSave, description: 'Save' },
 *   { key: 'Escape', action: handleClose, description: 'Close' },
 *   { key: 'n', meta: true, shift: true, action: handleNew, description: 'New item' }
 * ])
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options
  const shortcutsRef = useRef(shortcuts)

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs/textareas (unless Escape)
    const target = event.target as HTMLElement
    const isInputField = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.isContentEditable

    for (const shortcut of shortcutsRef.current) {
      // Skip disabled shortcuts
      if (shortcut.enabled === false) continue

      // Check if key matches (case-insensitive)
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
      if (!keyMatches) continue

      // Check modifier keys
      const ctrlMatches = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey || shortcut.meta
      const metaMatches = shortcut.meta ? event.metaKey : !event.metaKey || shortcut.ctrl
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
      const altMatches = shortcut.alt ? event.altKey : !event.altKey

      // Handle Ctrl/Meta interchangeably for cross-platform support
      const modifierMatches = shortcut.ctrl || shortcut.meta
        ? (event.ctrlKey || event.metaKey) && shiftMatches && altMatches
        : ctrlMatches && metaMatches && shiftMatches && altMatches

      if (!modifierMatches) continue

      // Allow Escape to work in input fields
      if (isInputField && shortcut.key.toLowerCase() !== 'escape') continue

      // Found matching shortcut
      if (preventDefault) {
        event.preventDefault()
        event.stopPropagation()
      }

      shortcut.action()
      return
    }
  }, [enabled, preventDefault])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

/**
 * Common shortcuts for Blueprint/Vision pages
 */
export function useBlueprintShortcuts({
  onSave,
  onClose,
  onNew,
  onDelete,
  onDuplicate,
  onUndo,
  onRedo,
  enabled = true
}: {
  onSave?: () => void
  onClose?: () => void
  onNew?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  onUndo?: () => void
  onRedo?: () => void
  enabled?: boolean
}) {
  const shortcuts: KeyboardShortcut[] = []

  if (onSave) {
    shortcuts.push({
      key: 's',
      meta: true,
      action: onSave,
      description: 'Save'
    })
  }

  if (onClose) {
    shortcuts.push({
      key: 'Escape',
      action: onClose,
      description: 'Close'
    })
  }

  if (onNew) {
    shortcuts.push({
      key: 'n',
      meta: true,
      action: onNew,
      description: 'New item'
    })
  }

  if (onDelete) {
    shortcuts.push({
      key: 'Backspace',
      meta: true,
      action: onDelete,
      description: 'Delete'
    })
  }

  if (onDuplicate) {
    shortcuts.push({
      key: 'd',
      meta: true,
      shift: true,
      action: onDuplicate,
      description: 'Duplicate'
    })
  }

  if (onUndo) {
    shortcuts.push({
      key: 'z',
      meta: true,
      action: onUndo,
      description: 'Undo'
    })
  }

  if (onRedo) {
    shortcuts.push({
      key: 'z',
      meta: true,
      shift: true,
      action: onRedo,
      description: 'Redo'
    })
  }

  useKeyboardShortcuts(shortcuts, { enabled })
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
  const parts: string[] = []

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift')
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt')
  }

  // Format key name
  let keyName = shortcut.key
  if (keyName === 'Escape') keyName = 'Esc'
  if (keyName === 'Backspace') keyName = isMac ? '⌫' : 'Backspace'
  if (keyName === 'Enter') keyName = isMac ? '↵' : 'Enter'
  if (keyName === 'ArrowUp') keyName = '↑'
  if (keyName === 'ArrowDown') keyName = '↓'
  if (keyName === 'ArrowLeft') keyName = '←'
  if (keyName === 'ArrowRight') keyName = '→'

  parts.push(keyName.toUpperCase())

  return parts.join(isMac ? '' : '+')
}

/**
 * Keyboard shortcut hint component data
 */
export function getShortcutHint(shortcut: KeyboardShortcut): { symbol: string; label: string } {
  const formatted = formatShortcut(shortcut)
  return {
    symbol: formatted,
    label: shortcut.description || shortcut.key
  }
}

export default useKeyboardShortcuts

'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_LOCALE } from '@/i18n/locale'

const STORAGE_KEY = 'sf-i18n-overlay'
const HIGHLIGHT_CLASS = 'sf-i18n-untranslated'

/**
 * Development aid for finding chrome that has not been extracted yet.
 *
 * When the interface locale is not English, any text node that still renders
 * Latin-script prose is almost certainly a hardcoded English string. Scanning
 * the live DOM finds these in a way that grepping cannot: it only reports text
 * that actually reached the screen on the route you are looking at, which is
 * what makes the remaining work reviewable surface by surface.
 *
 * Off unless `NODE_ENV !== 'production'` and the operator opts in.
 */
export function UntranslatedStringOverlay() {
  const [enabled, setEnabled] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // Storage unavailable; stay off.
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const locale = document.documentElement.lang
    if (!locale || locale === DEFAULT_LOCALE) {
      setCount(0)
      return
    }

    const style = document.createElement('style')
    style.dataset.sfI18n = 'overlay'
    style.textContent = `.${HIGHLIGHT_CLASS} { outline: 1px dashed #f59e0b !important; background: rgba(245,158,11,0.12) !important; }`
    document.head.appendChild(style)

    const scan = () => {
      let found = 0
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const text = node.textContent?.trim() ?? ''
          if (text.length < 4) return NodeFilter.FILTER_REJECT
          // Two or more Latin words with no non-Latin letters: the signature of
          // English prose sitting in a non-English UI.
          if (!/^[\x20-\x7E]+$/.test(text)) return NodeFilter.FILTER_REJECT
          if (!/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(text)) return NodeFilter.FILTER_REJECT

          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          if (parent.closest('[translate="no"], script, style, code, pre, input, textarea')) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      })

      document
        .querySelectorAll(`.${HIGHLIGHT_CLASS}`)
        .forEach((element) => element.classList.remove(HIGHLIGHT_CLASS))

      while (walker.nextNode()) {
        walker.currentNode.parentElement?.classList.add(HIGHLIGHT_CLASS)
        found += 1
      }

      setCount(found)
    }

    scan()
    const observer = new MutationObserver(() => {
      window.clearTimeout((observer as any)._timer)
      ;(observer as any)._timer = window.setTimeout(scan, 400)
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => {
      observer.disconnect()
      style.remove()
      document
        .querySelectorAll(`.${HIGHLIGHT_CLASS}`)
        .forEach((element) => element.classList.remove(HIGHLIGHT_CLASS))
    }
  }, [enabled])

  if (process.env.NODE_ENV === 'production') return null

  const toggle = () => {
    const next = !enabled
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      // Non-fatal.
    }
    setEnabled(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      translate="no"
      className="fixed bottom-2 start-2 z-[200] rounded bg-slate-900/90 px-2 py-1 font-mono text-[10px] text-amber-300 shadow-lg"
      title="Highlight chrome that has not been extracted into a message catalog"
    >
      i18n {enabled ? `· ${count}` : 'off'}
    </button>
  )
}

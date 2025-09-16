import { useMemo } from 'react'

interface ScriptViewerProps {
  fountainText: string
}

export function ScriptViewer({ fountainText }: ScriptViewerProps) {
  // Lazy import to avoid SSR issues
  const html = useMemo(() => {
    if (!fountainText) return ''
    try {
      // @ts-ignore - imported at runtime by consumer after installing dependency
      const fountain = require('fountain-js')
      const parsed = fountain.parse(fountainText)
      return parsed?.html?.script || ''
    } catch {
      return fountainText
    }
  }, [fountainText])

  return (
    <div className="script-viewer prose prose-invert max-w-none">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}



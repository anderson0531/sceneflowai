'use client'

import React from 'react'

type Provenance = {
  api?: string | null
  provider?: string | null
  model?: string | null
  timestamp?: string | null
  reqId?: string | null
}

type Props = {
  data: Provenance
  className?: string
}

export function ProvenanceBanner({ data, className }: Props) {
  const { api, provider, model, timestamp, reqId } = data
  return (
    <div className={`mt-3 text-xs rounded-md border border-blue-600/40 bg-blue-900/20 text-blue-200 px-3 py-2 inline-flex items-center gap-3 ${className || ''}`}>
      <span className="font-semibold">Provenance</span>
      {api ? <span>api: {api}</span> : null}
      {provider ? <span>provider: {provider}</span> : null}
      {model ? <span>model: {model}</span> : null}
      {timestamp ? <span>{timestamp}</span> : null}
      {reqId ? <span className="hidden sm:inline">reqId: {reqId}</span> : null}
    </div>
  )
}

export default ProvenanceBanner



'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ExamplePreview {
  exampleUnits: number
  providerUsd: number
  credits: number
  faceMarginPercent: number
  studioMarginPercent: number
}

interface RateRow {
  id: string | null
  operation: string
  usdPerUnit: number
  markup: number
  creditsPerUnitOverride: number | null
  rateStatus: string
  sourceUrl: string | null
  notes: string | null
  example: ExamplePreview | null
}

interface RefreshDiff {
  operation: string
  usdPerUnit: number
  seededUsdPerUnit: number | null
  changed: boolean
  sourceUrl: string
}

export function PricingRateCard() {
  const [seeds, setSeeds] = useState<RateRow[]>([])
  const [rows, setRows] = useState<RateRow[]>([])
  const [diff, setDiff] = useState<RefreshDiff[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [operation, setOperation] = useState('omni_1080p')
  const [usdPerUnit, setUsdPerUnit] = useState('0.152')
  const [markup, setMarkup] = useState('1.8')
  const [override, setOverride] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/pricing/rate-card')
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error || 'Could not load the rate card')
      return
    }
    setSeeds(data.seeds || [])
    setRows(data.rows || [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function refresh(applyDrafts: boolean) {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/pricing/rate-card/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applyDrafts }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Refresh failed')
        return
      }
      setDiff(data.diff || [])
      setErrors(data.errors || [])
      setMessage(applyDrafts ? 'Drafts saved. Publish a row to change live charges.' : 'Quotes fetched. Nothing is live yet.')
      if (applyDrafts) await load()
    } finally {
      setLoading(false)
    }
  }

  async function saveDraft() {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/pricing/rate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          usdPerUnit: Number(usdPerUnit),
          markup: Number(markup),
          creditsPerUnitOverride: override === '' ? null : Number(override),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || 'Could not save draft')
        return
      }
      setMessage('Draft saved. Publish it to change live charges.')
      await load()
    } finally {
      setLoading(false)
    }
  }

  async function publish(id: string) {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/pricing/rate-card/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await response.json()
      setMessage(response.ok ? `Published ${data.published?.operation}` : data.error || 'Publish failed')
      if (response.ok) await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-sf-primary" />
        <div>
          <h3 className="text-lg font-semibold text-white">Provider rate card</h3>
          <p className="text-sm text-gray-400">
            Refresh public Omni and Kling prices, then publish a draft. Live charges use the published row, or the seeded rate if none is published.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => refresh(false)} disabled={loading}>Refresh quotes</Button>
        <Button type="button" onClick={() => refresh(true)} disabled={loading}>Save fetched quotes as drafts</Button>
      </div>

      {errors.length > 0 && (
        <ul className="text-sm text-amber-300 list-disc pl-5">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}

      {diff.length > 0 && (
        <div className="text-sm text-gray-300 space-y-1">
          {diff.map((row) => (
            <div key={row.operation}>
              {row.operation}: ${row.usdPerUnit}/unit
              {row.seededUsdPerUnit != null ? ` (seed $${row.seededUsdPerUnit})` : ''}
              {row.changed ? ' — changed' : ' — matches seed'}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm text-gray-300">
          Operation
          <select
            className="mt-1 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white"
            value={operation}
            onChange={(event) => setOperation(event.target.value)}
          >
            {seeds.map((seed) => (
              <option key={seed.operation} value={seed.operation}>{seed.operation}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-300">
          $ per unit
          <input className="mt-1 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={usdPerUnit} onChange={(event) => setUsdPerUnit(event.target.value)} />
        </label>
        <label className="text-sm text-gray-300">
          Markup
          <input className="mt-1 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={markup} onChange={(event) => setMarkup(event.target.value)} />
        </label>
        <label className="text-sm text-gray-300">
          Credits / unit override
          <input className="mt-1 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={override} onChange={(event) => setOverride(event.target.value)} placeholder="optional" />
        </label>
      </div>
      <Button type="button" onClick={saveDraft} disabled={loading}>Save draft</Button>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead>
            <tr className="text-gray-400">
              <th className="py-2 pr-3">Operation</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">$/unit</th>
              <th className="py-2 pr-3">10s or 1 image</th>
              <th className="py-2 pr-3">Face / Studio margin</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {seeds.map((seed) => (
              <tr key={`seed-${seed.operation}`} className="border-t border-dark-border">
                <td className="py-2 pr-3">{seed.operation}</td>
                <td className="py-2 pr-3">seed</td>
                <td className="py-2 pr-3">${seed.usdPerUnit}</td>
                <td className="py-2 pr-3">{seed.example ? `${seed.example.credits} cr / $${seed.example.providerUsd.toFixed(2)}` : '—'}</td>
                <td className="py-2 pr-3">{seed.example ? `${seed.example.faceMarginPercent.toFixed(0)}% / ${seed.example.studioMarginPercent.toFixed(0)}%` : '—'}</td>
                <td />
              </tr>
            ))}
            {rows.map((row) => (
              <tr key={row.id || row.operation} className="border-t border-dark-border">
                <td className="py-2 pr-3">{row.operation}</td>
                <td className="py-2 pr-3">{row.rateStatus}</td>
                <td className="py-2 pr-3">${row.usdPerUnit}</td>
                <td className="py-2 pr-3">{row.example ? `${row.example.credits} cr / $${row.example.providerUsd.toFixed(2)}` : '—'}</td>
                <td className="py-2 pr-3">{row.example ? `${row.example.faceMarginPercent.toFixed(0)}% / ${row.example.studioMarginPercent.toFixed(0)}%` : '—'}</td>
                <td className="py-2">
                  {row.id && row.rateStatus !== 'published' && (
                    <button type="button" className="text-sf-primary" onClick={() => publish(row.id!)}>Publish</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {message && <p className="text-sm text-gray-300">{message}</p>}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface FinanceSummary {
  cashInUsd: number
  creditsIssued: number
  creditsSpent: number
  breakageCredits: number
  modelCogsUsd: number
  grossAfterModelsUsd: number
  infraUsd: number
  bottomLineUsd: number
  payingOutMore: boolean
  usageByOperation: Array<{ operation: string; count: number; chargedCredits: number; cogsUsd: number }>
}

function money(value: number) {
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export function FinanceReportCard() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [source, setSource] = useState<'gcp' | 'vercel' | 'other'>('gcp')
  const [periodMonth, setPeriodMonth] = useState('')
  const [amountUsd, setAmountUsd] = useState('')
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')

  async function loadReport() {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const response = await fetch(`/api/admin/finance?${params.toString()}`)
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.error || 'Could not load finance')
      return
    }
    setSummary(data.summary)
    setMessage('')
  }

  async function saveInfra() {
    const response = await fetch('/api/admin/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        periodMonth: periodMonth ? `${periodMonth}-01` : '',
        amountUsd: Number(amountUsd),
        notes,
      }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Infrastructure cost saved.' : data.error || 'Could not save cost')
    if (response.ok) await loadReport()
  }

  return (
    <div className="bg-dark-card rounded-xl border border-dark-border p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Cash versus model and platform cost</h3>
        <p className="text-sm text-gray-400">
          Cash in is what customers paid. Model cost is recorded provider COGS. GCP and Vercel are manual monthly entries.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm text-gray-300">
          From
          <input type="date" className="mt-1 block px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="text-sm text-gray-300">
          To
          <input type="date" className="mt-1 block px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <Button type="button" onClick={loadReport}>Load report</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-200">
          <div>Cash in: {money(summary.cashInUsd)}</div>
          <div>Credits issued / spent: {summary.creditsIssued.toLocaleString()} / {summary.creditsSpent.toLocaleString()}</div>
          <div>Unused credits in range: {summary.breakageCredits.toLocaleString()}</div>
          <div>Model COGS: {money(summary.modelCogsUsd)}</div>
          <div>Gross after models: {money(summary.grossAfterModelsUsd)}</div>
          <div>GCP + Vercel: {money(summary.infraUsd)}</div>
          <div className={summary.payingOutMore ? 'text-red-300' : 'text-emerald-300'}>
            Bottom line: {money(summary.bottomLineUsd)}
            {summary.payingOutMore ? ' — paying out more than collected' : ' — collected more than model and infra cost'}
          </div>
        </div>
      )}

      {summary && summary.usageByOperation.length > 0 && (
        <ul className="text-sm text-gray-300 space-y-1">
          {summary.usageByOperation.slice(0, 8).map((row) => (
            <li key={row.operation}>
              {row.operation}: {row.count} calls, {row.chargedCredits.toLocaleString()} credits, {money(row.cogsUsd)} COGS
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm text-gray-300">
          Source
          <select className="mt-1 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={source} onChange={(event) => setSource(event.target.value as 'gcp' | 'vercel' | 'other')}>
            <option value="gcp">GCP</option>
            <option value="vercel">Vercel</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="text-sm text-gray-300">
          Month
          <input type="month" className="mt-1 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={periodMonth} onChange={(event) => setPeriodMonth(event.target.value)} />
        </label>
        <label className="text-sm text-gray-300">
          Amount USD
          <input className="mt-1 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={amountUsd} onChange={(event) => setAmountUsd(event.target.value)} />
        </label>
        <label className="text-sm text-gray-300">
          Notes
          <input className="mt-1 w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </div>
      <Button type="button" onClick={saveInfra}>Save infrastructure cost</Button>
      {message && <p className="text-sm text-gray-300">{message}</p>}
    </div>
  )
}

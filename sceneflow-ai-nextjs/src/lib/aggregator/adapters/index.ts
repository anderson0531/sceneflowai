import type { AggregatorVendor } from '../types'
import { renderfulAdapter } from './renderfulAdapter'
import { polloAdapter } from './polloAdapter'
import { falAggregatorAdapter } from './falAdapter'
import type { VideoAggregatorAdapter } from '../types'

const adapters: Record<AggregatorVendor, VideoAggregatorAdapter> = {
  renderful: renderfulAdapter,
  pollo: polloAdapter,
  fal: falAggregatorAdapter,
  glio: falAggregatorAdapter,
  reapi: falAggregatorAdapter,
}

export function getAggregatorAdapter(vendor: AggregatorVendor): VideoAggregatorAdapter {
  return adapters[vendor] ?? renderfulAdapter
}

export { renderfulAdapter, polloAdapter, falAggregatorAdapter }

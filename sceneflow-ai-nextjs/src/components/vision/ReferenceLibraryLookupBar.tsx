'use client'

import {
  librarySceneOptions,
  type LibrarySceneFilter,
  type LookupScene,
} from '@/lib/vision/referenceLibraryLookup'

export function ReferenceLibraryLookupBar({
  kind,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  scenes,
}: {
  kind: 'locations' | 'objects'
  query: string
  onQueryChange: (value: string) => void
  filter: LibrarySceneFilter
  onFilterChange: (value: LibrarySceneFilter) => void
  scenes: LookupScene[]
}) {
  const options = librarySceneOptions(scenes)
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        className="flex-1 rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-gray-100"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={kind === 'locations' ? 'Search locations' : 'Search objects'}
        aria-label={kind === 'locations' ? 'Search locations' : 'Search objects'}
      />
      <select
        className="rounded border border-gray-700 bg-gray-950 px-2 py-1.5 text-sm text-gray-100"
        aria-label={kind === 'locations' ? 'Filter locations by scene' : 'Filter objects by scene'}
        value={filter === 'all' || filter === 'unassigned' ? filter : String(filter)}
        onChange={(event) => {
          const value = event.target.value
          if (value === 'all' || value === 'unassigned') onFilterChange(value)
          else onFilterChange(Number(value))
        }}
      >
        <option value="all">All scenes</option>
        {options.map((option) => (
          <option key={option.sceneNumber} value={option.sceneNumber}>
            {option.label}
          </option>
        ))}
        <option value="unassigned">Unassigned</option>
      </select>
    </div>
  )
}

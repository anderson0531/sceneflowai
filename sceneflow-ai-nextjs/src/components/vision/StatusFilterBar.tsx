'use client'

export interface StatusFilterChip {
  id: string
  label: string
  count: number
  active: boolean
}

export function StatusFilterBar({
  label,
  chips,
  onSelect,
}: {
  label: string
  chips: StatusFilterChip[]
  onSelect: (id: string) => void
}) {
  if (chips.length === 0) return null
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-wide text-slate-500 shrink-0">{label}</span>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelect(chip.id)
          }}
          className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
            chip.active
              ? 'bg-slate-200 text-slate-900 border-slate-200'
              : 'bg-slate-800/60 text-slate-300 border-slate-600/50 hover:border-slate-400'
          }`}
          aria-pressed={chip.active}
        >
          {chip.label}
          <span className={`ml-1 tabular-nums ${chip.active ? 'text-slate-600' : 'text-slate-500'}`}>
            {chip.count}
          </span>
        </button>
      ))}
    </div>
  )
}

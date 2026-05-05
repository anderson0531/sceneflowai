import { Loader2 } from 'lucide-react'

export default function FinalCutLoading() {
  return (
    <div className="relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(ellipse 100% 80% at 50% -20%, rgba(139, 92, 246, 0.2), transparent 50%)',
        }}
      />
      <div className="relative text-center text-zinc-100">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-4" />
        <p className="text-zinc-400 text-sm font-medium">Loading Final Cut…</p>
        <p className="text-zinc-600 text-xs mt-1">Resolving rendered scene videos</p>
      </div>
    </div>
  )
}

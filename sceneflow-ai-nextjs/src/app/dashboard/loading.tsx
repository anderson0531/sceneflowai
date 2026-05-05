export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="h-10 w-10 rounded-full border-2 border-zinc-700 border-t-cyan-400 animate-spin" />
        <p className="text-sm">Loading dashboard...</p>
      </div>
    </div>
  )
}

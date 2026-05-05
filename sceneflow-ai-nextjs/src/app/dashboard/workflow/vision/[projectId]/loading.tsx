export default function VisionWorkflowLoading() {
  return (
    <div className="min-h-screen w-full bg-sf-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-zinc-400">
        <div className="h-12 w-12 rounded-full border-2 border-zinc-700 border-t-cyan-400 animate-spin" />
        <div className="text-sm">Preparing your Vision workspace...</div>
        <div className="text-xs text-zinc-500">Loading scenes, audio tracks, and storyboard</div>
      </div>
    </div>
  )
}

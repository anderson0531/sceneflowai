'use client'

interface SceneImageQuotaToastProps {
  onRetry: () => void
  retryLabel?: string
}

/** Shared quota-exceeded toast for scene and beat frame image generation. */
export function SceneImageQuotaToast({
  onRetry,
  retryLabel = 'Retry Generation',
}: SceneImageQuotaToastProps) {
  return (
    <div className="space-y-2">
      <div className="font-semibold">Image Generation Quota Exceeded</div>
      <div className="text-sm">
        Google Cloud has rate limits on image generation. Please:
      </div>
      <ul className="text-sm list-disc pl-4 space-y-1">
        <li>Wait 30-60 seconds before trying again</li>
        <li>Generate one scene at a time</li>
        <li>Consider using Auto quality for faster generation</li>
      </ul>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
      >
        {retryLabel}
      </button>
    </div>
  )
}

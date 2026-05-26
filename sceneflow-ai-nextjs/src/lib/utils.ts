import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple date formatter used across dashboard pages
export function formatDate(date: Date): string {
  try {
    if (!(date instanceof Date)) return 'Unknown'
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(date)
  } catch {
    return date?.toString?.() || 'Unknown'
  }
}

/**
 * Forces a direct file download by fetching as a blob and creating a temporary URL.
 * This bypasses browser video playback and ensures the file is saved locally.
 */
export async function forceDownload(url: string, filename: string): Promise<void> {
  try {
    // 1. Fetch the file content as a blob
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const blob = await response.blob()

    // 2. Create a temporary URL for the blob
    const blobUrl = window.URL.createObjectURL(blob)

    // 3. Create a hidden link and click it
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // 4. Cleanup
    document.body.removeChild(link)
    // Revoke the URL after a short delay to ensure the browser has started the download
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
  } catch (error) {
    console.error('[forceDownload] Error:', error)
    throw error
  }
}

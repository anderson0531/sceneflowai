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

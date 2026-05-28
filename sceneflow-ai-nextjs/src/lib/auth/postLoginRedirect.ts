export const DASHBOARD_PATH = '/dashboard'
export const PENDING_RETURN_URL_KEY = 'pendingReturnUrl'

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//')
}

export function getDashboardUrl(): string {
  return DASHBOARD_PATH
}

export function persistReturnUrl(url: string): void {
  if (typeof window === 'undefined') return
  if (!isSafeInternalPath(url)) return
  sessionStorage.setItem(PENDING_RETURN_URL_KEY, url)
}

export function consumeReturnUrl(): string | null {
  if (typeof window === 'undefined') return null
  const url = sessionStorage.getItem(PENDING_RETURN_URL_KEY)
  if (url) {
    sessionStorage.removeItem(PENDING_RETURN_URL_KEY)
  }
  return url && isSafeInternalPath(url) ? url : null
}

export function resolvePostLoginPath(): string {
  return consumeReturnUrl() || getDashboardUrl()
}

export function navigateAfterAuth(path: string): void {
  if (typeof window === 'undefined') return
  window.location.assign(isSafeInternalPath(path) ? path : getDashboardUrl())
}

export function navigateToDashboard(): void {
  navigateAfterAuth(getDashboardUrl())
}

export const DASHBOARD_PATH = '/dashboard'
export const LOGIN_PATH = '/login'
export const PENDING_RETURN_URL_KEY = 'pendingReturnUrl'

export interface LoginUrlOptions {
  returnUrl?: string
  mode?: 'login' | 'signup'
  checkoutTier?: string
  extra?: Record<string, string>
}

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//')
}

export function getLoginUrl(options: LoginUrlOptions = {}): string {
  const params = new URLSearchParams()
  const { returnUrl, mode, checkoutTier, extra } = options

  if (returnUrl && isSafeInternalPath(returnUrl)) {
    params.set('returnUrl', returnUrl)
  }
  if (mode === 'signup') {
    params.set('mode', 'signup')
  }
  if (checkoutTier) {
    params.set('checkoutTier', checkoutTier)
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value)
    }
  }

  const query = params.toString()
  return query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH
}

/** Map legacy landing auth query params (?login=1, ?signup=1) to /login URLs. */
export function getLoginUrlFromLegacySearch(search: string): string | null {
  const params = new URLSearchParams(search)
  const login = params.get('login') === '1'
  const signupParam = params.get('signup')
  const signup = signupParam === '1' || signupParam === 'explorer'
  const checkoutTier =
    params.get('checkoutTier') ||
    (signupParam === 'explorer' ? 'explorer' : undefined)

  if (!login && !signup && !checkoutTier) {
    return null
  }

  const returnUrl = params.get('returnUrl')
  const extra: Record<string, string> = {}
  const production = params.get('production')
  if (production) extra.production = production

  return getLoginUrl({
    returnUrl: returnUrl?.startsWith('/') ? returnUrl : undefined,
    mode: signup ? 'signup' : login ? 'login' : undefined,
    checkoutTier: checkoutTier || undefined,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  })
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

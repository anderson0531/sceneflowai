import { isPublicRoute } from '@/constants/publicRoutes'

/** Install / add-to-home prompt: logged-in app routes only, never landing or other public pages. */
export function canShowInstallPrompt(
  authStatus: string,
  pathname: string | null | undefined
): boolean {
  if (authStatus !== 'authenticated') return false
  if (isPublicRoute(pathname ?? '/')) return false
  return true
}

export type InstallSurface = 'banner' | 'phone-companion' | 'phone-sign-in'

/** True when the page is already running as the installed app. */
export function isAppInstalled(standalone: boolean): boolean {
  return standalone
}

/**
 * Hide the offer once the app is installed.
 * The floating banner is signed-in app routes only, and only when the browser
 * can finish install or the device is iOS. Phone sign-in always offers it.
 * The companion card is the fallback when that install event never fires.
 */
export function shouldShowInstallOffer(options: {
  surface: InstallSurface
  authStatus: string
  pathname: string | null | undefined
  standalone: boolean
  neverAsk: boolean
  isIOS: boolean
  hasDeferredPrompt: boolean
}): boolean {
  if (isAppInstalled(options.standalone) || options.neverAsk) return false
  if (options.surface === 'phone-sign-in') return true
  // The floating banner already covers iOS and the one-tap prompt, above the
  // companion. The inline card is the fallback when that event never fires.
  if (options.surface === 'phone-companion') {
    return !options.isIOS && !options.hasDeferredPrompt
  }
  if (!canShowInstallPrompt(options.authStatus, options.pathname)) return false
  return options.isIOS || options.hasDeferredPrompt
}

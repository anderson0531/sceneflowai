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

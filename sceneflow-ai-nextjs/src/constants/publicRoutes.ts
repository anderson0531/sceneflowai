/**
 * Public routes that should not display app navigation (header/sidebar)
 * Used by GlobalHeader and ConditionalLayout components
 */

// Exact match routes (no navigation)
export const PUBLIC_ROUTES = ['/', '/terms', '/privacy', '/refunds', '/trust-safety'] as const;

// Prefix match routes (no navigation for any path starting with these)
export const PUBLIC_ROUTE_PREFIXES = ['/c/', '/collaborate/'] as const;

/**
 * Check if a pathname should display without app navigation
 */
export function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  
  // Check exact matches
  if ((PUBLIC_ROUTES as readonly string[]).includes(pathname)) {
    return true;
  }
  
  // Check prefix matches
  for (const prefix of PUBLIC_ROUTE_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }
  
  return false;
}

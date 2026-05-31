/**
 * Public routes that should not display app navigation (header/sidebar)
 * Used by GlobalHeader and ConditionalLayout components
 */

// Exact match routes (no navigation)
export const PUBLIC_ROUTES = ['/', '/login', '/early-access', '/pricing', '/terms', '/privacy', '/refunds', '/trust-safety', '/contact'] as const;

/** Landing locale path prefixes treated as public (e.g. /es, /zh-CN). */
export const LANDING_LOCALE_ROUTE_PATTERN =
  /^\/(es|pt|fr|de|it|nl|pl|ru|uk|cs|sv|da|no|fi|el|tr|ro|hu|zh-CN|zh-TW|ja|ko|hi|bn|th|vi|id|ms|tl|ur|ar|he|fa|sw|am|yo|zu|af)$/;

// Prefix match routes (no navigation for any path starting with these)
export const PUBLIC_ROUTE_PREFIXES = ['/c/', '/collaborate/', '/share/', '/s/', '/blueprint/share/', '/embed/', '/early-access/invite/'] as const;

// Known private app route prefixes (for identifying root-level branded links)
const APP_ROUTES = [
  'dashboard', 'api', 'admin', 'setup-database', 'test-neon', 
  'evolution', 'product-description', 'screening-room', 'c', 'collaborate', 'share', 's', 'blueprint', 'embed'
];

/**
 * Check if a pathname should display without app navigation
 */
export function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  
  // Landing locale home paths (/es, /ja, …)
  if (LANDING_LOCALE_ROUTE_PATTERN.test(pathname)) {
    return true;
  }

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
  
  // Dynamic root-level links for shared storyboards (e.g. /TheDawnOfSyntheticMinds)
  // If it's a root path and the first segment is not a known internal app route, treat as public
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1 && !APP_ROUTES.includes(segments[0])) {
    return true;
  }
  
  return false;
}

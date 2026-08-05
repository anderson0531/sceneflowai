'use client';

import { usePathname } from 'next/navigation';
import { GlobalSidebarUnified } from '@/components/layout/GlobalSidebarUnified';
import { MobileRestrictionGuard } from '@/components/layout/MobileRestrictionGuard';
import { PageTranslateControl } from '@/components/i18n/PageTranslateControl';
import { isPublicRoute } from '@/constants/publicRoutes';
import { allowsGoogleTranslate } from '@/config/i18n/gtSurfaces';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  /**
   * Opt-in browser translation, and only where the route map permits it.
   * `PageTranslateControl` renders nothing on a route that is not marked `gt`,
   * so mounting it here cannot leak the widget into a studio — see
   * src/config/i18n/gtSurfaces.ts for why that matters.
   */
  const translateControl = allowsGoogleTranslate(pathname ?? '/') ? (
    <div className="pointer-events-none fixed bottom-4 end-4 z-[110] flex justify-end">
      <div className="pointer-events-auto rounded-xl bg-slate-900/80 p-1.5 shadow-lg backdrop-blur">
        <PageTranslateControl />
      </div>
    </div>
  ) : null;

  // Render without sidebar for public routes (landing, legal, collaboration pages)
  // These are fully accessible on mobile
  if (isPublicRoute(pathname)) {
    return (
      <>
        {children}
        {translateControl}
      </>
    );
  }

  // For all other pages, render with unified sidebar
  // The sidebar automatically configures itself based on the current route
  // MobileRestrictionGuard blocks access on screens < 1024px
  return (
    <MobileRestrictionGuard>
      <GlobalSidebarUnified>
        {children}
      </GlobalSidebarUnified>
      {translateControl}
    </MobileRestrictionGuard>
  );
}

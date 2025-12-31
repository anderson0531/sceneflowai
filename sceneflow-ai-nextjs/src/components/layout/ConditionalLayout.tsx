'use client';

import { usePathname } from 'next/navigation';
import { GlobalSidebarUnified } from '@/components/layout/GlobalSidebarUnified';
import { MobileRestrictionGuard } from '@/components/layout/MobileRestrictionGuard';
import { isPublicRoute } from '@/constants/publicRoutes';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Render without sidebar for public routes (landing, legal, collaboration pages)
  // These are fully accessible on mobile
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }
  
  // For all other pages, render with unified sidebar
  // The sidebar automatically configures itself based on the current route
  // MobileRestrictionGuard blocks access on screens < 1024px
  return (
    <MobileRestrictionGuard>
      <GlobalSidebarUnified>
        {children}
      </GlobalSidebarUnified>
    </MobileRestrictionGuard>
  );
}

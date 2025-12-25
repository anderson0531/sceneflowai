'use client';

import { usePathname } from 'next/navigation';
import { GlobalSidebarUnified } from '@/components/layout/GlobalSidebarUnified';
import { isPublicRoute } from '@/constants/publicRoutes';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Render without sidebar for public routes (landing, legal, collaboration pages)
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }
  
  // For all other pages, render with unified sidebar
  // The sidebar automatically configures itself based on the current route
  return (
    <GlobalSidebarUnified>
      {children}
    </GlobalSidebarUnified>
  );
}

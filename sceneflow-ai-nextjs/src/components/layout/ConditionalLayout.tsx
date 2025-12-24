'use client';

import { usePathname } from 'next/navigation';
import { GlobalSidebar } from '@/components/layout/GlobalSidebar';
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
  
  // For all other pages, render with sidebar
  return (
    <GlobalSidebar>
      {children}
    </GlobalSidebar>
  );
}

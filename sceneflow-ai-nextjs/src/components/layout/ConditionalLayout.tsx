'use client';

import { usePathname } from 'next/navigation';
import { GlobalSidebar } from '@/components/layout/GlobalSidebar';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Check if this is a collaboration page
  const isCollaborationPage = pathname.startsWith('/collaborate/');
  
  if (isCollaborationPage) {
    // For collaboration pages, render without sidebar
    return <>{children}</>;
  }
  
  // For all other pages, render with sidebar
  return (
    <GlobalSidebar>
      {children}
    </GlobalSidebar>
  );
}

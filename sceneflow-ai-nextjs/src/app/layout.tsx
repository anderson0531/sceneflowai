import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { StoreProvider } from '@/components/providers/StoreProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { GlobalSidebar } from '@/components/layout/GlobalSidebar'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SceneFlow AI - AI-Powered Video Creation',
  description: 'Transform your ideas into professional videos with AI-powered workflow automation',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SceneFlow AI',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#00BFA5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="application-name" content="SceneFlow AI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SceneFlow AI" />
        <meta name="description" content="Transform your ideas into professional videos with AI-powered workflow automation" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#00BFA5" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://sceneflowai.com" />
        <meta name="twitter:title" content="SceneFlow AI" />
        <meta name="twitter:description" content="Transform your ideas into professional videos with AI-powered workflow automation" />
        <meta name="twitter:image" content="/favicon.ico" />
        <meta name="twitter:creator" content="@sceneflowai" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SceneFlow AI" />
        <meta property="og:description" content="Transform your ideas into professional videos with AI-powered workflow automation" />
        <meta property="og:site_name" content="SceneFlow AI" />
        <meta property="og:url" content="https://sceneflowai.com" />
        <meta property="og:image" content="/favicon.ico" />
      </head>
      <body className={`${inter.className} bg-base text-sf-text-secondary`}>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <InstallPrompt />
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { StoreProvider } from '@/components/providers/StoreProvider'
import { GlobalSidebar } from '@/components/layout/GlobalSidebar'
import AuthSessionProvider from '@/components/providers/AuthSessionProvider'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'
import { GlobalHeader } from '@/components/layout/GlobalHeader'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'sonner'
import ProcessingOverlay from '../components/ProcessingOverlay'
import { CreditsProvider } from '@/contexts/CreditsContext'
import { CookieConsent } from '@/components/ui/CookieConsent'

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

// Disable static prerender across the app to avoid build-time evaluation of dynamic code
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
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
        
        {/* JSON-LD Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "SceneFlow AI",
              "applicationCategory": "MultimediaApplication",
              "operatingSystem": "Web",
              "description": "Transform your ideas into professional videos with AI-powered workflow automation. Go from napkin idea to festival-ready film in 4 hours.",
              "url": "https://sceneflowai.studio",
              "image": "https://sceneflowai.studio/logos/sceneflow-logo.png",
              "author": {
                "@type": "Organization",
                "name": "SceneFlow AI"
              },
              "offers": [
                {
                  "@type": "Offer",
                  "name": "Trial",
                  "price": "15.00",
                  "priceCurrency": "USD",
                  "description": "One-time purchase: 1,200 credits to test drive the platform"
                },
                {
                  "@type": "Offer",
                  "name": "Starter",
                  "price": "49.00",
                  "priceCurrency": "USD",
                  "description": "Monthly subscription: 4,500 credits for hobbyists"
                },
                {
                  "@type": "Offer",
                  "name": "Pro",
                  "price": "149.00",
                  "priceCurrency": "USD",
                  "description": "Monthly subscription: 15,000 credits for freelancers"
                },
                {
                  "@type": "Offer",
                  "name": "Studio",
                  "price": "599.00",
                  "priceCurrency": "USD",
                  "description": "Monthly subscription: 75,000 credits for agencies"
                }
              ],
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150",
                "bestRating": "5",
                "worstRating": "1"
              }
            })
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* Skip to main content link for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:outline focus:outline-2 focus:outline-cyan-500 focus:shadow-lg"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthSessionProvider>
            <CreditsProvider>
              <GlobalHeader />
              <ConditionalLayout>{children}</ConditionalLayout>
              <InstallPrompt />
              <Toaster 
                position="top-right" 
                richColors 
                theme="dark"
                closeButton
                toastOptions={{
                  style: {
                    background: '#1f2937', // gray-800
                    color: '#f3f4f6', // gray-100
                    border: '1px solid #374151', // gray-700
                    opacity: 1,
                  },
                  className: 'bg-gray-800 text-gray-100 border-gray-700 shadow-lg !opacity-100 whitespace-pre-wrap',
                }}
              />
              <ProcessingOverlay />
              <CookieConsent />
            </CreditsProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

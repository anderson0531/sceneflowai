import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { StoreProvider } from '@/components/providers/StoreProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { CueAssistantWidget } from '@/components/dashboard/CueAssistantWidget'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SceneFlow AI - AI-Powered Video Creation',
  description: 'Transform your ideas into professional videos with AI-powered workflow automation',
  manifest: '/manifest.json',
  themeColor: '#7B1FA2',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SceneFlow AI',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

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
        <meta name="msapplication-TileColor" content="#1976D2" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#1976D2" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://sceneflowai.com" />
        <meta name="twitter:title" content="SceneFlow AI" />
        <meta name="twitter:description" content="Transform your ideas into professional videos with AI-powered workflow automation" />
        <meta name="twitter:image" content="/icons/icon-192x192.png" />
        <meta name="twitter:creator" content="@sceneflowai" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SceneFlow AI" />
        <meta property="og:description" content="Transform your ideas into professional videos with AI-powered workflow automation" />
        <meta property="og:site_name" content="SceneFlow AI" />
        <meta property="og:url" content="https://sceneflowai.com" />
        <meta property="og:image" content="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <StoreProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              {children}
              <CueAssistantWidget />
            </AuthProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  )
}

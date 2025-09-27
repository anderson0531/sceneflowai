import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import Providers from '@/components/layout/Providers';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SceneFlow AI",
  description: "AI-powered video creation studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <Analytics />
          <SpeedInsights />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

'use client'

import { motion } from 'framer-motion'
import { Key, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface PlatformStatusProps {
  platformName: string
  isConnected: boolean
}

const PlatformStatus = ({ platformName, isConnected }: PlatformStatusProps) => (
  <div className="flex items-center justify-between py-3">
    <span className="text-gray-300">{platformName}</span>
    {isConnected ? (
      <span className="text-xs font-medium flex items-center text-green-400">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
        Connected
      </span>
    ) : (
      <button className="text-xs font-medium text-red-500 hover:text-red-400">
        Key Required
      </button>
    )}
  </div>
);

export function BYOKIntegrationStatus() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
    >
      <h2 className="text-xl font-semibold mb-4 text-white">Video Generation (BYOK)</h2>
      <p className="text-sm text-gray-400 mb-4">Platform status required for Phase 2 Generation.</p>

      <div className="divide-y divide-gray-700">
        <PlatformStatus platformName="RunwayML" isConnected={true} />
        <PlatformStatus platformName="Pika Labs" isConnected={true} />
        <PlatformStatus platformName="Stable Video (API)" isConnected={false} />
        <PlatformStatus platformName="Google Gemini Veo" isConnected={true} />
        <PlatformStatus platformName="OpenAI Sora" isConnected={false} />
        <PlatformStatus platformName="Luma AI" isConnected={false} />
      </div>

      <Link href="/dashboard/settings/byok" className="block mt-4">
        <Button variant="outline" size="sm" className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-500">
          Manage Integrations & Keys
        </Button>
      </Link>
    </motion.div>
  )
}

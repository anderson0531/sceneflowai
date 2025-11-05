'use client'

import { motion } from 'framer-motion'
import { Zap, CheckCircle, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function IntegrationsPage() {
  const integrations = [
    {
      name: 'BYOK Settings',
      description: 'Configure your own API keys for AI providers',
      icon: '🔑',
      href: '/dashboard/settings/byok',
      available: true,
    },
    {
      name: 'Google Cloud',
      description: 'Connect Google Cloud services for advanced features',
      icon: '☁️',
      href: '#',
      available: false,
    },
    {
      name: 'Slack',
      description: 'Get notifications and updates in Slack',
      icon: '💬',
      href: '#',
      available: false,
    },
    {
      name: 'Discord',
      description: 'Connect your Discord server for notifications',
      icon: '🎮',
      href: '#',
      available: false,
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-dark-card border-dark-border text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-sf-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Integrations</CardTitle>
              <CardDescription className="text-gray-400">
                Connect external services and AI providers to enhance your workflow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className={`p-4 rounded-lg border ${
                  integration.available
                    ? 'bg-dark-bg border-dark-border hover:border-sf-primary/50'
                    : 'bg-dark-bg/50 border-dark-border/50 opacity-60'
                } transition-colors`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <h3 className="text-white font-semibold">{integration.name}</h3>
                      {integration.available && (
                        <CheckCircle className="w-4 h-4 text-green-400 mt-1" />
                      )}
                    </div>
                  </div>
                  {!integration.available && (
                    <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm mb-4">{integration.description}</p>
                {integration.available ? (
                  <Link href={integration.href}>
                    <Button
                      variant="outline"
                      className="w-full border-dark-border text-dark-text hover:bg-dark-bg"
                    >
                      Configure
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    disabled
                    className="w-full border-dark-border text-gray-500"
                  >
                    Coming Soon
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}


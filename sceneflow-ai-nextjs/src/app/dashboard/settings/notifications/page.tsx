'use client'

import { motion } from 'framer-motion'
import { Bell, Mail, Smartphone } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function NotificationsPage() {
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
              <Bell className="w-5 h-5 text-sf-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Notification Preferences</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your email and push notification settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-gray-400" />
                <h3 className="text-white font-semibold">Email Notifications</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Configure which email notifications you want to receive.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">Project Updates</p>
                    <p className="text-gray-400 text-xs">Get notified when your projects are updated</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded border-dark-border" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">Credit Alerts</p>
                    <p className="text-gray-400 text-xs">Notifications about credit usage and balance</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded border-dark-border" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">System Announcements</p>
                    <p className="text-gray-400 text-xs">Important updates and feature announcements</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded border-dark-border" defaultChecked />
                </div>
              </div>
            </div>

            <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
              <div className="flex items-center gap-3 mb-4">
                <Smartphone className="w-5 h-5 text-gray-400" />
                <h3 className="text-white font-semibold">Push Notifications</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Enable browser push notifications for real-time updates.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">Browser Notifications</p>
                    <p className="text-gray-400 text-xs">Receive push notifications in your browser</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 rounded border-dark-border" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>Note:</strong> Notification preferences are being rebuilt. Full functionality will be available soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}


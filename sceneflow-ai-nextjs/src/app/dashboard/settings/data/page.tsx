'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Download, Trash2, Shield, Loader } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

export default function DataPrivacyPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      // TODO: Implement data export API
      toast.info('Data export feature coming soon')
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Data export will be available soon')
    } catch (error) {
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      // TODO: Implement account deletion API
      toast.info('Account deletion feature coming soon')
      // Simulate deletion
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.error('Account deletion is not yet available. Please contact support.')
    } catch (error) {
      toast.error('Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Data Export */}
      <Card className="bg-dark-card border-dark-border text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sf-primary/20 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-sf-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Data Export</CardTitle>
              <CardDescription className="text-gray-400">
                Download a copy of your account data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Request a complete export of your account data, including projects, settings, and usage history.
              The export will be delivered to your registered email address.
            </p>
            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="bg-sf-primary hover:bg-sf-accent text-white flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Request Data Export
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card className="bg-dark-card border-dark-border text-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Privacy Settings</CardTitle>
              <CardDescription className="text-gray-400">
                Control how your data is used and shared
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
              <div>
                <p className="text-white text-sm font-medium">Analytics & Usage Tracking</p>
                <p className="text-gray-400 text-xs">Help improve SceneFlow by sharing anonymous usage data</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-dark-border" defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
              <div>
                <p className="text-white text-sm font-medium">Marketing Communications</p>
                <p className="text-gray-400 text-xs">Receive emails about new features and offers</p>
              </div>
              <input type="checkbox" className="w-5 h-5 rounded border-dark-border" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="bg-dark-card border-dark-border text-white border-red-500/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-red-400">Danger Zone</CardTitle>
              <CardDescription className="text-gray-400">
                Permanently delete your account and all data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Once you delete your account, there is no going back. This will permanently delete all your projects,
              data, and account information. This action cannot be undone.
            </p>
            <Button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete My Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}


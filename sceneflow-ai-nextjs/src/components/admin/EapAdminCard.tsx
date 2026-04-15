import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

export function EapAdminCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <ClipboardList className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">EAP Admin</h3>
          <p className="text-sm text-gray-400 mb-4">
            Review Early Access applications, manage statuses, score candidates, add notes, and export data.
          </p>
          <Link
            href="/dashboard/settings/admin/eap"
            className="inline-flex items-center justify-center rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/20 transition-colors"
          >
            Open EAP Admin
          </Link>
        </div>
      </div>
    </div>
  )
}

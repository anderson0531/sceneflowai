'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Bell, Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type NotificationRow = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  project_id?: string | null
}

export function NotificationCenter({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (res.ok) setNotifications(data.notifications || [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    void load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [userId, load])

  const unread = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    if (!userId) return
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, markAllRead: true }),
    })
    void load()
  }

  if (!userId) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative text-zinc-400 hover:text-white"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl z-[90]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <span className="text-xs font-semibold text-white">Notifications</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={markAllRead} title="Mark all read">
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'px-3 py-2 border-b border-zinc-800/80 text-sm',
                    !n.read && 'bg-sf-primary/5'
                  )}
                >
                  <div className="font-medium text-white text-xs">{n.title}</div>
                  <div className="text-zinc-400 text-xs mt-0.5">{n.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

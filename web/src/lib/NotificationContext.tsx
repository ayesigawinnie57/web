import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { notificationsApi, hasAccessToken, type ApiNotification } from './api'
import {
  findNewUnreadNotifications,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type BrowserNotificationPermission,
} from './browserNotifications'

export const NOTIFICATION_UPDATED_EVENT = 'notification_updated'

export type NotificationType = 'order' | 'welcome' | 'promo' | 'system' | 'service_rating' | 'product_rating'

export type Notification = {
  id: string
  type: NotificationType
  title: string
  body: string
  actionUrl: string
  read: boolean
  createdAt: string
  slug: string
}

function toSlug(id: string, title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) + '-' + id
}

function fromApi(n: ApiNotification): Notification {
  return {
    id: String(n.id),
    type: n.type,
    title: n.title,
    body: n.body,
    actionUrl: n.action_url,
    read: n.read,
    createdAt: n.created_at,
    slug: toSlug(String(n.id), n.title),
  }
}

type Ctx = {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markRead: (id: string) => void
  markAllRead: () => void
  deleteNotification: (id: string) => void
  refresh: () => void
  browserPermission: BrowserNotificationPermission
  requestBrowserPermission: () => Promise<BrowserNotificationPermission>
}

const NotificationContext = createContext<Ctx | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [browserPermission, setBrowserPermission] = useState(getBrowserNotificationPermission)
  const knownNotificationIds = useRef<Set<number> | null>(null)

  const refresh = useCallback(async () => {
    if (!hasAccessToken()) {
      setNotifications([])
      knownNotificationIds.current = null
      return
    }
    setLoading(true)
    try {
      const { data } = await notificationsApi.list()
      setNotifications(data.map(fromApi))
      const newNotifications = findNewUnreadNotifications(data, knownNotificationIds.current)
      knownNotificationIds.current = new Set(data.map(notification => notification.id))
      newNotifications.forEach(notification => {
        void showBrowserNotification(notification).catch(error => {
          console.error('Browser notification could not be shown.', error)
        })
      })
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const requestBrowserPermission = useCallback(async () => {
    const permission = await requestBrowserNotificationPermission()
    setBrowserPermission(permission)
    return permission
  }, [])

  // Fetch on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  // Re-fetch when user logs in/out in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token') refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  // Poll every 30 s while logged in
  useEffect(() => {
    if (!hasAccessToken()) return
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  // Refresh when tab becomes visible again
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  // Refresh on custom event (e.g. after order placed)
  useEffect(() => {
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(NOTIFICATION_UPDATED_EVENT, refresh)
  }, [refresh])

  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    notificationsApi.markRead(Number(id)).catch(() => {})
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    notificationsApi.markAllRead().catch(() => {})
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    notificationsApi.delete(Number(id)).catch(() => {})
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markRead,
      markAllRead,
      deleteNotification,
      refresh,
      browserPermission,
      requestBrowserPermission,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

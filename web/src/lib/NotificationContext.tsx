import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { notificationsApi, hasAccessToken, type ApiNotification } from './api'

export type NotificationType = 'order' | 'welcome' | 'promo' | 'system' | 'service_rating' | 'product_rating'

export type Notification = {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
}

function fromApi(n: ApiNotification): Notification {
  return {
    id: String(n.id),
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.created_at,
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
}

const NotificationContext = createContext<Ctx | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!hasAccessToken()) { setNotifications([]); return }
    setLoading(true)
    try {
      const { data } = await notificationsApi.list()
      setNotifications(data.map(fromApi))
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
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
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markRead, markAllRead, deleteNotification, refresh }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

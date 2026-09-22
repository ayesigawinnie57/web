import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type NotificationType = 'order' | 'welcome' | 'promo' | 'system' | 'service_rating' | 'product_rating'

export type Notification = {
  id: string
  type: NotificationType
  title: string
  body: string
  time: string
  read: boolean
  createdAt?: string
}

const STORAGE_KEY = 'majo_notifications'

const createNotificationId = (existing: Notification[] = []) => {
  const base = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  if (!existing.some(n => n.id === base)) return base

  let candidate = base
  let counter = 1
  while (existing.some(n => n.id === candidate)) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  return candidate
}

const sanitizeNotifications = (items: unknown): Notification[] => {
  if (!Array.isArray(items)) return []

  const safe: Notification[] = []
  const seen = new Set<string>()

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return

    const candidate = (item as Partial<Notification>)
    const baseId = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : createNotificationId(safe)
    let id = baseId
    if (seen.has(id)) {
      id = `${baseId}-${index}-${Math.random().toString(36).slice(2, 8)}`
    }
    seen.add(id)

    const normalizedTitle = typeof candidate.title === 'string' ? candidate.title : 'Notification'
    const normalizedType = (candidate.type as NotificationType) || 'system'
    const cleanedTitle =
      normalizedType === 'service_rating' && normalizedTitle.includes('⭐')
        ? 'How was your order experience?'
        : normalizedTitle

    safe.push({
      id,
      type: normalizedType,
      title: cleanedTitle,
      body: typeof candidate.body === 'string'
        ? (normalizedType === 'service_rating' && candidate.body.includes('⭐')
            ? candidate.body.replace('⭐ ', '')
            : candidate.body)
        : '',
      time: typeof candidate.time === 'string' ? candidate.time : 'Just now',
      read: Boolean(candidate.read),
      createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    })
  })

  return safe
}

const DEMO_NOTIFICATION_IDS = new Set(['1', '2', '3'])

type AddFn = (n: Omit<Notification, 'id' | 'read'>) => void

// Global ref so non-component code (checkout, order screens) can push notifications
const globalAdd = { current: null as AddFn | null }
const pendingNotifications: Array<Omit<Notification, 'id' | 'read'>> = []
export const pushNotification: AddFn = (n) => {
  if (globalAdd.current) globalAdd.current(n)
  else pendingNotifications.push(n)
}

type NotificationContextType = {
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  markSelectedRead: (ids: string[]) => void
  deleteNotification: (id: string) => void
  deleteSelected: (ids: string[]) => void
  addNotification: AddFn
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)

  // Load persisted notifications on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          setNotifications(sanitizeNotifications(parsed).filter(notification => !DEMO_NOTIFICATION_IDS.has(notification.id)))
        } catch {
          setNotifications([])
        }
      }
      setLoaded(true)
    })
  }, [])

  // Persist whenever notifications change (after initial load)
  useEffect(() => {
    if (!loaded) return
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications, loaded])

  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = useCallback((id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), [])

  const markAllRead = useCallback(() =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true }))), [])

  const markSelectedRead = useCallback((ids: string[]) =>
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)), [])

  const deleteNotification = useCallback((id: string) =>
    setNotifications(prev => prev.filter(n => n.id !== id)), [])

  const deleteSelected = useCallback((ids: string[]) =>
    setNotifications(prev => prev.filter(n => !ids.includes(n.id))), [])

  const addNotification: AddFn = useCallback((n) =>
    setNotifications(prev => [{
      ...n,
      id: createNotificationId(prev),
      read: false,
      createdAt: new Date().toISOString(),
    }, ...prev]), [])

  useEffect(() => {
    if (!loaded) return
    globalAdd.current = addNotification
    pendingNotifications.splice(0).forEach(addNotification)
    return () => {
      globalAdd.current = null
    }
  }, [addNotification, loaded])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, markSelectedRead, deleteNotification, deleteSelected, addNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

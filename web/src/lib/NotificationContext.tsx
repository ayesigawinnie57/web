import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type NotificationType = 'order' | 'welcome' | 'promo' | 'system' | 'service_rating' | 'product_rating'

export type Notification = {
  id: string
  slug: string
  type: NotificationType
  title: string
  body: string
  time: string
  read: boolean
  createdAt?: string
}

const STORAGE_KEY = 'majo_notifications'

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
      })

const makeSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

const INITIAL: Notification[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    slug: 'welcome-to-majo-gadgets',
    type: 'welcome',
    title: 'Welcome to Majo Gadgets',
    body: 'Thanks for signing in. Explore our latest gadgets and enjoy exclusive deals made just for you.',
    time: '1 hr ago',
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    slug: 'todays-special-savings-30-off',
    type: 'promo',
    title: "Today's Special Savings — 30% Off",
    body: 'Today only: get 30% off on all accessories. Use code MAJO30 at checkout. Offer expires at midnight.',
    time: '3 hr ago',
    read: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    slug: 'app-updated',
    type: 'system',
    title: 'App Updated',
    body: 'Majo Gadgets has been updated with new features and performance improvements.',
    time: '2 days ago',
    read: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

type AddFn = (n: Omit<Notification, 'id' | 'slug' | 'read'>) => void

const globalAdd = { current: null as AddFn | null }
const pending: Array<Omit<Notification, 'id' | 'slug' | 'read'>> = []
export const pushNotification: AddFn = (n) => {
  if (globalAdd.current) globalAdd.current(n)
  else pending.push(n)
}

type Ctx = {
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  markSelectedRead: (ids: string[]) => void
  deleteNotification: (id: string) => void
  deleteSelected: (ids: string[]) => void
  addNotification: AddFn
}

const NotificationContext = createContext<Ctx | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: Notification[] = JSON.parse(raw)
        // migrate old notifications that have no slug
        const migrated = parsed.map(n => ({
          ...n,
          slug: n.slug || makeSlug(n.title),
        }))
        setNotifications(migrated)
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)) } catch { /* ignore */ }
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
    setNotifications(prev => [{ ...n, id: makeId(), slug: makeSlug(n.title), read: false, createdAt: new Date().toISOString() }, ...prev]), [])

  useEffect(() => {
    if (!loaded) return
    globalAdd.current = addNotification
    pending.splice(0).forEach(addNotification)
    return () => { globalAdd.current = null }
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

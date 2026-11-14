import type { ApiNotification } from './api'

export type BrowserNotificationPermission = NotificationPermission | 'unsupported'

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return window.Notification.permission
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return window.Notification.requestPermission()
}

export function findNewUnreadNotifications(
  notifications: ApiNotification[],
  previousIds: Set<number> | null,
): ApiNotification[] {
  if (!previousIds) return []
  return notifications.filter(notification => !notification.read && !previousIds.has(notification.id))
}

function safeActionPath(actionUrl: string) {
  return actionUrl.startsWith('/') && !actionUrl.startsWith('//')
    ? actionUrl
    : '/notifications'
}

export async function showBrowserNotification(notification: ApiNotification) {
  if (getBrowserNotificationPermission() !== 'granted') return

  const actionUrl = safeActionPath(notification.action_url)
  const options: NotificationOptions = {
    body: notification.body.split('|')[0],
    tag: `majo-notification-${notification.id}`,
    data: { actionUrl },
  }
  const registration = 'serviceWorker' in navigator
    ? await navigator.serviceWorker.getRegistration()
    : undefined

  if (registration) {
    await registration.showNotification(notification.title, options)
    return
  }

  const browserNotification = new window.Notification(notification.title, options)
  browserNotification.onclick = () => {
    window.focus()
    window.location.assign(actionUrl)
    browserNotification.close()
  }
}

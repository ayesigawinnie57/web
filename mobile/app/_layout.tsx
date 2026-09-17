import { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Navbar, { BottomNav } from './landing/Navbar'
import { WishlistProvider } from './lib/WishlistContext'
import { CartProvider } from './lib/CartContext'
import { NotificationProvider, pushNotification } from './lib/NotificationContext'
import { FilterProvider } from './lib/FilterContext'
import { AuthProvider } from './lib/AuthContext'
import { ordersApi } from './lib/products'
import { tokenStore } from './lib/auth'

const STATUS_CACHE_KEY = 'majo_order_statuses'
const RATED_CACHE_KEY  = 'majo_rated_orders'
const PRODUCT_REVIEW_CACHE_KEY = 'majo_product_review_notifications'
const POLL_INTERVAL = 30_000

const STATUS_MESSAGES: Record<string, { title: string; body: (code: string) => string }> = {
  processing: {
    title: 'Order Confirmed',
    body: (code) => `Order No: ${code} has been confirmed and is being prepared for shipment.`,
  },
  shipped: {
    title: 'Order Shipped',
    body: (code) => `Order No: ${code} is on its way. Expected delivery in 2–3 business days.`,
  },
  delivered: {
    title: 'Order Delivered',
    body: (code) => `Order No: ${code} has been delivered! Thank you for shopping with Majo Gadgets.`,
  },
  cancelled: {
    title: 'Order Cancelled',
    body: (code) => `Order No: ${code} has been cancelled by the store.`,
  },
}

async function pollOrderStatuses() {
  const token = await tokenStore.getAccess()
  if (!token) return
  try {
    const { data } = await ordersApi.list()
    const raw = data as any
    const orders = Array.isArray(raw) ? raw : (raw?.results ?? [])
    const cached = JSON.parse((await AsyncStorage.getItem(STATUS_CACHE_KEY)) ?? '{}')
    const rated  = JSON.parse((await AsyncStorage.getItem(RATED_CACHE_KEY))  ?? '{}')
    const productReviewNotified = JSON.parse((await AsyncStorage.getItem(PRODUCT_REVIEW_CACHE_KEY)) ?? '{}')
    const storedNotifications = JSON.parse((await AsyncStorage.getItem('majo_notifications')) ?? '[]')
    const updated: Record<string, string> = { ...cached }
    for (const order of orders) {
      const prev = cached[order.code]
      if (prev && prev !== order.status && STATUS_MESSAGES[order.status]) {
        const { title, body } = STATUS_MESSAGES[order.status]
        pushNotification({ type: 'order', title: `Order No: ${order.code} — ${title}`, body: body(order.code), time: 'Just now' })
      }
      // push service-rating request once after delivery, only if not already rated
      if (order.status === 'delivered' && !order.has_service_rating && !rated[order.code]) {
        pushNotification({
          type: 'service_rating',
          title: 'How was your order experience?',
          body: `We hope your order ${order.code} arrived just the way you wanted. If you have a minute, we’d love to hear how it went.|${order.code}`,
          time: 'Just now',
        })
        rated[order.code] = true
        await AsyncStorage.setItem(RATED_CACHE_KEY, JSON.stringify(rated))
      }
      if (order.status === 'delivered') {
        for (const item of order.items ?? []) {
          const product = item.product
          const productSlug = product?.slug
          const notificationKey = `${order.code}:${item.id}`
          const notificationExists = Array.isArray(storedNotifications) && storedNotifications.some(
            (notification: any) => notification?.type === 'product_rating' && notification?.body?.endsWith(`|${productSlug}`)
          )
          if (!productSlug || (productReviewNotified[notificationKey] && notificationExists)) continue
          pushNotification({
            type: 'product_rating',
            title: 'How do you like your new gadget?',
            body: `Your ${product.name} has arrived. Share a quick product review to help other shoppers choose with confidence.|${productSlug}`,
            time: 'Just now',
          })
          productReviewNotified[notificationKey] = true
        }
        await AsyncStorage.setItem(PRODUCT_REVIEW_CACHE_KEY, JSON.stringify(productReviewNotified))
      }
      updated[order.code] = order.status
    }
    await AsyncStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(updated))
  } catch { }
}

function OrderStatusPoller() {
  useEffect(() => {
    pollOrderStatuses()
    const id = setInterval(pollOrderStatuses, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [])
  return null
}

function AppShell() {
  const openAccountRef = useRef<() => void>()

  return (
    <View style={styles.container}>
      <OrderStatusPoller />
      <Navbar onRequestOpenAccount={(fn) => { openAccountRef.current = fn }} />
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav onAccountOpen={() => openAccountRef.current?.()} />
    </View>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <FilterProvider>
                <AppShell />
              </FilterProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
})

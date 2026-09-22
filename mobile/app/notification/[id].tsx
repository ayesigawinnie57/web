import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, ShoppingBag, UserCheck, Tag, Info, PackageCheck, Truck, Trash2, CheckCircle, Star } from 'lucide-react-native'
import { C } from '../theme'
import { useNotifications, type NotificationType } from '../lib/NotificationContext'
import { productsApi, toCardProduct } from '../lib/products'
import type { Product } from '../components/ProductCard'

const CARD_W = (Dimensions.get('window').width - 40 - 16) / 3

const TYPE_META: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  order:          { icon: ShoppingBag, color: C.green,   bg: '#DCFCE7' },
  welcome:        { icon: UserCheck,   color: '#6366F1', bg: '#EEF2FF' },
  promo:          { icon: Tag,         color: '#F59E0B', bg: '#FEF3C7' },
  system:         { icon: Info,        color: C.muted,   bg: C.border  },
  service_rating: { icon: Star,        color: '#F59E0B', bg: '#FEF3C7' },
  product_rating: { icon: Star,        color: C.green,   bg: '#DCFCE7' },
}

const NUDGE: Record<NotificationType, string> = {
  welcome:        "You're all set. Thousands of people shop here every day — see what they're picking up.",
  promo:          "Deals like this don't last. Stock up before they're gone.",
  system:         "Everything's running smoothly. Take a look at what's new in the shop.",
  order:          "Keep exploring while we handle your order.",
  service_rating: "Your feedback helps us make every order feel more personal and more helpful next time.",
  product_rating: "Your honest product feedback helps other shoppers choose with confidence.",
}

function getOrderNudge(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('placed'))    return "Your order is in — now treat yourself to something else while you wait."
  if (t.includes('confirm'))   return "It's confirmed and being packed. Good time to pick up anything you missed."
  if (t.includes('ship'))      return "It's on the road. Why not get a head start on your next order?"
  if (t.includes('deliver'))   return "It arrived! Hope you love it. Ready to shop again?"
  if (t.includes('cancel'))    return "Order cancelled. No worries — there's plenty more waiting for you in the shop."
  return "Keep exploring while we handle your order."
}

function getOrderIcon(title: string, color: string) {
  const t = title.toLowerCase()
  if (t.includes('ship'))    return <Truck        size={18} color={color} />
  if (t.includes('confirm')) return <PackageCheck size={18} color={color} />
  if (t.includes('deliver')) return <CheckCircle  size={18} color={color} />
  return <ShoppingBag size={18} color={color} />
}

function formatDate(iso?: string) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })
}

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { notifications, markRead, deleteNotification } = useNotifications()
  const [products, setProducts] = useState<Product[]>([])

  const n = notifications.find(x => x.id === id)
  if (n && !n.read) markRead(n.id)

  useEffect(() => {
    productsApi.list().then(({ data }) => {
      const all = (data as any)?.results ?? data
      // shuffle and take 3
      const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 3)
      setProducts(shuffled.map(toCardProduct))
    }).catch(() => {})
  }, [])

  if (!n) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.missingText}>Notification not found.</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/notifications' as any)}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const meta = TYPE_META[n.type]
  const Icon = meta.icon
  const isOrderNotification = n.type.startsWith(String.fromCharCode(111, 114, 100))

  const handleDelete = () => {
    deleteNotification(n.id)
    router.canGoBack() ? router.back() : router.replace('/notifications' as any)
  }

  const paragraphs = n.body.split('\n').filter(l => l.trim() !== '')
  // Rating notifications encode their route parameter after a pipe.
  const isServiceRating = n.type === 'service_rating'
  const isProductRating = n.type === 'product_rating'
  const isRating = isServiceRating || isProductRating
  const [ratingBody, ratingTarget] = isRating ? n.body.split('|') : [n.body, '']
  const displayParagraphs = (isRating ? ratingBody : n.body).split('\n').filter(l => l.trim() !== '')

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/notifications' as any)}>
          <ArrowLeft size={20} color={C.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Trash2 size={17} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
            {isOrderNotification ? getOrderIcon(n.title, meta.color) : <Icon size={18} color={meta.color} />}
          </View>
          <Text style={styles.title}>{n.title}</Text>
        </View>

        <Text style={styles.date}>{formatDate(n.createdAt) ?? n.time}</Text>

        <View style={styles.divider} />

        <View style={styles.body}>
          {displayParagraphs.map((p, i) => (
            <Text key={i} style={styles.bodyText}>{p}</Text>
          ))}
        </View>

        {/* Service rating CTA */}
        {isServiceRating && ratingTarget && (
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => router.push(`/rate/${ratingTarget}` as any)}
            activeOpacity={0.85}
          >
            <Star size={16} color="#fff" fill="#fff" />
            <Text style={styles.rateBtnText}>Rate Your Experience</Text>
          </TouchableOpacity>
        )}

        {isProductRating && ratingTarget && (
          <TouchableOpacity
            style={[styles.rateBtn, { backgroundColor: C.green }]}
            onPress={() => router.push(`/product-review/${ratingTarget}` as any)}
            activeOpacity={0.85}
          >
            <Star size={16} color="#fff" fill="#fff" />
            <Text style={styles.rateBtnText}>Review This Product</Text>
          </TouchableOpacity>
        )}

        {/* Persuasive nudge */}
        <View style={styles.nudgeWrap}>
          <Text style={styles.nudgeText}>
            {n.type === 'service_rating'
              ? 'Your feedback helps us make every order feel more personal and more helpful next time.'
              : (n.type === 'order' ? getOrderNudge(n.title) : NUDGE[n.type])}
          </Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/shop' as any)}>
            <Text style={styles.shopBtnText}>See what’s new</Text>
          </TouchableOpacity>
        </View>

        {/* Related products */}
        {products.length > 0 && (
          <View style={styles.productsSection}>
            <Text style={styles.productsSectionTitle}>You might like</Text>
            <View style={styles.productsRow}>
              {products.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.miniCard}
                  onPress={() => router.push(`/shop/${p.slug ?? p.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.miniImageBox}>
                    {p.image
                      ? <Image source={{ uri: p.image }} style={styles.miniImage} resizeMode="cover" />
                      : <ShoppingBag size={18} color={C.mutedLight} />}
                  </View>
                  <View style={styles.miniInfo}>
                    <Text style={styles.miniName} numberOfLines={2}>{p.name}</Text>
                    <Text style={styles.miniPrice}>UGX {p.price.toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  missingText: { fontSize: 14, color: C.muted, marginBottom: 10 },
  backLink: { fontSize: 14, color: C.green, fontWeight: '700' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.navy },
  deleteBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#FFF1F2', alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 20, gap: 14 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: C.navy, lineHeight: 22 },

  date: { fontSize: 12, color: C.mutedLight },

  divider: { height: 1, backgroundColor: C.border },

  body: { gap: 8 },
  bodyText: { fontSize: 14, color: C.navy, lineHeight: 22 },

  nudgeWrap: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  nudgeText: { fontSize: 13, color: C.muted, lineHeight: 20 },
  shopBtn: { backgroundColor: C.navy, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  shopBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 14 },
  rateBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  productsSection: { gap: 8 },
  productsSectionTitle: { fontSize: 13, fontWeight: '700', color: C.navy },
  productsRow: { flexDirection: 'row', gap: 8 },
  miniCard: { width: CARD_W, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  miniImageBox: { width: '100%', height: CARD_W, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  miniImage: { width: '100%', height: '100%' },
  miniInfo: { padding: 6, gap: 3 },
  miniName: { fontSize: 10, fontWeight: '700', color: C.navy, lineHeight: 13 },
  miniPrice: { fontSize: 10, fontWeight: '800', color: C.green },
})

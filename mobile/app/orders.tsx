import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, ChevronRight, ShoppingBag } from 'lucide-react-native'
import { ordersApi, type ApiOrder } from './lib/products'
import { C } from './theme'

type Tab = 'pending' | 'delivered' | 'cancelled'

const TABS: { key: Tab; label: string; icon: any; color: string }[] = [
  { key: 'pending',   label: 'Pending',   icon: Clock,         color: '#f59e0b' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle,   color: C.green   },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle,       color: '#ef4444' },
]

const PENDING_STATUSES = ['pending', 'processing', 'shipped', 'ready_for_pickup']

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#92400e', bg: '#fef3c7' },
  processing: { label: 'Confirmed',  color: '#1e40af', bg: '#dbeafe' },
  shipped:    { label: 'Shipped',    color: '#6d28d9', bg: '#ede9fe' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#b45309', bg: '#fef9c3' },
  delivered:  { label: 'Delivered',  color: '#166534', bg: '#dcfce7' },
  cancelled:  { label: 'Cancelled',  color: '#991b1b', bg: '#fee2e2' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await ordersApi.list()
      const raw = data as any
      setOrders(Array.isArray(raw) ? raw : (raw?.results ?? []))
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [])

  const filtered = orders.filter(o => {
    if (tab === 'pending')   return PENDING_STATUSES.includes(o.status)
    if (tab === 'delivered') return o.status === 'delivered'
    return o.status === 'cancelled'
  })

  const counts = {
    pending:   orders.filter(o => PENDING_STATUSES.includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)} style={styles.backBtn}>
          <ArrowLeft size={20} color={C.navy} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSub}>{orders.length} order{orders.length !== 1 ? 's' : ''} total</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(({ key, label, icon: Icon, color }) => {
          const active = tab === key
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tab, active && { borderBottomColor: color, borderBottomWidth: 2 }]}
              onPress={() => setTab(key)}
              activeOpacity={0.7}
            >
              <Icon size={15} color={active ? color : C.mutedLight} />
              <Text style={[styles.tabLabel, active && { color }]}>{label}</Text>
              {counts[key] > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: active ? color : C.border }]}>
                  <Text style={[styles.tabBadgeText, { color: active ? '#fff' : C.muted }]}>{counts[key]}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.green} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(true) }} tintColor={C.green} />}
        >
          {filtered.length === 0 ? (
            <EmptyState tab={tab} onShop={() => router.push('/shop' as any)} />
          ) : (
            filtered.map(order => (
              <OrderCard key={order.id} order={order} onPress={() => router.push(`/order/${order.code}` as any)} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

function OrderCard({ order, onPress }: { order: ApiOrder; onPress: () => void }) {
  const meta = STATUS_META[order.status] ?? STATUS_META.pending
  const firstImage = order.items[0]?.product?.image ?? null
  const extraCount = order.items.length - 1

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        {/* Thumbnails */}
        <View style={styles.thumbsRow}>
          {firstImage
            ? <Image source={{ uri: firstImage }} style={styles.thumb} resizeMode="cover" />
            : <View style={styles.thumbEmpty}><Package size={20} color={C.mutedLight} /></View>
          }
          {extraCount > 0 && (
            <View style={styles.thumbExtra}>
              <Text style={styles.thumbExtraText}>+{extraCount}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <View style={styles.orderNoRow}>
              <Text style={styles.orderNoLabel}>Order No:</Text>
              <Text style={styles.cardOrderId}>{order.code}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={styles.cardItems} numberOfLines={1}>
            {order.items.map(i => i.product?.name ?? 'Item').join(', ')}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardDate}>{formatDate((order as any).created_at)}</Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={styles.cardTotal}>UGX {Number((order as any).total).toLocaleString()}</Text>
          </View>
        </View>

        <ChevronRight size={16} color={C.mutedLight} />
      </View>

      {/* Item count footer */}
      <View style={styles.cardFooter}>
        <ShoppingBag size={12} color={C.mutedLight} />
        <Text style={styles.cardFooterText}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</Text>
      </View>
    </TouchableOpacity>
  )
}

function EmptyState({ tab, onShop }: { tab: Tab; onShop: () => void }) {
  const msgs: Record<Tab, { icon: any; title: string; sub: string }> = {
    pending:   { icon: Clock,       title: 'No active orders',    sub: 'Orders you place will appear here while being processed.' },
    delivered: { icon: CheckCircle, title: 'No delivered orders', sub: 'Completed orders will show up here once delivered.' },
    cancelled: { icon: XCircle,     title: 'No cancelled orders', sub: "You haven't cancelled any orders." },
  }
  const { icon: Icon, title, sub } = msgs[tab]
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Icon size={36} color={C.mutedLight} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
      {tab === 'pending' && (
        <TouchableOpacity style={styles.shopBtn} onPress={onShop}>
          <Text style={styles.shopBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.navy },
  headerSub: { fontSize: 11, color: C.muted, marginTop: 1 },

  tabBar: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 12, fontWeight: '700', color: C.mutedLight },
  tabBadge: { borderRadius: 999, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeText: { fontSize: 10, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  listEmpty: { flex: 1 },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  thumbsRow: { position: 'relative', width: 52, height: 52 },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  thumbEmpty: { width: 52, height: 52, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  thumbExtra: { position: 'absolute', bottom: -4, right: -8, backgroundColor: C.navy, borderRadius: 999, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.card },
  thumbExtraText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  orderNoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderNoLabel: { fontSize: 11, color: C.mutedLight, fontWeight: '600' },
  cardOrderId: { fontSize: 13, fontWeight: '800', color: C.navy, letterSpacing: 0.5 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardItems: { fontSize: 12, color: C.muted, marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardDate: { fontSize: 11, color: C.mutedLight },
  cardDot: { fontSize: 11, color: C.mutedLight },
  cardTotal: { fontSize: 11, fontWeight: '700', color: C.green },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  cardFooterText: { fontSize: 11, color: C.mutedLight },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.navy },
  emptySub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  shopBtn: { marginTop: 8, backgroundColor: C.green, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  shopBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { CheckCircle, MapPin, Package, PackageCheck, Phone, Search, User, X } from 'lucide-react-native'
import { adminOrdersApi, type ApiOrder } from '../../lib/products'
import { C } from '../theme'

type AdminOrder = ApiOrder & {
  user_name?: string
  user_email?: string
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#92400e', bg: '#fef3c7' },
  processing: { label: 'Confirmed', color: '#1e40af', bg: '#dbeafe' },
  shipped: { label: 'Shipped', color: '#6d28d9', bg: '#ede9fe' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#166534', bg: '#dcfce7' },
  delivered: { label: 'Delivered', color: '#374151', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelled', color: '#991b1b', bg: '#fee2e2' },
}

const money = (value: string | number) => Number(value || 0).toLocaleString()

export default function AdminPickup() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AdminOrder[]>([])
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [searching, setSearching] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadOrder = useCallback(async (code: string) => {
    setSearching(true)
    setError('')
    setOrder(null)
    setDone(false)
    setSuggestions([])
    Keyboard.dismiss()
    try {
      const { data } = await adminOrdersApi.get(code)
      setOrder(data as AdminOrder)
    } catch {
      setError('Order not found. Check the order code and try again.')
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const value = query.trim().toLowerCase()
    if (value.length < 4 || order) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSuggesting(true)
      try {
        const { data } = await adminOrdersApi.list()
        const rows = Array.isArray(data) ? data : data.results ?? []
        setSuggestions((rows as AdminOrder[]).filter((item) => item.code.toLowerCase().includes(value)).slice(0, 6))
      } catch {
        setSuggestions([])
      } finally {
        setSuggesting(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, order])

  const confirmPickup = async () => {
    if (!order) return
    setDelivering(true)
    setError('')
    try {
      const { data } = await adminOrdersApi.deliver(order.code)
      setOrder(data as AdminOrder)
      setDone(true)
    } catch {
      setError('Failed to confirm pickup. Please try again.')
    } finally {
      setDelivering(false)
    }
  }

  const reset = () => {
    setQuery('')
    setOrder(null)
    setSuggestions([])
    setError('')
    setDone(false)
  }

  const meta = order ? (STATUS_META[order.status] ?? STATUS_META.pending) : null
  const isEligible = order?.status === 'ready_for_pickup'

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><PackageCheck size={19} color="#16A34A" /></View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pickup Desk</Text>
          <Text style={styles.subtitle}>Search an order code to confirm in-store customer pickup</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            {searching || suggesting ? <ActivityIndicator size="small" color={C.mutedLight} /> : <Search size={16} color={C.mutedLight} />}
            <TextInput
              value={query}
              onChangeText={(value) => { setQuery(value); setError(''); setOrder(null); setDone(false) }}
              placeholder="Type order code"
              placeholderTextColor={C.mutedLight}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.searchInput}
              onSubmitEditing={() => query.trim() && loadOrder(query.trim())}
              returnKeyType="search"
            />
            {query ? <TouchableOpacity onPress={reset}><X size={16} color={C.mutedLight} /></TouchableOpacity> : null}
          </View>
          <TouchableOpacity style={[styles.searchButton, (!query.trim() || searching) && styles.disabled]} onPress={() => loadOrder(query.trim())} disabled={!query.trim() || searching}>
            <Search size={15} color="#fff" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {suggestions.length > 0 && !order ? (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionLabel}>Matching Orders</Text>
            {suggestions.map((item) => {
              const itemMeta = STATUS_META[item.status] ?? STATUS_META.pending
              return (
                <TouchableOpacity key={item.code} style={styles.suggestionRow} onPress={() => { setQuery(item.code); loadOrder(item.code) }}>
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionCode}>{item.code}</Text>
                    <Text style={styles.suggestionMeta}>{item.user_name ?? 'Customer'} · UGX {money(item.total)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: itemMeta.bg }]}><Text style={[styles.badgeText, { color: itemMeta.color }]}>{itemMeta.label}</Text></View>
                </TouchableOpacity>
              )
            })}
          </View>
        ) : null}

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        {done && order ? (
          <View style={styles.successCard}>
            <CheckCircle size={50} color="#16A34A" />
            <Text style={styles.successTitle}>Pickup Confirmed!</Text>
            <Text style={styles.successText}>Order #{order.code} has been marked as delivered.</Text>
            <TouchableOpacity style={styles.nextButton} onPress={reset}><Text style={styles.nextButtonText}>Next Customer</Text></TouchableOpacity>
          </View>
        ) : order ? (
          <View style={styles.detailStack}>
            <View style={[styles.statusCard, { backgroundColor: meta?.bg, borderColor: `${meta?.color}44` }]}>
              <View><Text style={[styles.statusEyebrow, { color: meta?.color }]}>Order Status</Text><Text style={[styles.statusTitle, { color: meta?.color }]}>{meta?.label}</Text></View>
              {isEligible ? <CheckCircle size={23} color={meta?.color} /> : <Text style={[styles.statusNote, { color: meta?.color }]}>{order.status === 'delivered' ? 'Already delivered' : order.status === 'cancelled' ? 'Cancelled' : 'Not ready yet'}</Text>}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}><Text style={styles.cardEyebrow}>Order Code</Text><Text style={styles.orderCode}>{order.code}</Text></View>
              <View style={styles.infoBody}>
                <InfoRow icon={User} label="Customer" value={order.user_name ?? 'Customer'} detail={order.user_email} />
                {order.phone ? <InfoRow icon={Phone} label="Phone" value={order.phone} /> : null}
                {order.delivery_address ? <InfoRow icon={MapPin} label="Address" value={order.delivery_address} /> : null}
              </View>
              <View style={styles.actionArea}>
                {isEligible ? <TouchableOpacity style={styles.confirmButton} onPress={confirmPickup} disabled={delivering}>{delivering ? <ActivityIndicator color="#fff" /> : <><CheckCircle size={16} color="#fff" /><Text style={styles.confirmText}>Confirm Pickup & Mark Delivered</Text></>}</TouchableOpacity> : <View style={styles.notReady}><Text style={styles.notReadyText}>{order.status === 'delivered' ? 'Already delivered' : order.status === 'cancelled' ? 'Order cancelled' : 'Not yet ready for pickup'}</Text></View>}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.itemsHeader}><Text style={styles.cardEyebrow}>Items</Text><Text style={styles.itemsCount}>{order.items.length} item{order.items.length === 1 ? '' : 's'}</Text></View>
              {order.items.map((item) => <View key={item.id} style={styles.itemRow}><View style={styles.itemIcon}><Package size={15} color="#CBD5E1" /></View><View style={styles.itemInfo}><Text style={styles.itemName} numberOfLines={1}>{item.product?.name ?? 'Product'}</Text><Text style={styles.itemQty}>Qty: {item.quantity}</Text></View><Text style={styles.itemPrice}>UGX {money(Number(item.price) * item.quantity)}</Text></View>)}
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Order Total</Text><Text style={styles.totalValue}>UGX {money(order.total)}</Text></View>
            </View>
          </View>
        ) : !searching ? (
          <View style={styles.emptyState}><View style={styles.emptyIcon}><PackageCheck size={28} color={C.mutedLight} /></View><Text style={styles.emptyTitle}>Ready to serve a customer?</Text><Text style={styles.emptyText}>Type at least 4 characters of the order code to find a pickup.</Text></View>
        ) : null}
      </ScrollView>
    </View>
  )
}

function InfoRow({ icon: Icon, label, value, detail }: { icon: any; label: string; value: string; detail?: string }) {
  return <View style={styles.infoRow}><View style={styles.infoIcon}><Icon size={15} color={C.muted} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text>{detail ? <Text style={styles.infoDetail}>{detail}</Text> : null}</View></View>
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: C.navy },
  subtitle: { fontSize: 11, color: C.muted, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderRadius: 11, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  searchInput: { flex: 1, color: C.navy, fontSize: 13, minWidth: 0 },
  searchButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 15, borderRadius: 11, backgroundColor: C.navy },
  searchButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  suggestions: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  suggestionLabel: { paddingHorizontal: 14, paddingVertical: 9, color: C.mutedLight, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestionInfo: { flex: 1 },
  suggestionCode: { color: C.navy, fontSize: 13, fontWeight: '800' },
  suggestionMeta: { color: C.muted, fontSize: 11, marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  errorBox: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  errorText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  successCard: { alignItems: 'center', gap: 10, padding: 28, borderRadius: 16, borderWidth: 1, borderColor: '#86EFAC', backgroundColor: '#DCFCE7' },
  successTitle: { color: '#166534', fontSize: 20, fontWeight: '800' },
  successText: { color: '#166534', fontSize: 13, textAlign: 'center' },
  nextButton: { marginTop: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, backgroundColor: '#16A34A' },
  nextButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  detailStack: { gap: 14 },
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1 },
  statusEyebrow: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  statusTitle: { fontSize: 16, fontWeight: '800', marginTop: 3 },
  statusNote: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800' },
  card: { overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  cardHeader: { padding: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: C.border },
  cardEyebrow: { color: C.mutedLight, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  orderCode: { color: C.navy, fontSize: 20, fontWeight: '800', letterSpacing: 1.5, marginTop: 3 },
  infoBody: { padding: 16, gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  infoCopy: { flex: 1 },
  infoLabel: { color: C.mutedLight, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { color: C.navy, fontSize: 13, fontWeight: '700', marginTop: 2 },
  infoDetail: { color: C.muted, fontSize: 11, marginTop: 2 },
  actionArea: { paddingHorizontal: 16, paddingBottom: 16 },
  confirmButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 11, backgroundColor: '#16A34A' },
  confirmText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  notReady: { alignItems: 'center', paddingVertical: 14, borderRadius: 11, borderWidth: 1, borderColor: C.border, backgroundColor: '#F1F5F9' },
  notReadyText: { color: C.mutedLight, fontSize: 12, fontWeight: '800' },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  itemsCount: { color: C.muted, fontSize: 11, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
  itemInfo: { flex: 1 },
  itemName: { color: C.navy, fontSize: 12, fontWeight: '700' },
  itemQty: { color: C.muted, fontSize: 11, marginTop: 2 },
  itemPrice: { color: C.navy, fontSize: 12, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#F8FAFC' },
  totalLabel: { color: C.navy, fontSize: 13, fontWeight: '700' },
  totalValue: { color: '#16A34A', fontSize: 16, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 55, paddingHorizontal: 20 },
  emptyIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#F1F5F9', marginBottom: 14 },
  emptyTitle: { color: C.navy, fontSize: 15, fontWeight: '800' },
  emptyText: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 5 },
})

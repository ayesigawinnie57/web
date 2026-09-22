import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { ArrowRight, Package, ShieldCheck, ShoppingBag, Users, Zap } from 'lucide-react-native'
import { C } from '../theme'
import { productsApi, flashSalesApi, type ApiProduct, type FlashSaleItem } from '../lib/products'
import api from '../lib/api'
import { useAuth } from '../lib/AuthContext'

type AdminOrder = { code: string; status: string; total: string | number; user_name: string }
type AdminPayment = { amount: string | number; status: string }
type InventorySummary = { total: number; in_stock: number; low_stock: number; out_of_stock: number }
type AccountingDashboard = { total_revenue: number; total_expenses: number; net_profit: number; today_revenue: number; today_orders: number }
type TraderApplication = { status: string }

const money = (value: number | string) => `UGX ${Number(value || 0).toLocaleString()}`
const shortMoney = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(0)}K` : String(value)

function SummaryCard({ title, route, children }: { title: string; route: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <TouchableOpacity style={styles.summaryCard} onPress={() => router.push(route as any)} activeOpacity={0.8}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <ArrowRight size={15} color={C.mutedLight} />
      </View>
      <View style={styles.summaryBody}>{children}</View>
    </TouchableOpacity>
  )
}

function Metric({ label, value, color = C.navy }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={2}>{value}</Text>
    </View>
  )
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [flashSales, setFlashSales] = useState<FlashSaleItem[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [inventory, setInventory] = useState<InventorySummary | null>(null)
  const [accounting, setAccounting] = useState<AccountingDashboard | null>(null)
  const [traders, setTraders] = useState<TraderApplication[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    let active = true
    setLoading(true)
    const list = <T,>(promise: Promise<{ data: T }>, fallback: T) => promise.then(response => response.data).catch(() => fallback)
    Promise.all([
      productsApi.listAll(),
      list(flashSalesApi.list(), [] as FlashSaleItem[]),
      list(api.get<any>('/api/orders/admin/'), []),
      list(api.get<any>('/api/auth/admin/users/'), []),
      list(api.get<any>('/api/orders/admin/payments/'), []),
      list(api.get<InventorySummary>('/api/inventory/summary/'), null),
      list(api.get<AccountingDashboard>('/api/accounting/dashboard/'), null),
      list(api.get<any>('/api/traders/admin/'), []),
    ]).then(([productData, flashData, orderData, userData, paymentData, inventoryData, accountingData, traderData]) => {
      if (!active) return
      const unwrap = (value: any) => Array.isArray(value) ? value : value?.results ?? []
      setProducts(productData)
      setFlashSales(unwrap(flashData))
      setOrders(unwrap(orderData))
      setUsers(unwrap(userData))
      setPayments(unwrap(paymentData))
      setInventory(inventoryData)
      setAccounting(accountingData)
      setTraders(unwrap(traderData))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, []))

  const activeProducts = products.filter(product => product.stock > 0).length
  const activeFlashSales = flashSales.filter(sale => sale.is_active && !sale.is_expired).length
  const pendingOrders = orders.filter(order => order.status === 'pending').length
  const processingOrders = orders.filter(order => order.status === 'processing').length
  const shippedOrders = orders.filter(order => order.status === 'shipped').length
  const completedPayments = payments.filter(payment => payment.status === 'completed')
  const totalRevenue = completedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const pendingPayments = payments.filter(payment => payment.status === 'pending').length
  const pendingTraders = traders.filter(trader => trader.status === 'pending').length
  const approvedTraders = traders.filter(trader => trader.status === 'approved').length
  const latestOrder = orders[0]
  const netProfit = accounting?.net_profit ?? 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 88 }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.welcome, { paddingTop: insets.top + 20 }]}>
        <View style={styles.welcomeIcon}><ShieldCheck size={22} color="#F97316" /></View>
        <View><Text style={styles.welcomeName}>{user?.name ?? 'Admin'}</Text><Text style={styles.welcomeSub}>Admin Panel · Full control</Text></View>
      </View>

      {loading ? <ActivityIndicator color="#F97316" size="large" style={styles.loader} /> : (
        <>
          <SectionLabel label="Today" />
          <View style={styles.todayGrid}>
            <View style={styles.statCard}><Text style={styles.statValue}>{money(accounting?.today_revenue ?? 0)}</Text><Text style={styles.statLabel}>Today's Revenue</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{accounting?.today_orders ?? 0}</Text><Text style={styles.statLabel}>Today's Orders</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{activeProducts}</Text><Text style={styles.statLabel}>Active Products</Text></View>
          </View>

          <View style={styles.profitCard}>
            <Text style={styles.profitLabel}>Profit &amp; Loss</Text>
            <View style={styles.profitGrid}>
              <Metric label="Revenue" value={money(accounting?.total_revenue ?? 0)} color="#22C55E" />
              <Metric label="Expenses" value={money(accounting?.total_expenses ?? 0)} color="#ef4444" />
              <Metric label="Net Profit" value={money(netProfit)} color={netProfit >= 0 ? '#22C55E' : '#ef4444'} />
            </View>
          </View>

          <SectionLabel label="Overview" />
          <View style={styles.summaryGrid}>
            <SummaryCard title="Orders" route="/admin/orders">
              <View style={styles.metricRow}><Metric label="Pending" value={String(pendingOrders)} color={pendingOrders ? '#F97316' : C.navy} /><Metric label="Processing" value={String(processingOrders)} color="#6366F1" /><Metric label="Shipped" value={String(shippedOrders)} color="#22C55E" /></View>
              {latestOrder ? <View style={styles.latest}><Text style={styles.latestLabel}>Latest Order</Text><Text style={styles.latestText}>#{latestOrder.code} · {latestOrder.user_name}</Text><Text style={styles.latestAmount}>{money(latestOrder.total)}</Text></View> : <Text style={styles.muted}>No orders yet.</Text>}
            </SummaryCard>

            <SummaryCard title="Pickup Desk" route="/admin/pickup">
              <View style={styles.metricRow}><Metric label="Shipped" value={String(shippedOrders)} color="#6366F1" /><Metric label="Ready" value={String(orders.filter(order => order.status === 'ready_for_pickup').length)} color="#16A34A" /></View>
              <Text style={styles.muted}>Find an order and confirm customer pickup.</Text>
            </SummaryCard>

            <SummaryCard title="Accounting" route="/admin/accounting">
              <View style={styles.metricRow}><Metric label="Revenue" value={`UGX ${shortMoney(accounting?.total_revenue ?? 0)}`} color="#22C55E" /><Metric label="Expenses" value={`UGX ${shortMoney(accounting?.total_expenses ?? 0)}`} color="#ef4444" /><Metric label="Net" value={`UGX ${shortMoney(Math.abs(netProfit))}`} color={netProfit >= 0 ? '#10b981' : '#ef4444'} /></View>
              <Text style={[styles.statusText, { color: netProfit >= 0 ? '#10b981' : '#ef4444', backgroundColor: netProfit >= 0 ? '#F0FDF4' : '#FEF2F2' }]}>{netProfit >= 0 ? 'Profitable' : 'Running at a loss'}</Text>
            </SummaryCard>

            <SummaryCard title="Inventory" route="/admin/inventory">
              <View style={styles.metricRow}><Metric label="Total Items" value={String(inventory?.total ?? 0)} /><Metric label="In Stock" value={String(inventory?.in_stock ?? 0)} color="#22C55E" /></View>
              <Text style={styles.muted}>{inventory?.out_of_stock ?? 0} out of stock · {inventory?.low_stock ?? 0} low stock</Text>
            </SummaryCard>

            <SummaryCard title="Products" route="/admin/products">
              <View style={styles.metricRow}><Metric label="Total" value={String(products.length)} /><Metric label="Active" value={String(activeProducts)} color="#22C55E" /></View>
              <Text style={styles.muted}>{products.length - activeProducts} out of stock / inactive</Text>
            </SummaryCard>

            <SummaryCard title="Payments" route="/admin/payments">
              <View style={styles.metricRow}><Metric label="Total Revenue" value={`UGX ${shortMoney(totalRevenue)}`} color="#22C55E" /><Metric label="Transactions" value={String(completedPayments.length)} /></View>
              {pendingPayments > 0 && <Text style={[styles.statusText, styles.warning]}>{pendingPayments} pending</Text>}
            </SummaryCard>

            <SummaryCard title="Users" route="/admin/users">
              <View style={styles.metricRow}><Metric label="Registered" value={String(users.length)} /><Metric label="Staff" value={String(users.filter(userItem => userItem.is_staff).length)} color="#F97316" /></View>
              <Text style={styles.muted}>{users.length} total registered users</Text>
            </SummaryCard>

            <SummaryCard title="Traders" route="/admin/traders">
              <View style={styles.metricRow}><Metric label="Approved" value={String(approvedTraders)} color="#22C55E" /><Metric label="Pending" value={String(pendingTraders)} color={pendingTraders ? '#F97316' : C.navy} /></View>
              {pendingTraders > 0 && <Text style={[styles.statusText, styles.warning]}>{pendingTraders} awaiting review</Text>}
            </SummaryCard>

            <SummaryCard title="Flash Sales" route="/admin/flashsales">
              <View style={styles.metricRow}><Metric label="Active" value={String(activeFlashSales)} color="#F97316" /><Metric label="Total" value={String(flashSales.length)} /></View>
              <Text style={styles.muted}>{flashSales.filter(sale => sale.is_expired).length} expired sales</Text>
            </SummaryCard>

            <SummaryCard title="Categories" route="/admin/categories"><Text style={styles.muted}>Organise products into categories for easier browsing.</Text></SummaryCard>
            <SummaryCard title="Data Management" route="/admin/data"><Text style={styles.muted}>Export and import products, orders, and user data.</Text></SummaryCard>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 30 },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 24, backgroundColor: C.navy },
  welcomeIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#102B42', alignItems: 'center', justifyContent: 'center' },
  welcomeName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  welcomeSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },
  loader: { marginTop: 48 },
  sectionLabel: { color: C.mutedLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginHorizontal: 20, marginTop: 24, marginBottom: 10, textTransform: 'uppercase' },
  todayGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  statCard: { flex: 1, minHeight: 76, justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10 },
  statValue: { color: C.navy, fontSize: 14, fontWeight: '800' },
  statLabel: { color: C.muted, fontSize: 10, fontWeight: '600', marginTop: 4 },
  profitCard: { backgroundColor: C.navy, borderRadius: 12, marginHorizontal: 16, marginTop: 20, padding: 18 },
  profitLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 16 },
  profitGrid: { flexDirection: 'row', gap: 12 },
  metricRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  metric: { flex: 1, minWidth: 0 },
  metricLabel: { color: C.mutedLight, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '800', marginTop: 3 },
  summaryGrid: { paddingHorizontal: 16, gap: 10 },
  summaryCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  summaryTitle: { color: C.navy, fontSize: 13, fontWeight: '800' },
  summaryBody: { padding: 16 },
  latest: { backgroundColor: C.bg, borderRadius: 8, padding: 10 },
  latestLabel: { color: C.mutedLight, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  latestText: { color: C.navy, fontSize: 12, fontWeight: '700', marginTop: 3 },
  latestAmount: { color: '#22C55E', fontSize: 11, fontWeight: '700', marginTop: 2 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 17 },
  statusText: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '800' },
  warning: { color: '#C2410C', backgroundColor: '#FFF7ED' },
})

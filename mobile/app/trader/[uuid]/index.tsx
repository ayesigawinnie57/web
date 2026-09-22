import { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowRight, Store } from 'lucide-react-native'
import api from '../../lib/api'
import { C } from '../../theme'

type Dashboard = { total_revenue: number; total_expenses: number; net_profit: number; today_revenue: number; today_orders: number; active_products: number; total_products: number }
type Profile = { business_name: string; location: string; business_type: string }
type Sale = { total: string | number; created_at: string }
type Expense = { amount: string | number }
type Inventory = { quantity: number; cost_price: string | number }
type Order = { status: string }

type SummaryProps = { title: string; route: string; children: React.ReactNode }
function SummaryCard({ title, route, children }: SummaryProps) {
  const router = useRouter()
  return <TouchableOpacity style={styles.card} onPress={() => router.push(route as any)} activeOpacity={0.8}><View style={styles.cardHeader}><Text style={styles.cardTitle}>{title}</Text><ArrowRight size={15} color={C.mutedLight} /></View><View style={styles.cardBody}>{children}</View></TouchableOpacity>
}
function Metric({ label, value, color = C.navy }: { label: string; value: string; color?: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, { color }]} numberOfLines={2}>{value}</Text></View>
}
const money = (value: number | string) => `UGX ${Number(value || 0).toLocaleString()}`
const shortMoney = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(0)}K` : String(value)

export default function TraderDashboard() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => {
    if (!uuid) return
    setLoading(true)
    const get = <T,>(path: string, fallback: T) => api.get<T>(path).then(response => response.data).catch(() => fallback)
    Promise.all([
      get<Dashboard>(`/api/traders/${uuid}/dashboard/`, { total_revenue: 0, total_expenses: 0, net_profit: 0, today_revenue: 0, today_orders: 0, active_products: 0, total_products: 0 }),
      get<Profile>(`/api/traders/${uuid}/profile/`, { business_name: 'Trader Portal', location: '', business_type: '' }),
      get<Sale[]>(`/api/traders/${uuid}/sales/`, []),
      get<Expense[]>(`/api/traders/${uuid}/expenses/`, []),
      get<Inventory[]>(`/api/traders/${uuid}/inventory/`, []),
      get<Order[]>(`/api/traders/${uuid}/orders/`, []),
    ]).then(([data, traderProfile, traderSales, traderExpenses, traderInventory, traderOrders]) => {
      setDashboard(data); setProfile(traderProfile); setSales(traderSales); setExpenses(traderExpenses); setInventory(traderInventory); setOrders(traderOrders)
    }).finally(() => setLoading(false))
  }, [uuid]))

  const outOfStock = inventory.filter(item => item.quantity === 0).length
  const lowStock = inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length
  const inventoryValue = inventory.reduce((sum, item) => sum + Number(item.cost_price || 0) * item.quantity, 0)
  const pendingOrders = orders.filter(order => order.status === 'pending').length
  const preparingOrders = orders.filter(order => order.status === 'preparing').length
  const readyOrders = orders.filter(order => order.status === 'ready').length
  const latestSale = sales[0]

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.pageHeader}><View style={styles.headerIcon}><Store size={22} color={C.green} /></View><View style={styles.headerCopy}><Text style={styles.businessName}>{profile?.business_name ?? 'Trader Portal'}</Text><Text style={styles.businessMeta}>{profile?.location ?? ''}{profile?.business_type ? ` · ${profile.business_type.replace('_', ' ')}` : ''}</Text></View></View>
    {loading ? <ActivityIndicator color={C.green} size="large" style={styles.loader} /> : <>
      <Text style={styles.sectionLabel}>Today</Text>
      <View style={styles.statsGrid}><View style={styles.stat}><Text style={styles.statValue}>{money(dashboard?.today_revenue ?? 0)}</Text><Text style={styles.statLabel}>Today's Revenue</Text></View><View style={styles.stat}><Text style={styles.statValue}>{dashboard?.today_orders ?? 0}</Text><Text style={styles.statLabel}>Today's Sales</Text></View><View style={styles.stat}><Text style={styles.statValue}>{dashboard?.active_products ?? 0}</Text><Text style={styles.statLabel}>Active Products</Text></View></View>
      <View style={styles.profit}><Text style={styles.profitLabel}>Profit &amp; Loss</Text><View style={styles.metricRow}><Metric label="Revenue" value={money(dashboard?.total_revenue ?? 0)} color="#22C55E" /><Metric label="Expenses" value={money(dashboard?.total_expenses ?? 0)} color="#ef4444" /><Metric label="Net Profit" value={money(dashboard?.net_profit ?? 0)} color={(dashboard?.net_profit ?? 0) >= 0 ? '#22C55E' : '#ef4444'} /></View></View>
      <Text style={styles.sectionLabel}>Overview</Text>
      <View style={styles.cards}>
        <SummaryCard title="Sales" route={`/trader/${uuid}/sales`}><View style={styles.metricRow}><Metric label="Revenue" value={`UGX ${shortMoney(sales.reduce((sum, sale) => sum + Number(sale.total), 0))}`} color="#22C55E" /><Metric label="Total Sales" value={String(sales.length)} /></View>{latestSale && <Text style={styles.muted}>Latest: {latestSale.created_at ? new Date(latestSale.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : 'Recent'}</Text>}</SummaryCard>
        <SummaryCard title="Orders" route={`/trader/${uuid}/orders`}><View style={styles.metricRow}><Metric label="Pending" value={String(pendingOrders)} color={pendingOrders ? '#F97316' : C.navy} /><Metric label="Preparing" value={String(preparingOrders)} color="#6366F1" /><Metric label="Ready" value={String(readyOrders)} color="#22C55E" /></View><Text style={styles.muted}>Orders containing your products</Text></SummaryCard>
        <SummaryCard title="Products" route={`/trader/${uuid}/products`}><View style={styles.metricRow}><Metric label="Total" value={String(dashboard?.total_products ?? 0)} /><Metric label="Active" value={String(dashboard?.active_products ?? 0)} color="#22C55E" /></View><Text style={styles.muted}>{(dashboard?.total_products ?? 0) - (dashboard?.active_products ?? 0)} inactive products</Text></SummaryCard>
        <SummaryCard title="Inventory" route={`/trader/${uuid}/inventory`}><View style={styles.metricRow}><Metric label="Items" value={String(inventory.length)} /><Metric label="Value" value={`UGX ${shortMoney(inventoryValue)}`} color="#6366F1" /></View><Text style={styles.muted}>{outOfStock} out of stock · {lowStock} low stock</Text></SummaryCard>
        <SummaryCard title="Accounting" route={`/trader/${uuid}/accounting`}><View style={styles.metricRow}><Metric label="Revenue" value={`UGX ${shortMoney(dashboard?.total_revenue ?? 0)}`} color="#22C55E" /><Metric label="Expenses" value={`UGX ${shortMoney(dashboard?.total_expenses ?? 0)}`} color="#ef4444" /></View><Text style={styles.muted}>Net {money(dashboard?.net_profit ?? 0)}</Text></SummaryCard>
      </View>
    </>}
  </ScrollView>
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 96 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  businessName: { color: C.navy, fontSize: 20, fontWeight: '800' },
  businessMeta: { color: C.muted, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  loader: { marginTop: 48 },
  sectionLabel: { color: C.mutedLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 12, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  stat: { flex: 1, minHeight: 76, justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10 },
  statValue: { color: C.navy, fontSize: 14, fontWeight: '800' },
  statLabel: { color: C.muted, fontSize: 10, fontWeight: '600', marginTop: 4 },
  profit: { backgroundColor: C.navy, borderRadius: 12, padding: 18, marginBottom: 8 },
  profitLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 16 },
  metricRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metric: { flex: 1, minWidth: 0 },
  metricLabel: { color: C.mutedLight, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { fontSize: 14, fontWeight: '800', marginTop: 3 },
  cards: { gap: 10 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  cardTitle: { color: C.navy, fontSize: 13, fontWeight: '800' },
  cardBody: { padding: 16 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 17 },
})

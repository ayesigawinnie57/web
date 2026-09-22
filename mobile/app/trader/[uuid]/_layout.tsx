import { Tabs, usePathname, useRouter } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LayoutDashboard, Package, ShoppingBag, TrendingUp, DollarSign, Menu, X, Zap, Boxes, Settings, ArrowLeftRight } from 'lucide-react-native'
import { useState } from 'react'
import { C, LOGO } from '../../theme'
import { Image } from 'react-native'
import { useAuth } from '../../lib/AuthContext'
import SwitchTransition from '../../components/SwitchTransition'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, segment: '' },
  { label: 'Products', icon: Package, segment: 'products' },
  { label: 'Orders', icon: ShoppingBag, segment: 'orders' },
  { label: 'Sales', icon: TrendingUp, segment: 'sales' },
  { label: 'Accounting', icon: DollarSign, segment: 'accounting' },
]

const EXTRA = [
  { label: 'Flash Sales', icon: Zap, segment: 'flashsales' },
  { label: 'Inventory', icon: Boxes, segment: 'inventory' },
  { label: 'Settings', icon: Settings, segment: 'account' },
]

export default function TraderLayout() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [switchToStore, setSwitchToStore] = useState(false)
  const { user } = useAuth()
  const uuid = pathname.split('/')[2]
  const href = (segment: string) => `/trader/${uuid}${segment ? `/${segment}` : ''}`
  const isActive = (segment: string) => pathname === href(segment) || (segment && pathname.startsWith(`${href(segment)}/`))

  const go = (segment: string) => { setDrawerOpen(false); router.push(href(segment) as any) }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Image source={{ uri: LOGO }} style={styles.logo} resizeMode="contain" />
        <View style={styles.portalLabel}><Text style={styles.portalDot}>●</Text><Text style={styles.portalText}>TRADER PORTAL</Text></View>
        <TouchableOpacity style={styles.menuButton} onPress={() => setDrawerOpen(true)} accessibilityLabel="Open trader menu">
          <Menu size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="products" />
        <Tabs.Screen name="orders" />
        <Tabs.Screen name="sales" />
        <Tabs.Screen name="accounting" />
        <Tabs.Screen name="flashsales" />
        <Tabs.Screen name="inventory" />
        <Tabs.Screen name="account" />
      </Tabs>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {NAV.map(({ label, icon: Icon, segment }) => {
          const active = isActive(segment)
          return <TouchableOpacity key={label} style={[styles.bottomItem, active && styles.bottomItemActive]} onPress={() => go(segment)}><Icon size={active ? 21 : 18} color={active ? C.green : C.muted} /><Text style={[styles.bottomLabel, { color: active ? C.green : C.muted }, active && styles.bottomLabelActive]}>{label}</Text></TouchableOpacity>
        })}
      </View>

      {drawerOpen && (
        <View style={styles.modal}>
          <TouchableOpacity style={styles.backdrop} onPress={() => setDrawerOpen(false)} />
          <View style={[styles.drawer, { paddingTop: insets.top }]}>
            <View style={styles.drawerHeader}><Text style={styles.drawerTitle}>Trader Portal</Text><TouchableOpacity onPress={() => setDrawerOpen(false)}><X size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity></View>
            <View style={styles.drawerNav}>
              {NAV.map(({ label, icon: Icon, segment }) => <TouchableOpacity key={label} style={[styles.drawerLink, isActive(segment) && styles.drawerLinkActive]} onPress={() => go(segment)}><Icon size={16} color={isActive(segment) ? '#fff' : 'rgba(255,255,255,0.6)'} /><Text style={[styles.drawerText, isActive(segment) && styles.drawerTextActive]}>{label}</Text></TouchableOpacity>)}
              <View style={styles.divider} />
              {EXTRA.map(({ label, icon: Icon, segment }) => <TouchableOpacity key={label} style={[styles.drawerLink, isActive(segment) && styles.drawerLinkActive]} onPress={() => go(segment)}><Icon size={16} color={isActive(segment) ? '#fff' : 'rgba(255,255,255,0.6)'} /><Text style={[styles.drawerText, isActive(segment) && styles.drawerTextActive]}>{label}</Text></TouchableOpacity>)}
            </View>
            <View style={styles.drawerFooter}>
              <TouchableOpacity style={styles.footerAction} onPress={() => { setDrawerOpen(false); setSwitchToStore(true) }}><ArrowLeftRight size={14} color={C.green} /><Text style={styles.storeText}>Back to Store</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {switchToStore && <SwitchTransition from="trader" to="store" userName={user?.name ?? 'User'} accountName="Trader Portal" onDone={() => { setSwitchToStore(false); router.replace('/' as any) }} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { height: 70, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, backgroundColor: C.navy, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  logo: { width: 100, height: 32 },
  portalLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  portalDot: { color: C.green, fontSize: 11 },
  portalText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  menuButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 72, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, elevation: 10 },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 56 },
  bottomItemActive: { minHeight: 68, borderTopWidth: 3, borderTopColor: C.green, backgroundColor: '#F0FDF4' },
  bottomLabel: { fontSize: 9, fontWeight: '600' },
  bottomLabelActive: { fontWeight: '800', fontSize: 10 },
  modal: { ...StyleSheet.absoluteFillObject, zIndex: 100, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: { marginLeft: 'auto', width: 280, height: '100%', backgroundColor: C.navy, elevation: 16 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  drawerTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  drawerNav: { flex: 1, paddingVertical: 8 },
  drawerLink: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 13 },
  drawerLinkActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  drawerText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  drawerTextActive: { color: '#fff' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, marginVertical: 8 },
  drawerFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', padding: 16 },
  footerAction: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  storeText: { color: C.green, fontSize: 13, fontWeight: '600' },
})

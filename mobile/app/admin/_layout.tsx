import { Tabs, usePathname, useRouter } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LayoutDashboard, Package, Grid2X2, ShoppingBag, Zap, Users, CreditCard, Bell, Settings } from 'lucide-react-native'
import { C } from '../theme'

function AdminTabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const tabs = [
    { label: 'Home', icon: LayoutDashboard, route: '/admin' },
    { label: 'Orders', icon: ShoppingBag, route: '/admin/orders' },
    { label: 'Notifications', icon: Bell, route: '/admin/notifications' },
    { label: 'Settings', icon: Settings, route: '/admin/settings' },
  ]
  const renderTab = ({ label, icon: Icon, route }: (typeof tabs)[number]) => {
    const active = pathname === route || (route !== '/admin' && pathname.startsWith(`${route}/`))
    const color = active ? '#F97316' : C.muted
    return (
      <TouchableOpacity
        key={label}
        style={styles.tabItem}
        onPress={() => router.push(route as any)}
        accessibilityLabel={label}
      >
        <Icon size={20} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map(renderTab)}
    </View>
  )
}

export default function AdminLayout() {
  return (
    <Tabs
      tabBar={() => <AdminTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="products/index"
        options={{ title: 'Products', tabBarIcon: ({ color }) => <Package size={20} color={color} /> }}
      />
      <Tabs.Screen name="inventory/index" options={{ href: null }} />
      <Tabs.Screen name="accounting/index" options={{ href: null }} />
      <Tabs.Screen name="data/index" options={{ href: null }} />
      <Tabs.Screen name="pickup" options={{ href: null }} />
      <Tabs.Screen
        name="flashsales/index"
        options={{ title: 'Flash Sales', tabBarIcon: ({ color }) => <Zap size={20} color={color} fill={color} /> }}
      />
      <Tabs.Screen
        name="categories/index"
        options={{ title: 'Categories', tabBarIcon: ({ color }) => <Grid2X2 size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{ title: 'Orders', tabBarIcon: ({ color }) => <ShoppingBag size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="users/index"
        options={{ title: 'Users', tabBarIcon: ({ color }) => <Users size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="payments/index"
        options={{ title: 'Payments', tabBarIcon: ({ color }) => <CreditCard size={20} color={color} /> }}
      />
      <Tabs.Screen name="traders/index" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="products/add" options={{ href: null }} />
      <Tabs.Screen name="products/[id]" options={{ href: null }} />
      <Tabs.Screen name="categories/add" options={{ href: null }} />
      <Tabs.Screen name="categories/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="flashsales/add" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, elevation: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 56 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
})

import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { ArrowLeft, Bell, Grid2X2, Heart, Home, LockKeyhole, ShoppingBag, ShoppingCart, Store, UserRound } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from './theme'

export default function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/' as any)} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={C.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.row} onPress={() => router.replace('/' as any)}>
          <Home size={20} color={C.navy} />
          <Text style={styles.rowText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/shop' as any)}>
          <ShoppingBag size={20} color={C.navy} />
          <Text style={styles.rowText}>Shop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/category' as any)}>
          <Grid2X2 size={20} color={C.navy} />
          <Text style={styles.rowText}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/cart' as any)}>
          <ShoppingCart size={20} color={C.navy} />
          <Text style={styles.rowText}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/account' as any)}>
          <UserRound size={20} color={C.navy} />
          <Text style={styles.rowText}>My Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/notifications' as any)}>
          <Bell size={20} color={C.navy} />
          <Text style={styles.rowText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/orders' as any)}>
          <ShoppingBag size={20} color={C.navy} />
          <Text style={styles.rowText}>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/wishlist' as any)}>
          <Heart size={20} color="#ef4444" />
          <Text style={styles.rowText}>Wishlist</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/privacy' as any)}>
          <LockKeyhole size={20} color={C.navy} />
          <Text style={styles.rowText}>Privacy and security</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => router.push('/become-a-trader' as any)}>
          <Store size={20} color="#22C55E" />
          <Text style={styles.rowText}>Sell with Majo Gadgets</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.navy, fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 22 },
  list: { padding: 16, paddingBottom: 100, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 18, borderWidth: 1, borderColor: C.border },
  rowText: { color: C.navy, fontSize: 15, fontWeight: '600' },
})
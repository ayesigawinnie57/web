import { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Image, Modal, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, Search, UserRound, ShoppingCart, Heart, Home, Grid2X2, Bell, Menu, Users, Package, ShoppingBag, LayoutDashboard } from 'lucide-react-native'
import { C, LOGO } from '../theme'
import { tokenStore } from '../lib/auth'
import { useAuth } from '../lib/AuthContext'
import { useWishlist } from '../lib/WishlistContext'
import { useCart } from '../lib/CartContext'
import { useNotifications } from '../lib/NotificationContext'
import { productsApi, toCardProduct, productListCache } from '../lib/products'
import type { Product } from '../components/ProductCard'

export default function Navbar({ onRequestOpenAccount }: { onRequestOpenAccount?: (fn: () => void) => void }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const { user, logout } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [catResults, setCatResults] = useState<import('../lib/products').ApiCategory[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { items: wishlistItems } = useWishlist()
  const { totalItems: cartCount } = useCart()
  const { unreadCount } = useNotifications()
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)

  useEffect(() => {
    onRequestOpenAccount?.(() => setAccountOpen(true))
  }, [onRequestOpenAccount])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([]); setCatResults([])
      if (query === '') setSearchOpen(false)
      return
    }
    const q = query.toLowerCase()

    // instant results from cache
    if (productListCache.products.length > 0) {
      setResults(productListCache.products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20))
      setCatResults(productListCache.categories.filter(c => c.name.toLowerCase().includes(q)).slice(0, 3))
    }

    // background refresh (debounced)
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const [prodRes, catRes] = await Promise.all([productsApi.list(), productsApi.categories()])
        const rawP = prodRes.data as any
        const allP = (Array.isArray(rawP) ? rawP : (rawP?.results ?? [])).map(toCardProduct)
        setResults(allP.filter((p: any) => p.name.toLowerCase().includes(q)).slice(0, 20))
        const rawC = catRes.data as any
        const allC: import('../lib/products').ApiCategory[] = Array.isArray(rawC) ? rawC : (rawC?.results ?? [])
        setCatResults(allC.filter(c => c.name.toLowerCase().includes(q)).slice(0, 3))
      } catch { }
      finally { setSearching(false) }
    }, 400)
  }, [query])

  const initials = user?.name ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'UN'

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout()
          setAccountOpen(false)
        },
      },
    ])
  }

  const confirmDeleteAccount = () => {
    Alert.alert('Delete Account', 'This action cannot be undone. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: async () => {
          await logout()
          setAccountOpen(false)
        },
      },
    ])
  }

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={() => router.push('/')}>
          <Image source={{ uri: LOGO }} style={styles.logo} resizeMode="contain" />
        </TouchableOpacity>

        {/* Search — pill or active input (hidden in admin) */}
        {isAdmin ? (
          <View style={styles.adminBarTitle}>
            <Text style={styles.adminBarLabel}>Admin Panel</Text>
          </View>
        ) : searchOpen ? (
          <View style={styles.searchBoxActive}>
            <Search size={15} color={C.navy} />
            <TextInput
              style={styles.searchActiveInput}
              placeholder="Search products, categories..."
              placeholderTextColor={C.mutedLight}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoFocus
              underlineColorAndroid="transparent"
              onSubmitEditing={() => {
                if (query.trim()) {
                  router.push(`/shop?q=${query}` as any)
                  setSearchOpen(false); setQuery(''); setResults([]); setCatResults([])
                }
              }}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.searchClearBtn}>
                <X size={16} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.searchBox} onPress={() => setSearchOpen(true)} activeOpacity={0.8}>
            <Search size={15} color={C.muted} />
            <Text style={styles.searchPlaceholder}>Search products...</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          {isAdmin ? (
            <TouchableOpacity style={styles.menuBtn} onPress={() => setAdminMenuOpen(true)} accessibilityLabel="Admin menu">
              <Menu size={22} color={C.navy} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={() => router.push('/wishlist' as any)} accessibilityLabel={`Open wishlist, ${wishlistItems.length} items`}>
                <View style={styles.wishlistAction}>
                  <Heart size={21} color="#ef4444" fill={wishlistItems.length ? '#ef4444' : 'none'} />
                  {wishlistItems.length > 0 && (
                    <View style={styles.wishlistBadge}>
                      <Text style={styles.wishlistBadgeText}>{wishlistItems.length}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/cart' as any)} accessibilityLabel="Open cart">
                <View style={styles.wishlistAction}>
                  <ShoppingCart size={22} color={C.navy} />
                  {cartCount > 0 && (
                    <View style={styles.wishlistBadge}>
                      <Text style={styles.wishlistBadgeText}>{cartCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search dropdown — below header */}
      {searchOpen && (
        <>
          <View style={styles.searchSheet}>
            {searching ? (
              <View style={styles.searchingRow}>
                <ActivityIndicator size="small" color={C.green} />
                <Text style={styles.searchingText}>Searching…</Text>
              </View>
            ) : (catResults.length > 0 || results.length > 0) ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {catResults.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Grid2X2 size={12} color={C.muted} />
                      <Text style={styles.sectionLabel}>CATEGORIES</Text>
                    </View>
                    {catResults.map((cat, i) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catRow, i < catResults.length - 1 && styles.rowDivider]}
                        onPress={() => { router.push(`/shop?category=${cat.slug}` as any); setSearchOpen(false); setQuery(''); setResults([]); setCatResults([]) }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.catIconWrap}>
                          {cat.image
                            ? <Image source={{ uri: cat.image }} style={styles.catIcon} resizeMode="cover" />
                            : <Grid2X2 size={18} color={C.navy} />}
                        </View>
                        <Text style={styles.catName}>{cat.name}</Text>
                        <Text style={styles.rowArrow}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {results.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Search size={12} color={C.muted} />
                      <Text style={styles.sectionLabel}>PRODUCTS</Text>
                    </View>
                    {results.map((product, i) => (
                      <TouchableOpacity
                        key={product.id}
                        style={[styles.productRow, i < results.length - 1 && styles.rowDivider]}
                        onPress={() => { router.push(`/shop/${product.slug ?? product.id}` as any); setSearchOpen(false); setResults([]); setCatResults([]); setQuery('') }}
                        activeOpacity={0.7}
                      >
                        {product.image
                          ? <Image source={{ uri: product.image }} style={styles.productThumb} resizeMode="cover" />
                          : <View style={styles.productThumbEmpty}><Search size={14} color={C.mutedLight} /></View>
                        }
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                          <Text style={styles.productSub} numberOfLines={1}>
                            {product.categoryName || product.category}
                            {product.rating > 0 ? `  ·  ⭐ ${product.rating.toFixed(1)}` : ''}
                          </Text>
                        </View>
                        <Text style={styles.productPrice}>UGX {product.price.toLocaleString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

              </ScrollView>
            ) : query.trim().length > 0 ? (
              <View style={styles.emptyRow}>
                <Search size={28} color={C.border} />
                <Text style={styles.emptyText}>No results for "{query}"</Text>
              </View>
            ) : null}
          </View>
        </>
      )}

      {/* Admin side menu */}
      <Modal visible={adminMenuOpen} transparent animationType="fade" onRequestClose={() => setAdminMenuOpen(false)}>
        <View style={styles.accountModal}>
          <Pressable style={styles.accountBackdrop} onPress={() => setAdminMenuOpen(false)} />
          <View style={[styles.accountDrawer, { paddingTop: insets.top + 18 }]}>
            <View style={styles.accountHeader}>
              <Text style={styles.accountTitle}>Admin</Text>
              <TouchableOpacity onPress={() => setAdminMenuOpen(false)}>
                <X size={22} color={C.navy} />
              </TouchableOpacity>
            </View>

            <View style={styles.accountLinks}>
              {([
                { label: 'Dashboard', icon: LayoutDashboard, route: '/admin' },
                { label: 'Users',     icon: Users,           route: '/admin/users' },
                { label: 'Products',  icon: Package,         route: '/admin/products' },
                { label: 'Orders',    icon: ShoppingBag,     route: '/admin/orders' },
                { label: 'Wishlists', icon: Heart,           route: '/admin/wishlists' },
              ] as const).map(({ label, icon: Icon, route }) => (
                <TouchableOpacity
                  key={label}
                  style={styles.adminMenuItem}
                  onPress={() => { setAdminMenuOpen(false); router.push(route as any) }}
                >
                  <View style={styles.adminMenuIcon}>
                    <Icon size={18} color={C.green} />
                  </View>
                  <Text style={styles.accountLinkText}>{label}</Text>
                  <Text style={styles.accountLinkArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.adminExitBtn}
              onPress={() => { setAdminMenuOpen(false); router.push('/') }}
            >
              <Text style={styles.adminExitText}>← Back to Store</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={accountOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountOpen(false)}
      >
        <View style={styles.accountModal}>
          <Pressable style={styles.accountBackdrop} onPress={() => setAccountOpen(false)} />
          <View style={[styles.accountDrawer, { paddingTop: insets.top + 18 }]}>
            <View style={styles.accountHeader}>
              <Text style={styles.accountTitle}>My Account</Text>
              <TouchableOpacity onPress={() => setAccountOpen(false)} accessibilityLabel="Close My Account">
                <X size={22} color={C.navy} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileSummary}>
              <View style={styles.profileAvatar}><Text style={styles.profileInitials}>{initials}</Text></View>
              <View style={styles.profileCopy}>
                <Text style={styles.profileName} numberOfLines={2}>{user?.name ?? 'Guest'}</Text>
                <Text style={styles.profileHint} numberOfLines={2}>{user?.email ?? 'Not signed in'}</Text>
              </View>
            </View>

            <View style={styles.accountLinks}>
              <TouchableOpacity style={styles.accountLink} onPress={() => { setAccountOpen(false); router.push('/orders' as any) }}>
                <Text style={styles.accountLinkText}>My Orders</Text>
                <Text style={styles.accountLinkArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.accountLink} onPress={() => Alert.alert('Wishlist', 'Sign in to view your wishlist.')}>
                <Text style={styles.accountLinkText}>Wishlist</Text>
                <Text style={styles.accountLinkArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.accountLink} onPress={() => Alert.alert('My Location', 'Sign in to manage your location.')}>
                <Text style={styles.accountLinkText}>My Location</Text>
                <Text style={styles.accountLinkArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.accountLink} onPress={() => Alert.alert('Payment', 'Sign in to manage payment.')}>
                <Text style={styles.accountLinkText}>Payment</Text>
                <Text style={styles.accountLinkArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {user ? (
              <TouchableOpacity style={styles.accountPrimary} onPress={confirmLogout}>
                <Text style={styles.accountPrimaryText}>Logout</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.accountPrimary} onPress={() => { setAccountOpen(false); router.push('/login' as any) }}>
                  <Text style={styles.accountPrimaryText}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.accountFooter}>
              <TouchableOpacity style={styles.accountLink} onPress={confirmDeleteAccount}>
                <Text style={styles.deleteText}>Delete Account</Text>
                <Text style={styles.deleteText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export function BottomNav({ onAccountOpen }: { onAccountOpen?: () => void }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { unreadCount } = useNotifications()
  const { user } = useAuth()
  const isStaff = user?.is_staff || user?.is_superuser || false

  const items = [
    { label: 'Home',          icon: Home,     onPress: () => router.push('/') },
    { label: 'Category',      icon: Grid2X2,  onPress: () => router.push('/category' as any) },
    { label: 'Notifications', icon: Bell,       onPress: () => router.push('/notifications' as any), badge: unreadCount },
    isStaff
      ? { label: 'Admin',      icon: LayoutDashboard, onPress: () => router.push('/admin' as any) }
      : { label: 'My Account', icon: UserRound,       onPress: () => onAccountOpen?.() },
  ]

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map(({ label, icon: Icon, onPress, badge }) => (
        <TouchableOpacity key={label} style={styles.bottomNavItem} onPress={onPress} accessibilityLabel={label}>
          <View style={styles.wishlistAction}>
            <Icon size={21} color={C.navy} />
            {badge ? (
              <View style={styles.wishlistBadge}>
                <Text style={styles.wishlistBadgeText}>{badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.bottomNavLabel}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 100, overflow: 'visible' },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  logo: { width: 100, height: 36 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  menuBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  adminMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  adminMenuIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  adminExitBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  adminExitText: { fontSize: 14, fontWeight: '700', color: C.navy },
  adminBarTitle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  adminBarLabel: { fontSize: 15, fontWeight: '800', color: C.navy, letterSpacing: 0.5 },
  wishlistAction: { position: 'relative', padding: 2 },
  wishlistBadge: { position: 'absolute', top: -7, right: -8, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  wishlistBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 999, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12, height: 40, gap: 6 },
  searchPlaceholder: { flex: 1, fontSize: 14, color: C.mutedLight },
  searchInput: { flex: 1, fontSize: 14, color: C.navy, height: 40, outlineStyle: 'none' } as any,
  searchClearBtn: { padding: 6 },
  searchSubmitBtn: { width: 32, height: 32, borderRadius: 999, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },  searchBoxActive: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 999, borderWidth: 1.5, borderColor: C.navy, paddingLeft: 12, paddingRight: 10, height: 40, gap: 6 },
  searchActiveInput: { flex: 1, fontSize: 14, color: C.navy, height: 40, outlineStyle: 'none' } as any,
  searchSheet: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: C.card, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, zIndex: 100, maxHeight: 380 },
  section: { paddingBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: C.mutedLight, letterSpacing: 1 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 12, backgroundColor: C.card },
  catIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  catIcon: { width: 38, height: 38, borderRadius: 10 },
  catName: { flex: 1, fontSize: 14, fontWeight: '600', color: C.navy },
  rowArrow: { fontSize: 20, color: C.mutedLight, lineHeight: 22 },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12, backgroundColor: C.card },
  productThumb: { width: 44, height: 44, borderRadius: 8 },
  productThumbEmpty: { width: 44, height: 44, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: 13, fontWeight: '700', color: C.navy },
  productSub: { fontSize: 11, color: C.mutedLight, marginTop: 2, textTransform: 'capitalize' },
  productPrice: { fontSize: 12, fontWeight: '700', color: C.green },
  emptyRow: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontSize: 13, color: C.muted },
  searchingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 18 },
  searchingText: { fontSize: 13, color: C.muted },
  accountModal: { flex: 1, flexDirection: 'row' },
  accountBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  accountDrawer: { marginLeft: 'auto', width: '50%', height: '100%', backgroundColor: C.card, paddingHorizontal: 22, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, elevation: 12 },
  accountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: C.border },
  accountTitle: { fontSize: 24, fontWeight: '800', color: C.navy },
  profileSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: C.border },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { color: '#fff', fontSize: 17, fontWeight: '800' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: C.navy, fontSize: 14, fontWeight: '700' },
  profileHint: { color: C.muted, fontSize: 12, marginTop: 4 },
  accountPrimary: { backgroundColor: C.green, borderRadius: 10, alignItems: 'center', paddingVertical: 14, marginTop: 26 },
  accountPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  accountSecondary: { borderWidth: 1, borderColor: C.border, borderRadius: 10, alignItems: 'center', paddingVertical: 14, marginTop: 12 },
  accountSecondaryText: { color: C.navy, fontSize: 15, fontWeight: '700' },
  accountLinks: { borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 8 },
  accountLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  accountLinkText: { color: C.navy, fontSize: 15, fontWeight: '600' },
  accountLinkArrow: { color: C.muted, fontSize: 24, lineHeight: 24 },
  accountFooter: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 26, paddingTop: 8 },
  deleteText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, zIndex: 200, elevation: 10 },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 80 },
  bottomNavLabel: { color: C.navy, fontSize: 11, fontWeight: '600' },
})

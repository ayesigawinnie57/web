import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, Image } from 'react-native'
import { useCallback, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { ShoppingBag } from 'lucide-react-native'
import { C } from '../theme'
import { DESKTOP_BREAKPOINT } from '../lib/useIsDesktop'
import { productsApi, type ApiCategory } from '../lib/products'

export default function Categories() {
  const router = useRouter()
  const { width: W } = useWindowDimensions()
  const isDesktop = W >= DESKTOP_BREAKPOINT
  const [categories, setCategories] = useState<ApiCategory[]>([])

  useFocusEffect(useCallback(() => {
    productsApi.categories().then(({ data }) => {
      const raw = Array.isArray(data) ? data : (data as any).results ?? []
      setCategories(raw)
    }).catch(() => undefined)
  }, []))

  const cards = categories.map((cat) => (
    <TouchableOpacity
      key={cat.slug}
      style={[styles.card, isDesktop && styles.cardDesktop]}
      onPress={() => router.push(`/shop?category=${cat.slug}` as any)}
      activeOpacity={0.88}
    >
      {cat.image
        ? <Image source={{ uri: cat.image }} style={styles.image} resizeMode="cover" />
        : <View style={styles.imageFallback}><ShoppingBag size={34} color="rgba(255,255,255,0.55)" /></View>}
      <View style={styles.overlay} />
      <View style={styles.cardCopy}>
        <Text style={[styles.name, isDesktop && styles.nameDesktop]} numberOfLines={2}>{cat.name}</Text>
        <Text style={styles.shopNow}>SHOP NOW  ›</Text>
      </View>
    </TouchableOpacity>
  ))

  if (!categories.length) return null

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.heading, isDesktop && styles.headingDesktop]}>Shop by Category</Text>
            <Text style={styles.sub}>Browse our wide range of product categories</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/categories' as any)}>
            <Text style={styles.viewAll}>View All  ›</Text>
          </TouchableOpacity>
        </View>
        {isDesktop ? (
          <View style={styles.desktopGrid}>{cards}</View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {cards}
          </ScrollView>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 32 },
  containerDesktop: { paddingHorizontal: 32, paddingVertical: 40 },
  inner: {},
  innerDesktop: { maxWidth: 1200, alignSelf: 'center', width: '100%' },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: '800', color: C.navy },
  headingDesktop: { fontSize: 22 },
  sub: { fontSize: 12, color: C.muted, marginTop: 2 },
  viewAll: { fontSize: 13, fontWeight: '700', color: C.green },
  row: { flexDirection: 'row', gap: 12, paddingRight: 20 },
  desktopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { width: 132, height: 160, borderRadius: 18, overflow: 'hidden', position: 'relative', backgroundColor: C.green },
  cardDesktop: { width: 180, height: 208 },
  image: { ...StyleSheet.absoluteFill, width: undefined, height: undefined },
  imageFallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.42)' },
  cardCopy: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingBottom: 14, alignItems: 'center' },
  name: { fontSize: 13, fontWeight: '800', color: '#fff', textAlign: 'center' },
  nameDesktop: { fontSize: 15 },
  shopNow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, color: '#F97316', marginTop: 7 },
})

import { useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Easing, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Eye, Star } from 'lucide-react-native'
import { C } from '../theme'
import { DESKTOP_BREAKPOINT } from '../lib/useIsDesktop'

export type Product = {
  id: number
  slug?: string
  name: string
  price: number
  originalPrice?: number
  stock?: number
  emoji?: string
  image?: string
  rating: number
  category: string
  categoryName?: string
}

export default function ProductCard({ product, cardWidth: cardWidthProp }: { product: Product; cardWidth?: number }) {
  const router = useRouter()
  const { width: W } = useWindowDimensions()
  const isDesktop = W >= DESKTOP_BREAKPOINT
  const cols = isDesktop ? 5 : 2
  const gap = isDesktop ? 12 : 8
  const px = isDesktop ? 32 : 24
  const CARD_WIDTH = cardWidthProp ?? (W - px - gap * (cols - 1)) / cols
  const imageScale = useRef(new Animated.Value(1)).current
  const imageOverlay = useRef(new Animated.Value(0)).current

  const animateImage = (scale: number, overlayOpacity: number) => {
    Animated.parallel([
      Animated.timing(imageScale, {
        toValue: scale,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(imageOverlay, {
        toValue: overlayOpacity,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()
  }

  const cardStyle = {
    width: CARD_WIDTH,
    backgroundColor: C.card,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  }
  const cardInnerStyle = {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden' as const,
  }
  const imageBoxStyle = {
    width: '100%' as const,
    height: CARD_WIDTH * 0.9,
    backgroundColor: C.bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={() => router.push(`/shop/${product.slug ?? product.id}` as any)}
      onPressIn={() => animateImage(1.06, 1)}
      onPressOut={() => animateImage(1, 0)}
      activeOpacity={0.85}
    >
      <View style={cardInnerStyle}>
      <Animated.View style={[imageBoxStyle, { transform: [{ scale: imageScale }] }]}>
        {product.image
          ? <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
          : <Text style={{ fontSize: CARD_WIDTH * 0.4 }}>{product.emoji}</Text>
        }
        <Animated.View style={[styles.imageOverlay, { opacity: imageOverlay }]} pointerEvents="none">
          <View style={styles.eyeCircle}>
            <Eye size={18} color={C.navy} />
          </View>
        </Animated.View>
        {product.originalPrice && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
            </Text>
          </View>
        )}
      </Animated.View>
      <View style={[styles.info, isDesktop && styles.infoDesktop]}>
        <Text style={[styles.name, isDesktop && styles.nameDesktop]} numberOfLines={1} ellipsizeMode="tail">{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, isDesktop && styles.priceDesktop]}>UGX {product.price.toLocaleString()}</Text>
          {product.originalPrice && (
            <>
              <Text style={styles.original}>UGX {product.originalPrice.toLocaleString()}</Text>
              <Text style={styles.save}>Save {Math.round((1 - product.price / product.originalPrice) * 100)}%</Text>
            </>
          )}
        </View>
        <View style={styles.ratingRow}>
          <Star size={isDesktop ? 13 : 11} color="#f59e0b" fill="#f59e0b" />
          <Text style={styles.rating}>{product.rating.toFixed(1)}</Text>
        </View>
      </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,26,43,0.28)' },
  eyeCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, left: 4, backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  info: { padding: 7, minHeight: 72 },
  infoDesktop: { padding: 10, minHeight: 84 },
  name: { fontSize: 12, fontWeight: '700', color: C.navy, marginBottom: 4, lineHeight: 16 },
  nameDesktop: { fontSize: 13, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  price: { fontSize: 12, fontWeight: '800', color: C.green },
  priceDesktop: { fontSize: 13 },
  original: { fontSize: 9, color: C.mutedLight, textDecorationLine: 'line-through' },
  save: { fontSize: 9, fontWeight: '700', color: '#ef4444' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  rating: { fontSize: 9, color: C.muted, fontWeight: '600' },
})

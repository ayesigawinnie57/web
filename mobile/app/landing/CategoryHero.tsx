import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Monitor, Shirt, ShoppingBag, Smartphone, Sparkles, Tv, WashingMachine, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { C } from '../theme'
import { DESKTOP_BREAKPOINT } from '../lib/useIsDesktop'

type Slide = {
  slug: string
  label: string
  title: string
  subtitle: string
  color: string
  image: string
  icon: typeof Smartphone
}

const slides: Slide[] = [
  { slug: 'phones-tablets', label: 'Phones & Tablets', title: 'Latest Smartphones & Tablets', subtitle: 'Stay connected with cutting-edge devices', color: '#F97316', image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152115/phone_tablets.png', icon: Smartphone },
  { slug: 'electronics', label: 'Electronics', title: 'Smart TVs & Home Electronics', subtitle: 'Upgrade your entertainment experience', color: '#1E3A8A', image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152114/eletronics.png', icon: Tv },
  { slug: 'appliances', label: 'Appliances', title: 'Home Appliances', subtitle: 'Make everyday living easier & smarter', color: '#15803D', image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152114/appl.png', icon: WashingMachine },
  { slug: 'fashion', label: 'Fashion', title: 'Trending Fashion & Style', subtitle: 'Dress to impress every single day', color: '#7C3AED', image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152177/Fashion.png', icon: Shirt },
  { slug: 'computing', label: 'Computing', title: 'Laptops & Computing', subtitle: 'Power through work and play', color: '#DC2626', image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152114/Computing.png', icon: Monitor },
  { slug: 'health-beauty', label: 'Health & Beauty', title: 'Health & Beauty Essentials', subtitle: 'Look and feel your absolute best', color: '#0369A1', image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152116/pppp.png', icon: Sparkles },
  { slug: 'baby-products', label: 'Baby Products', title: 'Baby Products', subtitle: 'Everything your little one needs', color: '#B45309', image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789152162/babies.png', icon: ShoppingBag },
]

export default function CategoryHero() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const isDesktop = width >= DESKTOP_BREAKPOINT
  const [index, setIndex] = useState(0)
  const offset = useRef(new Animated.Value(0)).current
  const slideWidth = isDesktop ? Math.min(width, 1200) - 64 : width - 24
  const height = isDesktop ? 280 : 230
  const current = slides[index]
  const next = slides[(index + 1) % slides.length]

  const advance = (target?: number) => {
    Animated.timing(offset, { toValue: -slideWidth, duration: 450, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
      setIndex(target ?? ((index + 1) % slides.length))
      offset.setValue(0)
    })
  }

  useEffect(() => {
    const timer = setInterval(() => advance(), 4000)
    return () => clearInterval(timer)
  })

  const renderSlide = (slide: Slide) => {
    const Icon = slide.icon
    return (
      <View style={[styles.slide, { width: slideWidth, height, backgroundColor: slide.color }]}>
        <View style={styles.decorTop} />
        <View style={styles.decorBottom} />
        <View style={styles.copy}>
          <View style={styles.label}><Icon size={12} color="#fff" /><Text style={styles.labelText}>{slide.label}</Text></View>
          <Text style={[styles.title, isDesktop && styles.titleDesktop]} numberOfLines={2}>{slide.title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{slide.subtitle}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push(`/shop?category=${slide.slug}` as any)}>
            <Text style={[styles.buttonText, { color: slide.color }]}>Shop {slide.label}  ›</Text>
          </TouchableOpacity>
        </View>
        <Image source={{ uri: slide.image }} style={styles.image} resizeMode="contain" />
      </View>
    )
  }

  return (
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
      <View style={[styles.viewport, { width: slideWidth, height }]}>
        <Animated.View style={[styles.track, { transform: [{ translateX: offset }] }]}>
          {renderSlide(current)}
          {renderSlide(next)}
        </Animated.View>
        <TouchableOpacity style={[styles.arrow, styles.leftArrow]} onPress={() => advance((index - 1 + slides.length) % slides.length)} accessibilityLabel="Previous category">
          <ChevronLeft size={18} color={C.navy} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.arrow, styles.rightArrow]} onPress={() => advance((index + 1) % slides.length)} accessibilityLabel="Next category">
          <ChevronRight size={18} color={C.navy} />
        </TouchableOpacity>
      </View>
      <View style={styles.dots}>{slides.map((slide, dotIndex) => <View key={slide.slug} style={[styles.dot, dotIndex === index && { width: 20, backgroundColor: slide.color }]} />)}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 16, alignItems: 'center' },
  containerDesktop: { paddingHorizontal: 32, paddingVertical: 16 },
  viewport: { overflow: 'hidden', borderRadius: 16 },
  track: { flexDirection: 'row' },
  slide: { position: 'relative', overflow: 'hidden' },
  decorTop: { position: 'absolute', top: -35, right: -25, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.12)' },
  decorBottom: { position: 'absolute', bottom: -50, right: 50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  copy: { position: 'absolute', zIndex: 2, left: 16, top: 14, bottom: 16, width: '54%', justifyContent: 'space-between' },
  label: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.24)' },
  labelText: { color: '#fff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 23, lineHeight: 28, fontWeight: '900' },
  titleDesktop: { fontSize: 36, lineHeight: 43 },
  subtitle: { color: 'rgba(255,255,255,0.86)', fontSize: 12, lineHeight: 16, maxWidth: 210 },
  button: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  buttonText: { fontSize: 10, fontWeight: '800' },
  image: { position: 'absolute', right: -8, bottom: 0, width: '55%', height: '96%' },
  arrow: { position: 'absolute', top: '45%', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.88)', alignItems: 'center', justifyContent: 'center' },
  leftArrow: { left: 8 },
  rightArrow: { right: 8 },
  dots: { flexDirection: 'row', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.border },
})

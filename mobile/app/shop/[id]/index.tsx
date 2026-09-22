import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image, Share, useWindowDimensions, FlatList } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Heart, ShoppingCart, Truck, Star, Minus, Plus, Share2, CheckCircle, ChevronRight, ChevronDown } from 'lucide-react-native'
import { products as fallbackProducts } from '../../data'
import ProductCard, { type Product } from '../../components/ProductCard'
import { productsApi, ordersApi, productCache, toCardProduct, type ApiProduct, type ProductReview, type RatingSummary } from '../../lib/products'
import { PRODUCT_SHARE_URL } from '../../lib/api'
import { useWishlist } from '../../lib/WishlistContext'
import { useCart } from '../../lib/CartContext'
import { C } from '../../theme'

const { width: STATIC_WIDTH } = Dimensions.get('window')

function plainText(value: string | undefined) {
  return (value ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

export default function ProductDetail() {
  const { width } = useWindowDimensions()
  const isDesktop = width >= 768
  const { id } = useLocalSearchParams()
  const productKey = Array.isArray(id) ? id[0] : id
  const router = useRouter()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const { addToCart } = useCart()
  const insets = useSafeAreaInsets()
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const [product, setProduct] = useState<Product | null>(() => (
    productCache.get(productKey) ?? fallbackProducts.find(p => p.id === Number(productKey)) ?? null
  ))
  const [apiProduct, setApiProduct] = useState<ApiProduct | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const galleryRef = useRef<FlatList>(null)
  const [recommended, setRecommended] = useState<Product[]>([])
  const [peopleAlsoLike, setPeopleAlsoLike] = useState<Product[]>([])
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null)
  const [reviewFilter, setReviewFilter] = useState<string>('all')

  useEffect(() => {
    const productId = Number(productKey)
    const fallback = productCache.get(productKey) ?? fallbackProducts.find(p => p.id === productId) ?? null
    setProduct(fallback)
    productsApi.get(String(productKey)).then(({ data }) => {
      const p = toCardProduct(data)
      setProduct(p)
      setApiProduct(data)
      setActiveImageIndex(0)
      // Load reviews and summary
      productsApi.getReviews(p.slug ?? String(p.id)).then(({ data: rv }) => setReviews(rv)).catch(() => {})
      productsApi.getRatingSummary(p.slug ?? String(p.id)).then(({ data: sm }) => setRatingSummary(sm)).catch(() => {})
      productsApi.listAll().then((allProducts) => {
        const all: Product[] = allProducts.map(toCardProduct)
        const others = all.filter(q => q.id !== p.id)
        const sameCategory = others.filter(q => q.category === p.category)
        const otherCategory = others.filter(q => q.category !== p.category)
        setRecommended([...sameCategory, ...otherCategory].slice(0, 6))
        setPeopleAlsoLike(otherCategory.slice(0, 6))
      }).catch(() => undefined)
    }).catch(() => undefined)
  }, [productKey])

  if (!product) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Product not found</Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/shop' as any)}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const galleryImages: string[] = [
    ...(product?.image ? [product.image] : []),
    ...(apiProduct?.images ?? []).map(i => i.url).filter((u): u is string => !!u && u !== product?.image),
  ]

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null

  const handleAddToCart = () => {
    if (product && product.stock > 0) addToCart(product, quantity)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleShare = async () => {
    const productSlug = product.slug ?? String(product.id)
    const shareUrl = `${PRODUCT_SHARE_URL}/${productSlug}/`
    const details = `Premium ${product.name.toLowerCase()} from Majo Gadgets. Rated ${product.rating}/5.`
    await Share.share({
      title: product.name,
      message: `${product.name}\nUGX ${product.price.toLocaleString()}\n${details}\n${product.image ? `Image: ${product.image}\n` : ''}${shareUrl}`,
      url: shareUrl,
    })
  }

  const wishlisted = isWishlisted(product.id)

  const filteredReviews = reviewFilter === 'all'
    ? reviews
    : reviewFilter === 'photos'
    ? reviews.filter(r => r.images.length > 0)
    : reviews.filter(r => r.overall_rating === Number(reviewFilter))

  const shortDescription = plainText(apiProduct?.short_description) || `A quality ${product.name.toLowerCase()} from Majo Gadgets, selected for reliable everyday use and great value.`
  const longDescription = plainText(apiProduct?.long_description) || shortDescription
  const deliveryFee = Number(apiProduct?.delivery_fee ?? 5000)
  const savings = product.originalPrice ? product.originalPrice - product.price : 0

  return (
    <View style={styles.container}>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop, { paddingBottom: 80 + insets.bottom }]}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => router.push('/' as any)}><Text style={styles.breadcrumbLink}>Home</Text></TouchableOpacity>
          <Text style={styles.breadcrumbDivider}>›</Text>
          <TouchableOpacity onPress={() => router.push(`/shop?category=${product.category}` as any)}><Text style={styles.breadcrumbLink}>{product.categoryName || product.category}</Text></TouchableOpacity>
          <Text style={styles.breadcrumbDivider}>›</Text>
          <Text style={styles.breadcrumbCurrent} numberOfLines={1}>{product.name}</Text>
        </View>
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>

          {/* Main image + gallery */}
          <View style={[styles.imageContainer, isDesktop && { width: '48%', height: width * 0.42 }]}>
            {/* Main image */}
            {galleryImages.length > 0
              ? <Image source={{ uri: galleryImages[activeImageIndex] }} style={styles.productImage} />
              : product.image
                ? <Image source={{ uri: product.image }} style={styles.productImage} />
                : <Text style={styles.productEmoji}>{product.emoji}</Text>
            }

            {/* Badge — top left */}
            {discount
              ? <View style={styles.badgeDiscount}><Text style={styles.badgeText}>-{discount}%</Text></View>
              : <View style={[styles.badge, styles.badgeNew]}><Text style={styles.badgeText}>NEW</Text></View>
            }

            {/* Wishlist — top right */}
            <TouchableOpacity style={styles.wishlistBtn} onPress={() => toggleWishlist(product)}>
              <Heart size={18} color="#ef4444" fill={wishlisted ? '#ef4444' : 'none'} />
            </TouchableOpacity>

            {/* Prev / Next arrows */}
            {galleryImages.length > 1 && (
              <View style={styles.arrowOverlay} pointerEvents="box-none">
                {activeImageIndex > 0
                  ? <TouchableOpacity style={styles.arrowBtn} onPress={() => setActiveImageIndex(i => i - 1)}>
                      <Text style={styles.arrowText}>‹</Text>
                    </TouchableOpacity>
                  : <View style={styles.arrowPlaceholder} />
                }
                {activeImageIndex < galleryImages.length - 1
                  ? <TouchableOpacity style={styles.arrowBtn} onPress={() => setActiveImageIndex(i => i + 1)}>
                      <Text style={styles.arrowText}>›</Text>
                    </TouchableOpacity>
                  : <View style={styles.arrowPlaceholder} />
                }
              </View>
            )}

            {/* Dot indicators */}
            {galleryImages.length > 1 && (
              <View style={styles.dotsRow}>
                {galleryImages.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>

          {/* Thumbnail strip */}
          {galleryImages.length > 1 && (
            <FlatList
              ref={galleryRef}
              data={galleryImages}
              keyExtractor={(_, i) => String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbStrip}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => setActiveImageIndex(index)}
                  style={[styles.thumbWrap, index === activeImageIndex && styles.thumbWrapActive]}
                >
                  <Image source={{ uri: item }} style={styles.thumb} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />
          )}

          {/* Details */}
          <View style={[styles.details, isDesktop && styles.detailsDesktop]}>

            <View style={styles.categoryRow}>
              <Text style={styles.category}>{(product.categoryName || product.category).replace(/-/g, ' ').toUpperCase()}</Text>
              {discount && <View style={styles.discountTag}><Text style={styles.discountTagText}>-{discount}% OFF</Text></View>}
            </View>

            <Text style={styles.name}>{product.name}</Text>

            {/* Short description */}
            <Text style={styles.shortDesc} numberOfLines={3}>{shortDescription}</Text>

            {/* Rating row */}
            <View style={styles.metaRow}>
              <View style={styles.ratingRow}>
                {[1,2,3,4,5].map(star => (
                  <Star key={star} size={13} color="#f59e0b" fill={star <= Math.round(product.rating) ? '#f59e0b' : 'none'} />
                ))}
                <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                {ratingSummary && <Text style={styles.ratingCount}>({ratingSummary.total} reviews)</Text>}
              </View>
              <View style={styles.deliveryPill}>
                <Truck size={11} color={C.green} />
                <Text style={styles.deliveryText}>Delivery UGX {deliveryFee.toLocaleString()}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Price */}
            <View style={styles.priceBlock}>
              <View style={styles.priceRow}>
                <Text style={styles.price}>UGX {(product.price * quantity).toLocaleString()}</Text>
                {product.originalPrice && (
                  <>
                    <Text style={styles.originalPrice}>UGX {(product.originalPrice * quantity).toLocaleString()}</Text>
                    <View style={styles.saveBadge}><Text style={styles.saveText}>Save {discount}%</Text></View>
                  </>
                )}
              </View>
              {savings > 0 && <Text style={styles.savings}>You save UGX {(savings * quantity).toLocaleString()} ({discount}%)</Text>}
              <View style={[styles.stockPill, product.stock === 0 && styles.stockPillEmpty]}>
                <Text style={[styles.stockText, product.stock === 0 && styles.stockTextEmpty]}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </Text>
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.quantityBlock}>
              <View style={styles.quantityRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Minus size={15} color={C.navy} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} disabled={product.stock === 0} onPress={() => setQuantity(q => Math.min(product.stock || 1, q + 1))}>
                  <Plus size={15} color={C.navy} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity style={[styles.addToCartBtn, (addedToCart || product.stock === 0) && styles.addedBtn]} disabled={product.stock === 0} onPress={handleAddToCart}>
                <ShoppingCart size={16} color={addedToCart ? '#059669' : C.navy} />
                <Text style={[styles.addToCartText, addedToCart && styles.addedText]}>
                  {product.stock === 0 ? 'Out of Stock' : addedToCart ? 'Added' : 'Add to Cart'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buyNowBtn, product.stock === 0 && styles.disabledBtn]} disabled={product.stock === 0} onPress={() => { addToCart(product, quantity); router.push('/checkout' as any) }}>
                <Text style={styles.buyNowText}>{product.stock === 0 ? 'Unavailable' : 'Buy Now'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity style={styles.secondaryAction} onPress={() => toggleWishlist(product)}>
                <Heart size={16} color="#ef4444" fill={wishlisted ? '#ef4444' : 'none'} />
                <Text style={styles.secondaryActionText}>{wishlisted ? 'Wishlisted' : 'Wishlist'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={handleShare}>
                <Share2 size={16} color={C.navy} />
                <Text style={styles.secondaryActionText}>Share</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Details + Ratings & Reviews — single card */}
        <View style={[styles.infoCard, isDesktop && styles.infoCardDesktop]}>

          {/* Details row */}
          <TouchableOpacity style={styles.infoCardRow} onPress={() => setDetailsExpanded(e => !e)} activeOpacity={0.7}>
            <Text style={styles.infoCardLabel}>Product Details</Text>
            {detailsExpanded ? <ChevronDown size={18} color={C.navy} /> : <ChevronRight size={18} color={C.navy} />}
          </TouchableOpacity>
          {detailsExpanded && (
            <View style={styles.infoCardBody}>
              <Text style={styles.detailsText}>{longDescription}</Text>
              <View style={styles.specsList}>
                {[
                  ['Brand', 'Majo Gadgets'],
                  ['Category', (product.categoryName || product.category).replace(/-/g, ' ')],
                  ['Condition', 'Brand New'],
                  ['Warranty', '1 Year Manufacturer'],
                  ['Delivery', '24-48 hours'],
                ].map(([label, value]) => (
                  <View key={label} style={styles.specRow}>
                    <Text style={styles.specLabel}>{label}</Text>
                    <Text style={styles.specValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.infoCardDivider} />

          {/* Ratings & Reviews */}
          <View style={styles.infoCardReviews}>
            <Text style={styles.infoCardLabel}>Ratings & Reviews</Text>

          {/* Rating breakdown */}
          {ratingSummary && ratingSummary.total > 0 && (
            <View style={styles.ratingBreakdown}>
              <View style={styles.ratingBigScore}>
                <Text style={styles.ratingBigNumber}>{ratingSummary.average.toFixed(1)}</Text>
                <View style={styles.ratingBigStars}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={14} color="#F59E0B" fill={i <= Math.round(ratingSummary.average) ? '#F59E0B' : 'transparent'} />)}
                </View>
                <Text style={styles.ratingBigCount}>Based on {ratingSummary.total} reviews</Text>
              </View>
              <View style={styles.ratingBars}>
                {[5,4,3,2,1].map(star => {
                  const count = ratingSummary.breakdown[String(star)] ?? 0
                  const pct = ratingSummary.total > 0 ? count / ratingSummary.total : 0
                  return (
                    <View key={star} style={styles.ratingBarRow}>
                      <Text style={styles.ratingBarLabel}>{star}</Text>
                      <Star size={10} color="#F59E0B" fill="#F59E0B" />
                      <View style={styles.ratingBarTrack}>
                        <View style={[styles.ratingBarFill, { width: `${pct * 100}%` as any }]} />
                      </View>
                      <Text style={styles.ratingBarCount}>{count}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {/* Filters */}
          {reviews.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
              {['all','5','4','3','2','1','photos'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, reviewFilter === f && styles.filterChipActive]}
                  onPress={() => setReviewFilter(f)}
                >
                  <Text style={[styles.filterChipText, reviewFilter === f && styles.filterChipTextActive]}>
                    {f === 'all' ? 'All' : f === 'photos' ? '📷 With Photos' : `${f} ★`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Review cards — max 5, expandable */}
          {filteredReviews.length === 0 && (
            <Text style={styles.noReviewsText}>
              {reviews.length === 0 ? 'No reviews yet. Be the first to review this product.' : 'No reviews match this filter.'}
            </Text>
          )}
          {(reviewsExpanded ? filteredReviews : filteredReviews.slice(0, 5)).map(r => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <View style={styles.reviewAvatarWrap}>
                  {r.user_avatar
                    ? <Image source={{ uri: r.user_avatar }} style={styles.reviewAvatar} />
                    : <View style={[styles.reviewAvatar, styles.reviewAvatarFallback]}><Text style={styles.reviewAvatarInitial}>{r.user_name?.[0]?.toUpperCase() ?? '?'}</Text></View>
                  }
                </View>
                <View style={styles.reviewCardMeta}>
                  <View style={styles.reviewNameRow}>
                    <Text style={styles.reviewUserName}>{r.user_name}</Text>
                    {r.verified_purchase && (
                      <View style={styles.verifiedBadge}>
                        <CheckCircle size={10} color={C.green} />
                        <Text style={styles.verifiedText}>Verified Purchase</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.reviewStarsRow}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} color="#F59E0B" fill={i <= r.overall_rating ? '#F59E0B' : 'transparent'} />)}
                    <Text style={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                </View>
              </View>
              {r.review_text ? <Text style={styles.reviewText}>{r.review_text}</Text> : null}
              {r.images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesScroll}>
                  {r.images.map(img => (
                    <Image key={img.id} source={{ uri: img.url }} style={styles.reviewImage} resizeMode="cover" />
                  ))}
                </ScrollView>
              )}
            </View>
          ))}

          {filteredReviews.length > 5 && (
            <TouchableOpacity style={styles.viewMoreBtn} onPress={() => setReviewsExpanded(e => !e)}>
              <Text style={styles.viewMoreText}>
                {reviewsExpanded ? 'Show Less' : `View More (${filteredReviews.length - 5} more)`}
              </Text>
            </TouchableOpacity>
          )}
          </View>
        </View>

        {/* Recommended Products */}
        {recommended.length > 0 && (
          <View style={[styles.recommendedSection, isDesktop && styles.recommendedSectionDesktop]}>
            <View style={styles.recommendedHeader}>
              <Text style={styles.recommendedTitle}>You May Also Like</Text>
              <TouchableOpacity onPress={() => router.push('/shop' as any)}>
                <Text style={styles.recommendedSeeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.recommendedGrid, isDesktop && styles.recommendedGridDesktop]}>
              {recommended.map(p => (
                <ProductCard key={p.id} product={p} cardWidth={(width - 32 - 6 * 2) / 3} />
              ))}
            </View>
          </View>
        )}

        {/* People Also Like */}
        {peopleAlsoLike.length > 0 && (() => {
          const col3Width = (width - 32 - 6 * 2) / 3
          return (
            <View style={[styles.recommendedSection, isDesktop && styles.recommendedSectionDesktop]}>
              <View style={styles.recommendedHeader}>
                <Text style={styles.recommendedTitle}>People Also Like</Text>
                <TouchableOpacity onPress={() => router.push('/shop' as any)}>
                  <Text style={styles.recommendedSeeAll}>See All →</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.recommendedGrid, isDesktop && styles.recommendedGridDesktop]}>
                {peopleAlsoLike.map(p => (
                  <View key={p.id} style={{ width: col3Width }}>
                    <ProductCard product={p} cardWidth={col3Width} />
                  </View>
                ))}
              </View>
            </View>
          )
        })()}

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: C.muted },
  backLink: { fontSize: 14, color: C.green, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: C.navy, textAlign: 'center', marginHorizontal: 8 },
  headerSpacer: { width: 22 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  breadcrumbLink: { fontSize: 12, color: C.muted },
  breadcrumbDivider: { fontSize: 16, color: C.border },
  breadcrumbCurrent: { flex: 1, fontSize: 12, color: C.navy, fontWeight: '600' },

  scroll: { paddingBottom: 100, paddingTop: 12 },
  scrollDesktop: { maxWidth: 1200, alignSelf: 'center', width: '100%', paddingHorizontal: 32, paddingTop: 24 },

  card: { backgroundColor: C.card, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3, marginBottom: 20, marginHorizontal: 16 },
  cardDesktop: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 0, borderRadius: 24, shadowOpacity: 0.08, shadowRadius: 20 },

  imageContainer: { width: '85%', alignSelf: 'center', height: STATIC_WIDTH * 0.55, backgroundColor: C.bg },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productEmoji: { fontSize: 100 },

  dotsRow: { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff88' },
  dotActive: { backgroundColor: '#fff', width: 18 },

  arrowOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  arrowBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#00000066', alignItems: 'center', justifyContent: 'center' },
  arrowPlaceholder: { width: 36 },
  arrowText: { color: '#fff', fontSize: 24, fontWeight: '300', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },

  thumbStrip: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  thumbWrap: { borderRadius: 8, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  thumbWrapActive: { borderColor: C.green },
  thumb: { width: 56, height: 56, borderRadius: 6 },

  badge: { position: 'absolute', top: 12, left: 12, backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDiscount: { position: 'absolute', top: 12, left: 12, backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeNew: { backgroundColor: C.navy },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  wishlistBtn: { position: 'absolute', top: 10, right: 12, width: 38, height: 38, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },

  details: { padding: 18 },
  detailsDesktop: { flex: 1, padding: 36, paddingTop: 32 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  category: { fontSize: 10, fontWeight: '700', color: C.mutedLight, letterSpacing: 1.5 },
  discountTag: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  discountTagText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },
  name: { fontSize: 19, fontWeight: '800', color: C.navy, marginBottom: 8, lineHeight: 25 },
  shortDesc: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, fontWeight: '700', color: C.navy, marginLeft: 4 },
  ratingCount: { fontSize: 11, color: C.mutedLight, marginLeft: 2 },
  deliveryPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  deliveryText: { fontSize: 11, fontWeight: '600', color: C.green },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 16 },
  priceBlock: { marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  price: { fontSize: 22, fontWeight: '800', color: C.navy },
  originalPrice: { fontSize: 13, color: C.mutedLight, textDecorationLine: 'line-through' },
  saveBadge: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  saveText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  savings: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 4 },
  stockPill: { alignSelf: 'flex-start', backgroundColor: '#F0FDF4', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 8 },
  stockPillEmpty: { backgroundColor: '#FEF2F2' },
  stockText: { fontSize: 11, color: '#16A34A', fontWeight: '700' },
  stockTextEmpty: { color: '#EF4444' },
  quantityBlock: { alignItems: 'center', marginBottom: 16 },
  qtyLabel: { fontSize: 13, fontWeight: '600', color: C.navy },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 0, borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: 'hidden' },
  qtyBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  qtyValue: { fontSize: 15, fontWeight: '700', color: C.navy, minWidth: 36, textAlign: 'center' },
  buttonsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  buyNowBtn: { flex: 1, backgroundColor: C.navy, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: C.mutedLight },
  buyNowText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  addToCartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.card, borderRadius: 12, height: 50, borderWidth: 1.5, borderColor: C.navy },
  addedBtn: { backgroundColor: '#F0FDF4', borderColor: '#059669' },
  addToCartText: { color: C.navy, fontWeight: '700', fontSize: 15 },
  addedText: { color: '#059669' },
  secondaryActionsRow: { flexDirection: 'row', gap: 10 },
  secondaryAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  secondaryActionText: { color: C.navy, fontSize: 12, fontWeight: '600' },

  // Combined info card
  infoCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  infoCardDesktop: { marginHorizontal: 0 },
  infoCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  infoCardLabel: { fontSize: 13, fontWeight: '800', color: C.navy },
  infoCardBody: { paddingHorizontal: 16, paddingBottom: 20 },
  infoCardDivider: { height: 1, backgroundColor: C.border },
  infoCardReviews: { padding: 14, gap: 14 },
  detailsText: { fontSize: 14, color: C.muted, lineHeight: 22, marginBottom: 20 },
  specsList: { gap: 0, borderTopWidth: 1, borderTopColor: C.border },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  specLabel: { fontSize: 13, color: C.muted, fontWeight: '500' },
  specValue: { fontSize: 13, color: C.navy, fontWeight: '600', textTransform: 'capitalize' },
  viewMoreBtn: { alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  viewMoreText: { fontSize: 13, fontWeight: '700', color: C.green },

  ratingBreakdown: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  ratingBigScore: { alignItems: 'center', gap: 4 },
  ratingBigNumber: { fontSize: 28, fontWeight: '800', color: C.navy },
  ratingBigStars: { flexDirection: 'row', gap: 2 },
  ratingBigCount: { fontSize: 9, color: C.mutedLight, textAlign: 'center' },
  ratingBars: { flex: 1, gap: 5 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingBarLabel: { fontSize: 11, color: C.muted, width: 10, textAlign: 'right' },
  ratingBarTrack: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  ratingBarFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  ratingBarCount: { fontSize: 10, color: C.mutedLight, width: 18, textAlign: 'right' },

  filterScroll: { marginHorizontal: -14 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
  filterChip: { borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.card },
  filterChipActive: { backgroundColor: C.navy, borderColor: C.navy },
  filterChipText: { fontSize: 12, color: C.muted, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },

  noReviewsText: { fontSize: 13, color: C.mutedLight, textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },

  reviewCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 12, gap: 8 },
  reviewCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reviewAvatarWrap: {},
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewAvatarFallback: { backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarInitial: { color: '#fff', fontSize: 14, fontWeight: '800' },
  reviewCardMeta: { flex: 1, gap: 4 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reviewUserName: { fontSize: 13, fontWeight: '700', color: C.navy },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { fontSize: 10, color: C.green, fontWeight: '700' },
  reviewStarsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewDate: { fontSize: 10, color: C.mutedLight, marginLeft: 6 },
  reviewText: { fontSize: 13, color: C.navy, lineHeight: 20 },
  reviewImagesScroll: { marginTop: 4 },
  reviewImage: { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
  reviewLocked: { fontSize: 12, color: C.mutedLight, fontStyle: 'italic', textAlign: 'center' },


  recommendedSection: { marginBottom: 16 },
  recommendedSectionDesktop: { marginHorizontal: 0 },
  recommendedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 16 },
  recommendedTitle: { fontSize: 17, fontWeight: '800', color: C.navy },
  recommendedSeeAll: { fontSize: 13, fontWeight: '600', color: C.green },
  recommendedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 },
  recommendedGridDesktop: { gap: 12, paddingHorizontal: 0 },
})

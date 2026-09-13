import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cartApi, productsApi, wishlistApi, notifyWishlistUpdated, toProduct, type Product, type ApiReview } from '../lib/api'
import ProductCard from '../components/ProductCard'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 20 20" fill={s <= Math.round(rating) ? '#FBBF24' : '#E2E8F0'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [alsoBy, setAlsoBy] = useState<Product[]>([])
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [summary, setSummary] = useState<{ average: number; total: number; breakdown: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [wishlisted, setWishlisted] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [productDetailsExpanded, setProductDetailsExpanded] = useState(false)
  const [cartBusy, setCartBusy] = useState(false)
  const [cartToast, setCartToast] = useState<string | null>(null)
  const [inCart, setInCart] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setActiveImg(0)
    setQty(1)
    setWishlisted(false)
    setProductDetailsExpanded(false)
    setReviews([])
    setSummary(null)

    productsApi.bySlug(slug).then(({ data }) => {
      const p = toProduct(data)
      setProduct(p)
      cartApi.list().then(items => {
        setInCart(items.some(i => i.product_id === p.id))
      }).catch(() => undefined)

      // Track browsed categories for Recommended section
      if (p.category) {
        try {
          const prev: string[] = JSON.parse(localStorage.getItem('majo_browsed_cats') ?? '[]')
          const updated = [p.category, ...prev.filter(c => c !== p.category)].slice(0, 6)
          localStorage.setItem('majo_browsed_cats', JSON.stringify(updated))
        } catch { /* ignore */ }
      }

      productsApi.byCategory(p.category).then(({ data: d }) => {
        const raw = Array.isArray(d) ? d : (d as any).results ?? []
        setRelated(raw.map(toProduct).filter((r: Product) => r.slug !== slug).slice(0, 6))
      }).catch(() => undefined)

      productsApi.list().then(({ data: d }) => {
        const raw = Array.isArray(d) ? d : (d as any).results ?? []
        setAlsoBy(raw.map(toProduct).filter((r: Product) => r.slug !== slug && r.category !== p.category).slice(0, 6))
      }).catch(() => undefined)

      productsApi.reviews(slug).then(({ data: d }) => {
        setReviews(Array.isArray(d) ? d : (d as any).results ?? [])
      }).catch(() => undefined)

      productsApi.ratingSummary(slug).then(({ data: d }) => setSummary(d)).catch(() => undefined)

    }).catch(() => navigate('/')).finally(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <div className="pt-14 lg:pt-16 flex items-center justify-center min-h-[60vh]">
        <svg className="w-8 h-8 animate-spin text-[#1E3A8A]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    </div>
  )

  if (!product) return null

  const pageTitle = `${product.name} – Majo Gadgets`
  const pageDesc = product.shortDescription.trim() || `Buy ${product.name} at UGX ${product.price.toLocaleString()} on Majo Gadgets. Fast delivery across Uganda.`
  const pageImage = product.image || 'https://res.cloudinary.com/fhklnn0f/image/upload/v1789111152/Majo_Gadgets_logo_an2hbc.png'
  const pageUrl = `https://www.majogadgets.com/shop/${product.slug}`

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null

  const allImages = [
    ...(product.image ? [product.image] : []),
    ...product.images.map(i => i.url).filter(u => u !== product.image),
  ]

  const savings = product.originalPrice ? product.originalPrice - product.price : 0
  const shortDescription = product.shortDescription.trim() || 'A quality product from Majo Gadgets, selected for reliable everyday use and great value.'
  const longDescription = product.longDescription.trim() || shortDescription
  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + 2)
  const deliveryDateLabel = deliveryDate.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })

  const showToast = (message: string) => {
    setCartToast(message)
    window.setTimeout(() => setCartToast(null), 3200)
  }

  const toggleWishlist = async () => {
    try {
      if (wishlisted) {
        await wishlistApi.remove(product.id)
        setWishlisted(false)
      } else {
        await wishlistApi.add(product)
        setWishlisted(true)
      }
      notifyWishlistUpdated()
    } catch {
      showToast('Please sign in to save products to your wishlist.')
    }
  }

  const shareProduct = async () => {
    const shareUrl = productsApi.shareUrl(product.slug)
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: `Buy ${product.name} from Majo Gadgets`, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        showToast('Product link copied.')
      }
    } catch { /* The share sheet can be dismissed without an error state. */ }
    finally { setSharing(false) }
  }

  const addToCart = async (goToCart = false) => {
    if (inCart || goToCart) { navigate(goToCart ? '/checkout' : '/cart'); return }
    setCartBusy(true)
    try {
      await cartApi.add(product, qty)
      setInCart(true)
      showToast(`${product.name} added to cart`)
    } catch {
      showToast('Could not add to cart. Please try again.')
    } finally {
      setCartBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content={pageImage} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={pageImage} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: pageDesc,
          image: allImages,
          url: pageUrl,
          sku: String(product.id),
          brand: { '@type': 'Brand', name: 'Majo Gadgets' },
          category: product.categoryName,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'UGX',
            price: product.price,
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: pageUrl,
            seller: { '@type': 'Organization', name: 'Majo Gadgets' },
          },
          ...(summary && summary.total > 0 ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: summary.average.toFixed(1),
              reviewCount: summary.total,
              bestRating: 5,
              worstRating: 1,
            }
          } : {}),
        })}</script>
      </Helmet>
      <Navbar />
      {cartToast && (
        <div className="fixed top-20 right-4 z-[100] flex items-center gap-2 bg-[#071A2B] text-white px-4 py-3 rounded-xl shadow-xl text-[13px] font-semibold" role="status">
          <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {cartToast}
        </div>
      )}
      <div className="pt-14 lg:pt-16 pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-5">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px] text-[#64748B] mb-5 flex-wrap">
            <Link to="/" className="hover:text-[#1E3A8A] transition-colors">Home</Link>
            <span className="text-[#CBD5E1]">›</span>
            <Link to={`/shop?category=${product.category}`} className="hover:text-[#1E3A8A] transition-colors capitalize">{product.categoryName}</Link>
            <span className="text-[#CBD5E1]">›</span>
            <span className="text-[#071A2B] font-medium truncate max-w-[240px]">{product.name}</span>
          </div>

          {/* Product overview */}
          <div className="max-w-5xl mx-4 sm:mx-auto mb-10">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Image gallery — wider */}
            <div className="lg:w-[48%] xl:w-[52%] shrink-0">
              {/* Main image */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden mb-3 relative" style={{ aspectRatio: '1/1' }}>
                {allImages.length > 0
                  ? <img src={allImages[activeImg]} alt={product.name} className="w-full h-full object-contain p-6" />
                  : <div className="w-full h-full flex items-center justify-center text-7xl">📦</div>
                }
                {discount && (
                  <div className="absolute top-3 left-3 bg-[#EF4444] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                    -{discount}% OFF
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${i === activeImg ? 'border-[#1E3A8A] shadow-md' : 'border-[#E2E8F0] opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">

              {/* Category + name */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[11px] font-bold text-[#1E3A8A] uppercase tracking-widest">{product.categoryName}</span>
                  {discount && <span className="text-[11px] font-extrabold text-[#DC2626] bg-red-50 px-2.5 py-1 rounded-full">Save {discount}%</span>}
                </div>
                <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#071A2B] leading-tight">{product.name}</h1>
              </div>

              {/* Rating row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Stars rating={product.rating} size={16} />
                <span className="text-[13px] font-bold text-[#071A2B]">{product.rating.toFixed(1)}</span>
                {product.reviewsCount > 0 && (
                  <span className="text-[12px] text-[#64748B]">({product.reviewsCount} {product.reviewsCount === 1 ? 'review' : 'reviews'})</span>
                )}
                <span className={`ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#E2E8F0]" />

              {/* Pricing block */}
              <div>
                <div className="flex items-baseline gap-3 flex-wrap mb-1">
                  <span className="text-[30px] font-extrabold text-[#1E3A8A]">UGX {product.price.toLocaleString()}</span>
                  {product.originalPrice && (
                    <span className="text-[16px] text-[#94A3B8] line-through">UGX {product.originalPrice.toLocaleString()}</span>
                  )}
                </div>
                {savings > 0 && (
                  <p className="text-[12px] text-green-600 font-semibold">
                    You save UGX {savings.toLocaleString()} ({discount}%)
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="pt-1">
                <h2 className="text-[14px] font-extrabold text-[#071A2B] mb-1.5">About this product</h2>
                <p className="text-[13px] text-[#475569] leading-relaxed whitespace-pre-line">{shortDescription}</p>
              </div>

              {/* Qty + actions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-3">
                  {/* Qty control */}
                  <div className="flex items-center bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-10 h-11 flex items-center justify-center text-[#071A2B] hover:bg-[#F8FAFC] text-xl font-bold transition-colors"
                    >−</button>
                    <span className="w-12 text-center text-[15px] font-extrabold text-[#071A2B]">{qty}</span>
                    <button
                      onClick={() => setQty(q => Math.min(product.stock || 99, q + 1))}
                      className="w-10 h-11 flex items-center justify-center text-[#071A2B] hover:bg-[#F8FAFC] text-xl font-bold transition-colors"
                    >+</button>
                  </div>

                </div>

                <div className="flex gap-3">
                  {/* Add to cart */}
                  <button
                    disabled={product.stock === 0 || cartBusy}
                    onClick={() => addToCart()}
                    className="flex-1 h-11 bg-[#1E3A8A] text-white font-bold text-[14px] rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                    {cartBusy ? 'Adding...' : inCart ? 'Go to Cart' : 'Add to Cart'}
                  </button>

                  {/* Buy now */}
                  <button
                    disabled={product.stock === 0}
                    onClick={() => addToCart(true)}
                    className="flex-1 h-11 border-2 border-[#1E3A8A] text-[#1E3A8A] font-bold text-[14px] rounded-xl hover:bg-[#EFF6FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Buy Now
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={toggleWishlist}
                    aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={`flex-1 h-10 flex items-center justify-center gap-2 border rounded-xl text-[13px] font-bold transition-colors ${wishlisted ? 'border-red-200 bg-red-50 text-red-500' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#FFF1F2] hover:border-red-200'}`}
                  >
                    <svg className="w-4 h-4" fill={wishlisted ? '#ef4444' : 'none'} stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                    </svg>
                    {wishlisted ? 'Saved' : 'Wishlist'}
                  </button>
                  <button
                    onClick={shareProduct}
                    disabled={sharing}
                    aria-label="Share product"
                    title="Share product"
                    className="flex-1 h-10 flex items-center justify-center gap-2 border border-[#E2E8F0] bg-white text-[#475569] rounded-xl text-[13px] font-bold hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.487 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.368-2.684 3 3 0 00-5.368 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {sharing ? 'Sharing...' : 'Share'}
                  </button>
                </div>
                <p className="text-center text-[12px] text-[#64748B]">
                  If you order it now, you will get it delivered in <span className="font-bold text-[#1E3A8A]">2 days</span>, by <span className="font-bold text-[#071A2B]">{deliveryDateLabel}</span>.
                </p>
              </div>

            </div>
          </div>
          </div>

          {/* Customer reviews */}
          <div className="mb-10">
            <div>
              <button
                onClick={() => setProductDetailsExpanded(value => !value)}
                className="w-full flex items-center justify-between py-4 border-b border-[#E2E8F0] text-left"
                aria-expanded={productDetailsExpanded}
              >
                <span className="text-[16px] font-extrabold text-[#071A2B]">Product Details</span>
                {productDetailsExpanded
                  ? <ChevronDown className="w-5 h-5 text-[#071A2B]" strokeWidth={2} />
                  : <ChevronRight className="w-5 h-5 text-[#071A2B]" strokeWidth={2} />}
              </button>
              {productDetailsExpanded && (
                <div className="py-4 border-b border-[#E2E8F0]">
                  <div
                    className="text-[13px] text-[#475569] leading-relaxed
                      [&_p]:mb-3 [&_p:last-child]:mb-0
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                      [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic
                      [&_u]:underline [&_s]:line-through [&_strike]:line-through"
                    dangerouslySetInnerHTML={{ __html: longDescription }}
                  />
                </div>
              )}
              <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E2E8F0]">
                <div>
                  <h2 className="text-[18px] font-extrabold text-[#071A2B]">Customer reviews</h2>
                  <p className="text-[12px] text-[#64748B] mt-1">What customers say about this product</p>
                </div>
                <span className="text-[12px] font-bold text-[#1E3A8A]">{product.reviewsCount} {product.reviewsCount === 1 ? 'review' : 'reviews'}</span>
              </div>
              <div>
                  {/* Summary */}
                  {summary && summary.total > 0 && (
                    <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-[#E2E8F0]">
                      {/* Big score */}
                      <div className="flex flex-col items-center justify-center bg-[#EFF6FF] rounded-2xl px-8 py-5 shrink-0">
                        <span className="text-[48px] font-extrabold text-[#1E3A8A] leading-none">{summary.average.toFixed(1)}</span>
                        <Stars rating={summary.average} size={18} />
                        <span className="text-[12px] text-[#64748B] mt-1">{summary.total} reviews</span>
                      </div>
                      {/* Breakdown bars */}
                      <div className="flex-1 flex flex-col justify-center gap-2">
                        {[5, 4, 3, 2, 1].map(star => {
                          const count = summary.breakdown[String(star)] ?? 0
                          const pct = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="text-[12px] font-semibold text-[#475569] w-4 shrink-0">{star}</span>
                              <svg width={12} height={12} viewBox="0 0 20 20" fill="#FBBF24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                                <div className="h-full bg-[#FBBF24] rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] text-[#94A3B8] w-8 text-right shrink-0">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Review cards */}
                  {reviews.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {reviews.map(r => (
                        <div key={r.id} className="border-b border-[#E2E8F0] pb-4 last:border-b-0">
                          <div className="flex items-start gap-3 mb-2">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-[#1E3A8A] flex items-center justify-center shrink-0 overflow-hidden">
                              {r.user_avatar
                                ? <img src={r.user_avatar} alt="" className="w-full h-full object-cover" />
                                : <span className="text-white text-[13px] font-bold">{r.user_name?.[0]?.toUpperCase() ?? 'U'}</span>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[13px] font-bold text-[#071A2B]">{r.user_name ?? 'Anonymous'}</span>
                                <span className="text-[11px] text-[#94A3B8]">{new Date(r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Stars rating={r.overall_rating} size={13} />
                                {r.verified_purchase && (
                                  <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {r.review_text && (
                            <p className="text-[13px] text-[#475569] leading-relaxed">{r.review_text}</p>
                          )}
                          {r.images?.length > 0 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {r.images.map(img => (
                                <img key={img.id} src={img.url} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#E2E8F0]" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-10 gap-2 text-[#94A3B8]">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-[13px] font-semibold">No reviews yet</p>
                      <p className="text-[12px]">Be the first to review this product</p>
                    </div>
                  )}
                </div>
            </div>
          </div>

          {/* Related Products */}
          {related.length > 0 && (
            <div className="mb-10">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[18px] font-extrabold text-[#071A2B]">Related Products</p>
                  <p className="text-[12px] text-[#64748B] mt-0.5">More from {product.categoryName}</p>
                </div>
                <Link to={`/shop?category=${product.category}`} className="text-[13px] font-semibold text-[#1E3A8A]">See All →</Link>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {related.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}

          {/* People Also Buy */}
          {alsoBy.length > 0 && (
            <div className="mb-10">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[18px] font-extrabold text-[#071A2B]">People Also Buy</p>
                  <p className="text-[12px] text-[#64748B] mt-0.5">Customers who viewed this also liked</p>
                </div>
                <Link to="/shop" className="text-[13px] font-semibold text-[#1E3A8A]">See All →</Link>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {alsoBy.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          )}

        </div>
        <Footer />
      </div>
    </div>
  )
}

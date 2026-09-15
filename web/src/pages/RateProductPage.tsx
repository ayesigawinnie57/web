import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2, Star } from 'lucide-react'
import { hasAccessToken, productsApi, type ApiProduct } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

type Attr = { key: string; label: string; emoji: string }

const CATEGORY_ATTRS: Record<string, Attr[]> = {
  phones: [
    { key: 'performance_rating',     label: 'Performance',     emoji: '⚙️' },
    { key: 'battery_life_rating',    label: 'Battery Life',    emoji: '🔋' },
    { key: 'product_quality_rating', label: 'Build Quality',   emoji: '💎' },
    { key: 'design_rating',          label: 'Design',          emoji: '🎨' },
    { key: 'value_for_money_rating', label: 'Value for Money', emoji: '💰' },
  ],
  laptops: [
    { key: 'performance_rating',     label: 'Performance',     emoji: '⚙️' },
    { key: 'battery_life_rating',    label: 'Battery Life',    emoji: '🔋' },
    { key: 'product_quality_rating', label: 'Build Quality',   emoji: '💎' },
    { key: 'design_rating',          label: 'Design',          emoji: '🎨' },
    { key: 'value_for_money_rating', label: 'Value for Money', emoji: '💰' },
  ],
  earphones: [
    { key: 'performance_rating',     label: 'Sound Quality',   emoji: '🎵' },
    { key: 'battery_life_rating',    label: 'Battery Life',    emoji: '🔋' },
    { key: 'product_quality_rating', label: 'Comfort',         emoji: '😌' },
    { key: 'features_rating',        label: 'Connectivity',    emoji: '📡' },
  ],
  'smart-watches': [
    { key: 'features_rating',        label: 'Features',        emoji: '📋' },
    { key: 'battery_life_rating',    label: 'Battery Life',    emoji: '🔋' },
    { key: 'design_rating',          label: 'Display',         emoji: '🖥️' },
    { key: 'size_fit_rating',        label: 'Comfort',         emoji: '😌' },
  ],
  accessories: [
    { key: 'product_quality_rating', label: 'Product Quality', emoji: '⭐' },
    { key: 'condition_rating',       label: 'Condition',       emoji: '📦' },
    { key: 'value_for_money_rating', label: 'Value for Money', emoji: '💎' },
    { key: 'design_rating',          label: 'Design',          emoji: '🎨' },
  ],
}

const DEFAULT_ATTRS: Attr[] = [
  { key: 'product_quality_rating', label: 'Product Quality', emoji: '⭐' },
  { key: 'performance_rating',     label: 'Performance',     emoji: '⚙️' },
  { key: 'value_for_money_rating', label: 'Value for Money', emoji: '💎' },
  { key: 'design_rating',          label: 'Design',          emoji: '🎨' },
]

function getAttrs(categorySlug?: string): Attr[] {
  if (!categorySlug) return DEFAULT_ATTRS
  const slug = categorySlug.toLowerCase()
  for (const key of Object.keys(CATEGORY_ATTRS)) {
    if (slug.includes(key)) return CATEGORY_ATTRS[key]
  }
  return DEFAULT_ATTRS
}

const OVERALL_LABELS: Record<number, string> = {
  1: 'Very Poor', 2: 'Poor', 3: 'Average', 4: 'Good', 5: 'Excellent',
}

const TOTAL_STEPS = 4

function StarRow({ value, onChange, size = 32 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-2 mt-2">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(i)} className="focus:outline-none">
          <Star
            size={size}
            className={i <= value ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#E2E8F0] fill-[#E2E8F0]'}
          />
        </button>
      ))}
    </div>
  )
}

export default function RateProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [eligibility, setEligibility] = useState<{
    eligible: boolean; reason?: string; order_id?: number; order_item_id?: number
  } | null>(null)

  const [step, setStep] = useState(1)
  const [overall, setOverall] = useState(0)
  const [attrRatings, setAttrRatings] = useState<Record<string, number>>({})
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const attrs = getAttrs(product?.category?.slug)

  useEffect(() => {
    if (!hasAccessToken()) { navigate(`/login?next=/rate-product/${slug}`); return }
    if (!slug) return
    Promise.all([
      productsApi.bySlug(slug),
      productsApi.checkEligibility(slug),
    ]).then(([pRes, eRes]) => {
      setProduct(pRes.data)
      setEligibility(eRes.data)
    }).catch(() => {
      setEligibility({ eligible: false, reason: 'error' })
    }).finally(() => setLoading(false))
  }, [slug])

  const pickOverall = (val: number) => {
    setOverall(val)
    if (autoTimer.current) clearTimeout(autoTimer.current)
    autoTimer.current = setTimeout(() => setStep(2), 500)
  }

  const setAttr = (key: string, val: number) => {
    setAttrRatings(prev => {
      const updated = { ...prev, [key]: val }
      const allDone = attrs.every(a => (updated[a.key] ?? 0) > 0)
      if (allDone) {
        if (autoTimer.current) clearTimeout(autoTimer.current)
        autoTimer.current = setTimeout(() => setStep(3), 400)
      }
      return updated
    })
  }

  const handleSubmit = async () => {
    if (!slug || !eligibility?.eligible) return
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('overall_rating', String(overall))
      if (eligibility.order_id) form.append('order', String(eligibility.order_id))
      if (eligibility.order_item_id) form.append('order_item', String(eligibility.order_item_id))
      attrs.forEach(a => { if (attrRatings[a.key]) form.append(a.key, String(attrRatings[a.key])) })
      if (reviewText.trim()) form.append('review_text', reviewText.trim())
      await productsApi.submitReview(slug, form)
      setDone(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => step > 1 ? setStep(s => s - 1) : navigate(-1)

  if (loading) return (
    <>
      <Navbar />
      <div className="pt-24 flex justify-center items-center gap-2 text-[13px] text-[#64748B]">
        <Loader2 size={16} className="animate-spin" /> Loading...
      </div>
    </>
  )

  if (!eligibility?.eligible) {
    const alreadyReviewed = eligibility?.reason === 'already_reviewed'
    return (
      <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Navbar />
        <div className="pt-24 flex flex-col items-center gap-4 px-4 text-center max-w-sm mx-auto">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${alreadyReviewed ? 'bg-[#DCFCE7]' : 'bg-[#F1F5F9]'}`}>
            {alreadyReviewed
              ? <CheckCircle size={32} className="text-[#16A34A]" />
              : <Star size={32} className="text-[#94A3B8]" />
            }
          </div>
          <h2 className="text-[20px] font-extrabold text-[#071A2B]">
            {alreadyReviewed ? 'Already Reviewed' : 'Not Available Yet'}
          </h2>
          <p className="text-[13px] text-[#64748B] leading-relaxed">
            {alreadyReviewed
              ? 'You have already submitted a review for this product.'
              : 'You can only review a product after the related order has been delivered.'}
          </p>
          <button onClick={() => navigate(-1)}
            className="px-8 py-3 bg-[#1E3A8A] text-white rounded-xl text-[14px] font-bold hover:opacity-90">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    const orderCode = searchParams.get('order_code')
    return (
      <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Navbar />
        <div className="pt-24 flex flex-col items-center gap-4 px-4 text-center max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center">
            <CheckCircle size={40} className="text-[#16A34A]" />
          </div>
          <h2 className="text-[22px] font-extrabold text-[#071A2B]">Thank You!</h2>
          <p className="text-[13px] text-[#64748B] leading-relaxed">
            Your review has been submitted. It helps other customers make better choices.
          </p>
          {orderCode && (
            <Link to={`/orders/${orderCode}`}
              className="px-8 py-3 border border-[#E2E8F0] text-[#1E3A8A] rounded-xl text-[13px] font-bold hover:bg-[#EFF6FF]">
              Back to Order
            </Link>
          )}
          <button onClick={() => navigate('/')}
            className="px-10 py-3 bg-[#16A34A] text-white rounded-xl text-[14px] font-bold hover:opacity-90">
            Done
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  const canContinue =
    (step === 1 && overall > 0) ||
    (step === 2 && attrs.every(a => (attrRatings[a.key] ?? 0) > 0)) ||
    step === 3

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={goBack}
            className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center hover:border-[#071A2B]">
            <ArrowLeft size={18} className="text-[#1E3A8A]" />
          </button>
          <h1 className="text-[16px] font-bold text-[#071A2B]">Rate Product</h1>
          <span className="text-[12px] text-[#94A3B8] font-semibold">{step} of {TOTAL_STEPS}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#E2E8F0] rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-[#F59E0B] rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5">

          {/* Step 1: Overall */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Product card */}
              {product && (
                <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                  {product.image
                    ? <img src={product.image} alt="" className="w-14 h-14 rounded-xl object-contain bg-white border border-[#E2E8F0]" />
                    : <div className="w-14 h-14 rounded-xl bg-[#E2E8F0] flex items-center justify-center text-2xl">📦</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">{product.category?.name}</p>
                    <p className="text-[14px] font-bold text-[#071A2B] truncate">{product.name}</p>
                  </div>
                </div>
              )}
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">How would you rate this product?</h2>
              <StarRow value={overall} onChange={pickOverall} size={36} />
              {overall > 0 && <p className="text-[15px] font-bold text-[#F59E0B]">{OVERALL_LABELS[overall]}</p>}
            </div>
          )}

          {/* Step 2: Attribute ratings */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">Rate each aspect</h2>
              <p className="text-[13px] text-[#64748B]">Tap the stars for each area.</p>
              {attrs.map(attr => (
                <div key={attr.key} className="border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[18px]">{attr.emoji}</span>
                    <span className="text-[13px] font-bold text-[#071A2B]">{attr.label}</span>
                  </div>
                  <StarRow value={attrRatings[attr.key] ?? 0} onChange={v => setAttr(attr.key, v)} size={26} />
                  {(attrRatings[attr.key] ?? 0) > 0 && (
                    <p className="text-[12px] font-bold text-[#F59E0B]">{OVERALL_LABELS[attrRatings[attr.key]]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Written review */}
          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">Tell us about the product</h2>
              <p className="text-[13px] text-[#64748B]">Your review helps other customers. (Optional)</p>
              <textarea
                rows={5}
                value={reviewText}
                onChange={e => setReviewText(e.target.value.slice(0, 500))}
                placeholder="Share your experience with this product..."
                className="w-full border border-[#E2E8F0] rounded-xl p-4 text-[14px] text-[#071A2B] placeholder-[#94A3B8] resize-none focus:outline-none focus:border-[#1E3A8A]"
              />
              <p className="text-[11px] text-[#94A3B8] text-right">{reviewText.length}/500</p>
            </div>
          )}

          {/* Step 4: Summary + submit */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">Review Summary</h2>

              {/* Product */}
              {product && (
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-3">
                  {product.image
                    ? <img src={product.image} alt="" className="w-12 h-12 rounded-lg object-contain" />
                    : <div className="w-12 h-12 rounded-lg bg-[#E2E8F0] flex items-center justify-center text-xl">📦</div>
                  }
                  <p className="text-[13px] font-bold text-[#071A2B] flex-1 truncate">{product.name}</p>
                </div>
              )}

              {/* Overall */}
              <div className="p-3 border border-[#E2E8F0] rounded-xl space-y-1">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Overall Rating</p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={14} className={i <= overall ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#E2E8F0] fill-[#E2E8F0]'} />
                    ))}
                  </div>
                  <span className="text-[13px] font-bold text-[#F59E0B]">{OVERALL_LABELS[overall]}</span>
                </div>
              </div>

              {/* Attributes */}
              {attrs.some(a => attrRatings[a.key]) && (
                <div className="p-3 border border-[#E2E8F0] rounded-xl space-y-2">
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Your Ratings</p>
                  {attrs.filter(a => attrRatings[a.key]).map(a => (
                    <div key={a.key} className="flex items-center justify-between">
                      <span className="text-[13px] text-[#071A2B]">{a.emoji} {a.label}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={12} className={i <= attrRatings[a.key] ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#E2E8F0] fill-[#E2E8F0]'} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Review text */}
              {reviewText.trim() && (
                <div className="p-3 border border-[#E2E8F0] rounded-xl">
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">Your Review</p>
                  <p className="text-[13px] text-[#475569] italic">"{reviewText.trim()}"</p>
                </div>
              )}

              {error && <p className="text-[13px] text-red-500">{error}</p>}

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-3 bg-[#16A34A] text-white rounded-xl text-[14px] font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Review'}
              </button>
            </div>
          )}

        </div>

        {/* Footer continue */}
        {step < TOTAL_STEPS && (
          <div className="mt-4 space-y-2">
            <button
              onClick={() => canContinue && setStep(s => s + 1)}
              disabled={!canContinue}
              className="w-full py-3 bg-[#1E3A8A] text-white rounded-xl text-[14px] font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
              {step === 3 ? 'Continue' : 'Next'}
            </button>
            {step === 3 && (
              <button onClick={() => setStep(s => s + 1)}
                className="w-full py-2 text-[13px] text-[#94A3B8] font-semibold hover:text-[#64748B]">
                Skip
              </button>
            )}
          </div>
        )}

      </main>
      <Footer />
    </div>
  )
}

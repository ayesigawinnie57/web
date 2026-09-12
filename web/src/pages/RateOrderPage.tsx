import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Star, Truck, Bike, Smile, MessageSquare, Package, Headphones, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { ordersApi, hasAccessToken } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const AREAS = [
  { key: 'delivery_speed',      label: 'Delivery Speed',           icon: Truck },
  { key: 'delivery_experience', label: 'Delivery Experience',      icon: Bike },
  { key: 'delivery_person',     label: 'Delivery Person',          icon: Smile },
  { key: 'communication',       label: 'Communication & Updates',  icon: MessageSquare },
  { key: 'order_handling',      label: 'Order Handling',           icon: Package },
  { key: 'customer_service',    label: 'Customer Service',         icon: Headphones },
]

const OVERALL_LABELS: Record<number, string> = {
  1: 'Very Poor', 2: 'Poor', 3: 'Average', 4: 'Good', 5: 'Excellent',
}

function StarRow({ value, onChange, size = 32 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-2 mt-2">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange(i)} className="focus:outline-none">
          <Star size={size} className={i <= value ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#E2E8F0] fill-[#E2E8F0]'} />
        </button>
      ))}
    </div>
  )
}

export default function RateOrderPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [overall, setOverall] = useState(0)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [areaRatings, setAreaRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!hasAccessToken()) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Navbar />
        <div className="pt-24 flex flex-col items-center gap-4 px-4 text-center">
          <p className="text-[15px] text-[#475569]">Please log in to rate your order.</p>
          <Link to={`/login?next=/rate/${code}`} className="px-6 py-3 bg-[#1E3A8A] text-white rounded-xl text-[14px] font-bold">
            Log In
          </Link>
        </div>
      </div>
    )
  }

  const toggleArea = (key: string) => {
    setSelectedAreas(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const setAreaRating = (key: string, val: number) => {
    const updated = { ...areaRatings, [key]: val }
    setAreaRatings(updated)
    const allDone = selectedAreas.length > 0 && selectedAreas.every(k => (updated[k] ?? 0) > 0)
    if (allDone) setTimeout(() => setStep(4), 400)
  }

  // single-area selection: auto-advance from step 2 to step 3
  const handleToggleArea = (key: string) => {
    toggleArea(key)
    if (!selectedAreas.includes(key) && selectedAreas.length === 0) {
      setTimeout(() => setStep(3), 400)
    }
  }

  const pickOverall = (val: number) => {
    setOverall(val)
    setTimeout(() => setStep(2), 500)
  }

  const handleSubmit = async () => {
    if (!code) return
    setSubmitting(true)
    setError('')
    try {
      await ordersApi.rate(code, { overall, areas: selectedAreas, area_ratings: areaRatings, comment })
      setDone(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <Navbar />
        <div className="pt-24 flex flex-col items-center gap-4 px-4 text-center max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center">
            <CheckCircle size={40} className="text-[#16A34A]" />
          </div>
          <h2 className="text-[22px] font-extrabold text-[#071A2B]">Thank You!</h2>
          <p className="text-[14px] text-[#64748B] leading-relaxed">
            Your feedback helps Majo Gadgets improve our service and give you an even better shopping experience.
          </p>
          <button onClick={() => navigate('/')}
            className="mt-2 px-10 py-3 bg-[#16A34A] text-white rounded-xl text-[14px] font-bold hover:opacity-90">
            Done
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  const allAreaRated = selectedAreas.length > 0 && selectedAreas.every(k => (areaRatings[k] ?? 0) > 0)
  const TOTAL_STEPS = 4

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center hover:border-[#071A2B]">
            <ArrowLeft size={18} className="text-[#1E3A8A]" />
          </button>
          <h1 className="text-[16px] font-bold text-[#071A2B]">Rate Our Service</h1>
          <span className="text-[12px] text-[#94A3B8] font-semibold">{step} of {TOTAL_STEPS}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#E2E8F0] rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-[#16A34A] rounded-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5">

          {/* Step 1: Overall */}
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">How would you rate your Majo experience?</h2>
              <p className="text-[13px] text-[#64748B]">Your feedback helps us improve our service.</p>
              <StarRow value={overall} onChange={pickOverall} />
              {overall > 0 && <p className="text-[15px] font-bold text-[#F59E0B]">{OVERALL_LABELS[overall]}</p>}
            </div>
          )}

          {/* Step 2: Select areas */}
          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">What would you like to rate?</h2>
              <p className="text-[13px] text-[#64748B]">Select one or more areas of our service.</p>
              <div className="space-y-2">
                {AREAS.map(({ key, label, icon: Icon }) => {
                  const active = selectedAreas.includes(key)
                  return (
                    <button key={key} onClick={() => handleToggleArea(key)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors ${
                        active ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-[#E2E8F0] bg-white hover:border-[#94A3B8]'
                      }`}>
                      <Icon size={18} className={active ? 'text-[#16A34A]' : 'text-[#94A3B8]'} />
                      <span className={`flex-1 text-[14px] font-semibold ${active ? 'text-[#071A2B]' : 'text-[#64748B]'}`}>{label}</span>
                      {active && <CheckCircle size={16} className="text-[#16A34A] shrink-0" />}
                    </button>
                  )
                })}
              </div>
              {selectedAreas.length > 1 && (
                <button onClick={() => setStep(3)}
                  className="w-full py-3 bg-[#1E3A8A] text-white rounded-xl text-[14px] font-bold hover:opacity-90 mt-2">
                  Continue — {selectedAreas.length} selected
                </button>
              )}
            </div>
          )}

          {/* Step 3: Rate each area */}
          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">Rate each area</h2>
              <p className="text-[13px] text-[#64748B]">Tap the stars for each service area you selected.</p>
              <div className="space-y-3">
                {selectedAreas.map(key => {
                  const area = AREAS.find(a => a.key === key)!
                  const Icon = area.icon
                  return (
                    <div key={key} className="border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon size={15} className="text-[#94A3B8]" />
                        <span className="text-[13px] font-bold text-[#071A2B]">{area.label}</span>
                      </div>
                      <StarRow value={areaRatings[key] ?? 0} onChange={v => setAreaRating(key, v)} size={26} />
                    </div>
                  )
                })}
              </div>
              {allAreaRated && (
                <button onClick={() => setStep(4)}
                  className="w-full py-3 bg-[#1E3A8A] text-white rounded-xl text-[14px] font-bold hover:opacity-90 mt-2">
                  Continue
                </button>
              )}
            </div>
          )}

          {/* Step 4: Comment */}
          {step === 4 && (
            <div className="space-y-3">
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">Tell us more</h2>
              <p className="text-[13px] text-[#64748B]">What did we do well, or what could we improve?</p>
              <textarea
                rows={5}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience with Majo..."
                className="w-full border border-[#E2E8F0] rounded-xl p-4 text-[14px] text-[#071A2B] placeholder-[#94A3B8] resize-none focus:outline-none focus:border-[#1E3A8A]"
              />
              {error && <p className="text-[13px] text-red-500">{error}</p>}
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-3 bg-[#16A34A] text-white rounded-xl text-[14px] font-bold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Feedback'}
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-2 text-[13px] text-[#94A3B8] font-semibold hover:text-[#64748B]">
                Skip
              </button>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  )
}

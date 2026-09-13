import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, Star } from 'lucide-react'
import { useNotifications, type NotificationType } from '../lib/NotificationContext'
import { productsApi, toProduct, type Product } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const NUDGE: Record<NotificationType, string> = {
  welcome:        "You're all set. Thousands of people shop here every day — see what they're picking up.",
  promo:          "Deals like this don't last. Stock up before they're gone.",
  system:         "Everything's running smoothly. Take a look at what's new in the shop.",
  order:          "Keep exploring while we handle your order.",
  service_rating: "Your feedback helps us make every order feel more personal and more helpful next time.",
  product_rating: "Your honest product feedback helps other shoppers choose with confidence.",
}

function getOrderNudge(title: string) {
  const t = title.toLowerCase()
  if (t.includes('placed'))   return "Your order is in — now treat yourself to something else while you wait."
  if (t.includes('confirm'))  return "It's confirmed and being packed. Good time to pick up anything you missed."
  if (t.includes('ship'))     return "It's on the road. Why not get a head start on your next order?"
  if (t.includes('deliver'))  return "It arrived! Hope you love it. Ready to shop again?"
  if (t.includes('cancel'))   return "Order cancelled. No worries — there's plenty more waiting for you in the shop."
  return "Keep exploring while we handle your order."
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })
}

export default function NotificationDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { notifications, markRead, deleteNotification } = useNotifications()
  const [products, setProducts] = useState<Product[]>([])

  // slug format: "some-title-123" — extract id from the last segment
  const id = slug?.split('-').pop() ?? ''
  const n = notifications.find(x => x.id === id)

  useEffect(() => {
    if (n && !n.read) markRead(n.id)
  }, [n?.id])

  useEffect(() => {
    productsApi.list('page_size=6').then(({ data }) => {
      const all: any[] = Array.isArray(data) ? data : (data as any).results ?? []
      setProducts(all.slice(0, 6).map(toProduct))
    }).catch(() => {})
  }, [])

  const handleDelete = () => {
    if (n) deleteNotification(n.id)
    navigate('/notifications')
  }

  if (!n) return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 px-4 py-20 text-center">
        <p className="text-[14px] text-[#64748B]">Notification not found.</p>
        <Link to="/notifications" className="inline-block mt-4 text-[13px] font-bold text-[#1E3A8A]">← Go Back</Link>
      </main>
      <Footer />
    </div>
  )

  const isServiceRating = n.type === 'service_rating'
  const isProductRating = n.type === 'product_rating'
  const isRating = isServiceRating || isProductRating
  const [ratingBody, ratingTarget] = isRating ? n.body.split('|') : [n.body, '']
  const paragraphs = (isRating ? ratingBody : n.body).split('\n').filter(l => l.trim())

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 px-4 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/notifications')} className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center">
            <ArrowLeft size={18} color="#071A2B" />
          </button>
          <span className="text-[15px] font-bold text-[#071A2B]">Notification</span>
          <button onClick={handleDelete} className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <Trash2 size={16} color="#ef4444" />
          </button>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5">
          <p className="text-[16px] font-extrabold text-[#071A2B] leading-snug">{n.title}</p>
          <p className="text-[12px] text-[#94A3B8]">{formatDate(n.createdAt)}</p>
          <div className="border-t border-[#E2E8F0]" />

          <div className="space-y-2">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[14px] text-[#071A2B] leading-relaxed">{p}</p>
            ))}
          </div>

          {isServiceRating && ratingTarget && (
            <Link to={`/rate/${ratingTarget}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-400 text-white text-[14px] font-extrabold">
              <Star size={16} fill="#fff" color="#fff" /> Rate Your Experience
            </Link>
          )}
          {isProductRating && ratingTarget && (
            <Link to={`/product-review/${ratingTarget}`} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 text-white text-[14px] font-extrabold">
              <Star size={16} fill="#fff" color="#fff" /> Review This Product
            </Link>
          )}

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex items-center justify-between gap-4">
            <p className="text-[13px] text-[#64748B] leading-relaxed flex-1">
              {n.type === 'order' ? getOrderNudge(n.title) : NUDGE[n.type]}
            </p>
            <Link to="/shop" className="shrink-0 inline-block text-center bg-[#071A2B] text-white text-[13px] font-bold px-4 py-2 rounded-lg">
              See what's new
            </Link>
          </div>

          {products.length > 0 && (
            <div className="space-y-3">
              <p className="text-[13px] font-extrabold text-[#071A2B]">You might like</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {products.map(p => (
                  <Link key={p.id} to={`/shop/${p.slug}`} className="border border-[#E2E8F0] rounded-xl overflow-hidden hover:shadow-sm">
                    <div className="aspect-square overflow-hidden">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full" />}
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] font-bold text-[#071A2B] line-clamp-2 leading-tight">{p.name}</p>
                      <p className="text-[10px] font-extrabold text-[#22C55E] mt-1">UGX {p.price.toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

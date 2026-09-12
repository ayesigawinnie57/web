import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Package, Truck, MapPin, XCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'
import { ordersApi, hasAccessToken, type ApiOrderDetail } from '../lib/api'
import { pushNotification } from '../lib/NotificationContext'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const money = (v: string | number) => Number(v).toLocaleString()

type Status = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

const STEPS: { key: Status; label: string; icon: string }[] = [
  { key: 'pending',    label: 'Placed',     icon: '📋' },
  { key: 'processing', label: 'Confirmed',  icon: '⚙️'  },
  { key: 'shipped',    label: 'Shipped',    icon: '🚚' },
  { key: 'delivered',  label: 'Delivered',  icon: '✅' },
]
const STEP_ORDER: Status[] = ['pending', 'processing', 'shipped', 'delivered']

const STATUS_MESSAGES: Record<Status, { title: string; body: string }> = {
  processing: { title: 'Order Confirmed! ✅', body: 'Your order has been confirmed and is being prepared.' },
  shipped:    { title: 'Order Shipped! 🚚',   body: 'Your order is on its way to you.' },
  delivered:  { title: 'Order Delivered! 🎉', body: 'Your order has been delivered. Enjoy!' },
  cancelled:  { title: 'Order Cancelled ❌',  body: 'Your order has been cancelled.' },
  pending:    { title: '', body: '' },
}

function HorizontalProgress({ status }: { status: Status }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
        <XCircle size={22} className="text-red-500 shrink-0" />
        <div>
          <p className="text-[14px] font-bold text-red-700">Order Cancelled</p>
          <p className="text-[12px] text-red-500 mt-0.5">This order has been cancelled</p>
        </div>
      </div>
    )
  }

  const currentIdx = STEP_ORDER.indexOf(status)

  return (
    <div className="w-full">
      {/* connector line + circles row */}
      <div className="flex items-center w-full mb-2">
        {STEPS.map((step, idx) => {
          const done = idx <= currentIdx
          const active = idx === currentIdx
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* circle */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[16px] border-2 transition-all ${
                done
                  ? 'bg-[#1E3A8A] border-[#1E3A8A] shadow-md'
                  : 'bg-white border-[#E2E8F0]'
              } ${active ? 'ring-4 ring-blue-100' : ''}`}>
                {done
                  ? <span className="text-[14px]">{step.icon}</span>
                  : <span className="text-[14px] opacity-30">{step.icon}</span>
                }
              </div>
              {/* connector */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-1 rounded-full overflow-hidden bg-[#E2E8F0]">
                  <div className={`h-full rounded-full transition-all duration-500 ${idx < currentIdx ? 'bg-[#1E3A8A] w-full' : 'w-0'}`} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* labels row */}
      <div className="flex w-full">
        {STEPS.map((step, idx) => {
          const done = idx <= currentIdx
          const active = idx === currentIdx
          return (
            <div key={step.key} className="flex-1 last:flex-none text-center" style={{ minWidth: 0 }}>
              <p className={`text-[11px] font-bold truncate ${
                active ? 'text-[#1E3A8A]' : done ? 'text-[#334155]' : 'text-[#94A3B8]'
              }`}>{step.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<ApiOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const prevStatusRef = useRef<string | null>(null)

  const fetchOrder = async () => {
    if (!code) return
    try {
      const r = await ordersApi.get(code)
      const fresh = r.data
      setOrder(prev => {
        // detect status change and push notification
        if (prev && fresh.status !== prev.status) {
          const msg = STATUS_MESSAGES[fresh.status as Status]
          if (msg?.title) {
            pushNotification({ type: 'order', title: msg.title, body: msg.body, time: 'Just now' })
          }
        }
        return fresh
      })
    } catch {
      // silently ignore polling errors
    }
  }

  useEffect(() => {
    if (!hasAccessToken()) { navigate('/login'); return }
    if (!code) return

    ordersApi.get(code)
      .then(r => { setOrder(r.data); prevStatusRef.current = r.data.status })
      .catch(() => setError('Order not found.'))
      .finally(() => setLoading(false))

    // Poll every 15 seconds to pick up admin status changes
    const interval = setInterval(fetchOrder, 15000)
    return () => clearInterval(interval)
  }, [code])

  const handleCancel = async () => {
    if (!order) return
    setCancelling(true)
    try {
      const r = await ordersApi.cancel(order.code)
      setOrder(r.data)
      setConfirmCancel(false)
      pushNotification({
        type: 'order',
        title: `Order #${order.code} Cancelled`,
        body: 'Your order has been cancelled successfully.',
        time: 'Just now',
      })
    } catch {
      setError('Failed to cancel order.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="pt-20 flex justify-center items-center gap-2 text-[13px] text-[#64748B]">
        <Loader2 size={16} className="animate-spin" /> Loading order...
      </div>
    </>
  )

  if (error || !order) return (
    <>
      <Navbar />
      <div className="pt-20 text-center">
        <p className="text-[14px] text-red-500 mb-4">{error || 'Order not found.'}</p>
        <Link to="/orders" className="text-[13px] font-bold text-[#1E3A8A]">← Back to orders</Link>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Link to="/orders" className="text-[12px] font-bold text-[#1E3A8A] hover:underline">← My Orders</Link>
            <h1 className="text-2xl font-extrabold text-[#071A2B] mt-1">Order #{order.code}</h1>
            <p className="text-[12px] text-[#94A3B8] mt-0.5">
              Placed on {new Date(order.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {order.status === 'pending' && (
            <button onClick={() => setConfirmCancel(true)}
              className="shrink-0 text-[12px] font-bold text-red-500 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors">
              Cancel Order
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-5">

            {/* Status progress */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Order Status</p>
                <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]">
                  <Clock size={11} /> Auto-refreshes
                </div>
              </div>
              <HorizontalProgress status={order.status as Status} />
              {order.status === 'cancelled' && order.cancel_reason && (
                <div className="mt-4 p-3 bg-red-50 rounded-xl">
                  <p className="text-[12px] font-bold text-red-700">Reason</p>
                  <p className="text-[12px] text-red-600 mt-0.5">{order.cancel_reason}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8] mb-4">
                Items ({order.items.length})
              </p>
              <div className="space-y-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] shrink-0 overflow-hidden">
                      {item.product?.image && <img src={item.product.image} alt="" className="w-full h-full object-contain" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#071A2B] truncate">{item.product?.name}</p>
                      <p className="text-[12px] text-[#64748B] mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-[13px] font-bold text-[#1E3A8A] shrink-0">
                      UGX {money(Number(item.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8] mb-4">Order Summary</p>
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between text-[#64748B]"><span>Subtotal</span><span>UGX {money(order.subtotal)}</span></div>
                <div className="flex justify-between text-[#64748B]"><span>Delivery</span><span>UGX {money(order.delivery_fee)}</span></div>
                <div className="flex justify-between pt-3 border-t border-[#F1F5F9] font-extrabold text-[#071A2B]">
                  <span>Total</span>
                  <span className="text-[#1E3A8A]">UGX {money(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-[#1E3A8A] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Delivery Address</p>
                  <p className="text-[13px] text-[#334155] mt-1">{order.delivery_address || '—'}</p>
                </div>
              </div>
              {order.phone && (
                <div className="flex items-start gap-3">
                  <Package size={16} className="text-[#1E3A8A] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Phone</p>
                    <p className="text-[13px] text-[#334155] mt-1">{order.phone}</p>
                  </div>
                </div>
              )}
              {order.note && (
                <div className="flex items-start gap-3">
                  <Truck size={16} className="text-[#1E3A8A] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Note</p>
                    <p className="text-[13px] text-[#334155] mt-1">{order.note}</p>
                  </div>
                </div>
              )}
            </div>

            {order.status === 'delivered' && !order.has_service_rating && (
              <Link to={`/rate/${order.code}`}
                className="block text-center bg-[#1E3A8A] text-white py-3 rounded-xl text-[13px] font-bold hover:opacity-90 transition-opacity">
                Rate This Order ⭐
              </Link>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {confirmCancel && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmCancel(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">
            <p className="text-[16px] font-extrabold text-[#071A2B] mb-2">Cancel Order?</p>
            <p className="text-[13px] text-[#64748B] mb-6">Are you sure you want to cancel order <strong>#{order.code}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancel(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-bold text-[#64748B] hover:border-[#071A2B]">
                Keep Order
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60">
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

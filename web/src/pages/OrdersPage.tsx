import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { ordersApi, hasAccessToken, type ApiOrderDetail } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  processing: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const money = (v: string | number) => Number(v).toLocaleString()

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ApiOrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasAccessToken()) { navigate('/login'); return }
    ordersApi.list()
      .then(r => setOrders(Array.isArray(r.data) ? r.data : (r.data as any).results ?? []))
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">My Account</p>
          <h1 className="text-2xl font-extrabold text-[#071A2B] mt-1">My Orders</h1>
        </div>

        {loading && <p className="text-[13px] text-[#64748B]">Loading orders...</p>}
        {error && <p className="text-[13px] text-red-500">{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-[#CBD5E1] mb-4" />
            <p className="text-[15px] font-bold text-[#071A2B]">No orders yet</p>
            <p className="text-[13px] text-[#64748B] mt-1">Your orders will appear here once you place one.</p>
            <Link to="/shop" className="inline-block mt-6 bg-[#1E3A8A] text-white px-6 py-3 rounded-xl text-[13px] font-bold">
              Start Shopping
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/orders/${order.code}`}
              className="block bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:border-[#1E3A8A] transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[13px] font-extrabold text-[#071A2B]">#{order.code}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${STATUS_STYLES[order.status] ?? ''}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {order.items.slice(0, 3).map(item => (
                  <div key={item.id} className="w-10 h-10 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] overflow-hidden shrink-0">
                    {item.product?.image && <img src={item.product.image} alt="" className="w-full h-full object-contain" />}
                  </div>
                ))}
                {order.items.length > 3 && (
                  <span className="text-[11px] text-[#64748B]">+{order.items.length - 3} more</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                <span className="text-[12px] text-[#64748B]">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                <span className="text-[14px] font-extrabold text-[#1E3A8A]">UGX {money(order.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}

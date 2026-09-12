import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RotateCcw, Package } from 'lucide-react'
import { ordersApi, hasAccessToken, type ApiOrderDetail, type ReturnRequest } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const money = (v: string | number) => Number(v).toLocaleString()

const RETURN_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
}

export default function ReturnPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ApiOrderDetail[]>([])
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [reason, setReason] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasAccessToken()) { navigate('/login'); return }
    Promise.all([ordersApi.list(), ordersApi.listReturns()])
      .then(([ordersRes, returnsRes]) => {
        const all = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data as any).results ?? []
        setOrders(all.filter((o: ApiOrderDetail) => o.status === 'delivered'))
        setReturns(Array.isArray(returnsRes.data) ? returnsRes.data : [])
      })
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false))
  }, [])

  const getReturn = (code: string) => returns.find(r => r.order_code === code)

  const handleSubmit = async (code: string) => {
    const r = reason[code]?.trim()
    if (!r) return
    setSubmitting(code)
    try {
      const res = await ordersApi.submitReturn(code, r)
      setReturns(prev => [...prev, res.data])
      setReason(prev => ({ ...prev, [code]: '' }))
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to submit return request.')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">My Account</p>
          <h1 className="text-2xl font-extrabold text-[#071A2B] mt-1">Returns</h1>
          <p className="text-[13px] text-[#64748B] mt-1">Request a return for delivered orders.</p>
        </div>

        {error && <p className="text-[13px] text-red-500 mb-4">{error}</p>}
        {loading && <p className="text-[13px] text-[#64748B]">Loading...</p>}

        {!loading && orders.length === 0 && (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-[#CBD5E1] mb-4" />
            <p className="text-[15px] font-bold text-[#071A2B]">No delivered orders</p>
            <p className="text-[13px] text-[#64748B] mt-1">Only delivered orders are eligible for returns.</p>
            <Link to="/orders" className="inline-block mt-6 bg-[#1E3A8A] text-white px-6 py-3 rounded-xl text-[13px] font-bold">
              View Orders
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {orders.map(order => {
            const ret = getReturn(order.code)
            return (
              <div key={order.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <Link to={`/orders/${order.code}`} className="text-[13px] font-extrabold text-[#071A2B] hover:underline">
                      #{order.code}
                    </Link>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-[14px] font-extrabold text-[#1E3A8A]">UGX {money(order.total)}</span>
                </div>

                {ret ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={13} className="text-[#64748B]" />
                      <span className="text-[12px] text-[#64748B]">Return request submitted</span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${RETURN_STATUS_STYLES[ret.status]}`}>
                        {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#64748B] pl-5">Reason: {ret.reason}</p>
                    {ret.admin_note && (
                      <p className="text-[12px] text-[#334155] pl-5 font-medium">Admin note: {ret.admin_note}</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Reason for return (e.g. wrong item, damaged)..."
                      value={reason[order.code] ?? ''}
                      onChange={e => setReason(prev => ({ ...prev, [order.code]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#1E3A8A] resize-none"
                    />
                    <button
                      onClick={() => handleSubmit(order.code)}
                      disabled={submitting === order.code || !reason[order.code]?.trim()}
                      className="flex items-center gap-2 bg-[#1E3A8A] text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      <RotateCcw size={13} />
                      {submitting === order.code ? 'Submitting...' : 'Request Return'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
      <Footer />
    </div>
  )
}

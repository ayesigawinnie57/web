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
  }, [navigate])

  const getReturn = (code: string) => returns.find(r => r.order_code === code)

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="w-full max-w-6xl mx-auto px-4 py-8 pt-14 lg:px-8 lg:pt-16">
        <div className="mb-6 rounded-[28px] border border-[#E2E8F0] bg-white p-5 shadow-sm md:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">My Account</p>
          <h1 className="text-2xl font-extrabold text-[#071A2B] mt-1 md:text-3xl">Returns & refunds</h1>
          <p className="text-[13px] text-[#64748B] mt-2 md:text-[14px]">You can request a return for eligible orders that meet our return conditions below.</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              'The item was delivered and is in acceptable condition.',
              'The return request is made within the return window for the product.',
              'The item is unused, unopened, or has a valid issue such as damage or wrong item.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-[12px] leading-6 text-[#334155] md:text-[13px]">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#475569]">Who is eligible?</p>
              <p className="text-[12px] text-[#64748B]">Only delivered orders may be returned. Ineligible items cannot be processed.</p>
            </div>
            <a href="#current-return-requests" className="inline-flex items-center justify-center rounded-xl border border-[#1E3A8A] bg-[#EFF6FF] px-4 py-2.5 text-[12px] font-bold text-[#1E3A8A]">
              View current return requests
            </a>
          </div>
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

        <div id="current-return-requests" className="space-y-4">
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
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[12px] text-[#64748B]">Eligible for return.</p>
                    <Link
                      to={`/returns/request/${order.code}`}
                      className="inline-flex items-center justify-center rounded-xl bg-[#1E3A8A] px-4 py-2 text-[12px] font-bold text-white"
                    >
                      Request return
                    </Link>
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

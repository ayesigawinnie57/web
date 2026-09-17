import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { RotateCcw, ArrowLeft } from 'lucide-react'
import { ordersApi, hasAccessToken, type ApiOrderDetail, type ReturnRequest } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const money = (v: string | number) => Number(v).toLocaleString()

export default function RequestReturnPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<ApiOrderDetail | null>(null)
  const [existingReturn, setExistingReturn] = useState<ReturnRequest | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hasAccessToken()) {
      navigate('/login')
      return
    }

    if (!code) {
      navigate('/returns')
      return
    }

    Promise.all([ordersApi.list(), ordersApi.listReturns()])
      .then(([ordersRes, returnsRes]) => {
        const all = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data as any).results ?? []
        const found = all.find((o: ApiOrderDetail) => o.code === code && o.status === 'delivered')

        if (!found) {
          navigate('/returns')
          return
        }

        setOrder(found)
        const returnFound = Array.isArray(returnsRes.data)
          ? returnsRes.data.find((item: ReturnRequest) => item.order_code === code) ?? null
          : null
        setExistingReturn(returnFound)
      })
      .catch(() => setError('Failed to load this order.'))
      .finally(() => setLoading(false))
  }, [code, navigate])

  const handleSubmit = async () => {
    if (!code || !reason.trim() || !order) return

    setSubmitting(true)
    setError('')

    try {
      const res = await ordersApi.submitReturn(code, reason.trim())
      setExistingReturn(res.data)
      setReason('')
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to submit return request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="w-full max-w-4xl mx-auto px-4 py-8 pt-14 lg:px-8 lg:pt-16">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link to="/returns" className="inline-flex items-center gap-2 text-[12px] font-bold text-[#1E3A8A]">
            <ArrowLeft size={14} />
            Back to returns
          </Link>
        </div>

        {error && <p className="mb-4 text-[13px] text-red-500">{error}</p>}

        {loading ? (
          <p className="text-[13px] text-[#64748B]">Loading...</p>
        ) : !order ? (
          <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 text-center">
            <p className="text-[15px] font-bold text-[#071A2B]">This order is not available for return.</p>
            <Link to="/returns" className="mt-4 inline-block rounded-xl bg-[#1E3A8A] px-5 py-3 text-[12px] font-bold text-white">
              Return to eligibility page
            </Link>
          </div>
        ) : existingReturn ? (
          <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Return status</p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#071A2B]">Return request sent</h1>
            <p className="mt-2 text-[13px] text-[#64748B]">Your return request for order #{order.code} has already been submitted.</p>

            <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-[#475569]">Status</span>
                <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[11px] font-bold text-yellow-700">
                  {existingReturn.status.charAt(0).toUpperCase() + existingReturn.status.slice(1)}
                </span>
              </div>
              <p className="mt-3 text-[12px] text-[#64748B]">Reason: {existingReturn.reason}</p>
              {existingReturn.admin_note && (
                <p className="mt-2 text-[12px] text-[#334155]">Admin note: {existingReturn.admin_note}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-5 md:p-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Request return</p>
            <h1 className="mt-2 text-2xl font-extrabold text-[#071A2B]">Order #{order.code}</h1>

            <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-[#475569]">Total</span>
                <span className="text-[14px] font-extrabold text-[#1E3A8A]">UGX {money(order.total)}</span>
              </div>
              <p className="mt-2 text-[12px] text-[#64748B]">Only delivered orders can be requested for return. Please explain the issue clearly.</p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-[12px] font-bold text-[#334155]">Reason for return</label>
              <textarea
                rows={5}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe the issue, such as damaged item, wrong item, or product not as expected..."
                className="w-full resize-none rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 text-[13px] text-[#071A2B] outline-none transition focus:border-[#1E3A8A]"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !reason.trim()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-5 py-3 text-[12px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={14} />
              {submitting ? 'Submitting...' : 'Request return'}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

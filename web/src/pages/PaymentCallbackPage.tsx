import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { ordersApi } from '../lib/api'
import Navbar from '../landing/Navbar'

type State = 'loading' | 'success' | 'failed' | 'pending'

export default function PaymentCallbackPage() {
  const [params] = useSearchParams()
  const orderCode = params.get('OrderMerchantReference') ?? ''
  const [state, setState] = useState<State>('loading')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    // If loaded inside Pesapal's iframe, break out to top-level
    if (window.self !== window.top) {
      window.top!.location.href = window.location.href
      return
    }
    if (!orderCode) { setState('failed'); return }

    let attempts = 0
    let timer: number | undefined
    let cancelled = false
    const check = async () => {
      try {
        const payment = await ordersApi.refreshPayment(orderCode)
        if (cancelled) return
        const paymentStatus = payment.data.status
        if (paymentStatus === 'completed') {
          setState('success')
          return
        }
        if (
          paymentStatus === 'failed'
          || paymentStatus === 'invalid'
          || paymentStatus === 'cancelled'
          || payment.data.order_status === 'cancelled'
        ) {
          setState('failed')
          return
        }
      } catch {
        // A temporary API error should not be shown as a failed payment.
      }
      if (cancelled) return
      attempts++
      if (attempts >= 10) setState('pending')
      timer = window.setTimeout(check, attempts < 10 ? 2000 : 8000)
    }
    check()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [orderCode, refreshKey])

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-md mx-auto px-4 py-20 text-center">
        {state === 'loading' && (
          <>
            <Loader2 size={52} className="mx-auto text-[#1E3A8A] animate-spin mb-6" />
            <p className="text-[18px] font-extrabold text-[#071A2B]">Confirming your payment...</p>
            <p className="text-[13px] text-[#64748B] mt-2">Please wait, do not close this page.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle size={64} className="mx-auto text-green-500 mb-6" />
            <p className="text-[22px] font-extrabold text-[#071A2B]">Payment Received!</p>
            <p className="text-[13px] text-[#64748B] mt-2 mb-8">
              Your payment for order <strong>#{orderCode}</strong> has been processed.
            </p>
            <Link
              to={`/orders/${orderCode}`}
              className="inline-block bg-[#1E3A8A] text-white px-8 py-3 rounded-xl text-[14px] font-bold hover:opacity-90"
            >
              View Order
            </Link>
          </>
        )}

        {state === 'pending' && (
          <>
            <Loader2 size={52} className="mx-auto text-yellow-500 animate-spin mb-6" />
            <p className="text-[22px] font-extrabold text-[#071A2B]">Payment Pending</p>
            <p className="text-[13px] text-[#64748B] mt-2 mb-8">
              Pesapal is still confirming your payment. This page will update automatically when confirmation arrives.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => { setState('loading'); setRefreshKey(key => key + 1) }}
                className="bg-[#1E3A8A] text-white px-8 py-3 rounded-xl text-[14px] font-bold hover:opacity-90"
              >
                Check payment now
              </button>
              <Link to={`/orders/${orderCode}`} className="border border-[#E2E8F0] text-[#071A2B] px-8 py-3 rounded-xl text-[14px] font-bold hover:bg-white">
                View Order
              </Link>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle size={64} className="mx-auto text-red-500 mb-6" />
            <p className="text-[22px] font-extrabold text-[#071A2B]">Payment Unsuccessful</p>
            <p className="text-[13px] text-[#64748B] mt-2 mb-8">
              Something went wrong. Your order has not been charged.
              {orderCode && <> You can retry from <strong>Order #{orderCode}</strong>.</>}
            </p>
            <div className="flex gap-3 justify-center">
              {orderCode && (
                <Link
                  to={`/orders/${orderCode}`}
                  className="bg-[#1E3A8A] text-white px-6 py-3 rounded-xl text-[13px] font-bold hover:opacity-90"
                >
                  Retry Payment
                </Link>
              )}
              <Link
                to="/orders"
                className="border border-[#E2E8F0] text-[#071A2B] px-6 py-3 rounded-xl text-[13px] font-bold hover:bg-[#F8FAFC]"
              >
                My Orders
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

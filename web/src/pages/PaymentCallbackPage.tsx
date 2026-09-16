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

  useEffect(() => {
    if (!orderCode) { setState('failed'); return }

    // Poll up to 8 times (every 2s = 16s max) waiting for IPN to update status
    let attempts = 0
    const check = async () => {
      try {
        await ordersApi.get(orderCode)
        setState('success')
      } catch {
        attempts++
        if (attempts < 8) setTimeout(check, 2000)
        else setState('failed')
      }
    }
    check()
  }, [orderCode])

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

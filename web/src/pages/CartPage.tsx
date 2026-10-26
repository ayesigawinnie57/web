import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { cartApi, hasAccessToken, productsApi, type CartItem } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const money = (value: string) => Number(value).toLocaleString()

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [deliveryFees, setDeliveryFees] = useState<Record<number, number>>({})
  const reminderReadyRef = useRef(false)
  const reminderSentRef = useRef(false)
  const skipReminderRef = useRef(false)

  const sendReminder = useCallback(() => {
    if (!reminderReadyRef.current || reminderSentRef.current || skipReminderRef.current) return
    reminderSentRef.current = true
    void cartApi.sendAbandonedReminder()
  }, [])

  const loadCart = () => {
    cartApi.list()
      .then(async data => {
        setItems(data)
        setError(false)
        const fees = await Promise.all(data.map(async item => {
          try {
            const response = await productsApi.bySlug(item.product_slug)
            return [item.product_id, Number(response.data.delivery_fee ?? 0)] as const
          } catch {
            return [item.product_id, 0] as const
          }
        }))
        setDeliveryFees(Object.fromEntries(fees))
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCart() }, [])

  useEffect(() => {
    reminderReadyRef.current = !loading && !error && items.length > 0 && hasAccessToken()
    if (!reminderReadyRef.current) return

    let timeout = window.setTimeout(sendReminder, 60_000)
    const resetInactivityTimer = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(sendReminder, 60_000)
    }
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(event => window.addEventListener(event, resetInactivityTimer, { passive: true }))

    return () => {
      window.clearTimeout(timeout)
      activityEvents.forEach(event => window.removeEventListener(event, resetInactivityTimer))
    }
  }, [error, items.length, loading, sendReminder])

  useEffect(() => {
    const handlePageExit = () => sendReminder()
    window.addEventListener('pagehide', handlePageExit)
    window.addEventListener('beforeunload', handlePageExit)

    return () => {
      window.removeEventListener('pagehide', handlePageExit)
      window.removeEventListener('beforeunload', handlePageExit)
      sendReminder()
    }
  }, [sendReminder])

  const updateQuantity = async (item: CartItem, quantity: number) => {
    if (quantity < 1) return removeItem(item.product_id)
    const previous = items
    setItems(current => current.map(existing => existing.product_id === item.product_id ? { ...existing, quantity } : existing))
    try {
      await cartApi.update(item.product_id, quantity)
    } catch {
      setItems(previous)
    }
  }

  const removeItem = async (productId: number) => {
    const previous = items
    setItems(current => current.filter(item => item.product_id !== productId))
    try {
      await cartApi.remove(productId)
    } catch {
      setItems(previous)
    }
  }

  const subtotal = items.reduce((total, item) => total + Number(item.product_price) * item.quantity, 0)
  const delivery = hasAccessToken()
    ? items.reduce((total, item) => total + (deliveryFees[item.product_id] ?? 0), 0)
    : null
  const total = subtotal + (delivery ?? 0)

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Your order</p>
            <h1 className="text-3xl font-extrabold text-[#071A2B] mt-1">Shopping cart</h1>
          </div>
          <Link to="/shop" className="text-[13px] font-bold text-[#1E3A8A]">Continue shopping</Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#64748B]">Loading your cart...</div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-bold text-[#071A2B]">Sign in to view your cart</p>
            <p className="text-[13px] text-[#64748B] mt-2">Your cart is connected to your Majo Gadgets account.</p>
            <Link to="/" className="inline-block mt-5 bg-[#1E3A8A] text-white px-5 py-2.5 rounded-xl text-[13px] font-bold">Continue shopping</Link>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-bold text-[#071A2B]">Your cart is empty</p>
            <p className="text-[13px] text-[#64748B] mt-2">Add products to see them here.</p>
            <Link to="/shop" className="inline-block mt-5 bg-[#1E3A8A] text-white px-5 py-2.5 rounded-xl text-[13px] font-bold">Browse products</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div className="flex flex-col divide-y divide-[#E2E8F0]">
              {items.map(item => (
                <article key={item.id} className="flex items-center gap-4 py-5 first:pt-0">
                  <Link to={`/shop/${item.product_slug}`} className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-white overflow-hidden">
                    {item.product_image ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                  </Link>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A]">{item.product_category}</p>
                      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1">
                        <Link to={`/shop/${item.product_slug}`} title={item.product_name} className="max-w-[180px] sm:max-w-[280px] text-[15px] font-extrabold text-[#071A2B] whitespace-nowrap overflow-hidden text-ellipsis">{item.product_name}</Link>
                        <span className="text-[14px] font-bold text-[#1E3A8A]">UGX {money(item.product_price)}</span>
                        <span className="text-[12px] text-[#64748B]">Delivery: <span className="font-bold text-[#071A2B]">{hasAccessToken() ? (deliveryFees[item.product_id] ? `UGX ${deliveryFees[item.product_id].toLocaleString()}` : 'Free') : 'Not determined'}</span></span>
                        {!hasAccessToken() && <Link to="/login" className="text-[12px] font-bold text-[#1E3A8A] hover:text-blue-700">Sign in</Link>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center border border-[#E2E8F0] bg-white">
                        <button onClick={() => updateQuantity(item, item.quantity - 1)} className="w-8 h-8 text-[#071A2B]">-</button>
                        <span className="w-8 text-center text-[13px] font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item, item.quantity + 1)} className="w-8 h-8 text-[#071A2B]">+</button>
                      </div>
                      <button onClick={() => removeItem(item.product_id)} aria-label={`Delete ${item.product_name}`} title="Delete item" className="p-1 text-red-500 hover:text-red-700 transition-colors">
                        <Trash2 className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="bg-white p-5 border border-[#E2E8F0]">
              <h2 className="text-[18px] font-extrabold text-[#071A2B]">Cart summary</h2>
              <div className="flex justify-between text-[13px] text-[#64748B] mt-5"><span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between items-center gap-3 text-[13px] text-[#64748B] mt-3">
                <span>Delivery</span>
                <span className="font-bold text-right text-[#071A2B]">
                  {delivery === null ? (
                    <><span>Not yet determined</span> <Link to="/login" className="text-[#1E3A8A] hover:text-blue-700">Sign in</Link></>
                  ) : delivery > 0 ? `UGX ${delivery.toLocaleString()}` : <span className="text-green-600">Free</span>}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 border-t border-[#E2E8F0] mt-5 pt-5"><span className="text-[15px] font-extrabold text-[#071A2B]">Total</span><span className="text-[16px] font-extrabold text-[#1E3A8A] text-right">{delivery === null ? <>UGX {subtotal.toLocaleString()} <span className="text-[12px] font-bold text-[#64748B]">+ delivery fee</span></> : `UGX ${total.toLocaleString()}`}</span></div>
              <Link to="/checkout" onClick={() => { skipReminderRef.current = true }} className="w-full h-11 mt-6 bg-[#1E3A8A] text-white rounded-xl text-[14px] font-bold flex items-center justify-center">Proceed to checkout</Link>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

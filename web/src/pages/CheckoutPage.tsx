import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, ChevronDown, CreditCard, MapPin, PackageCheck, Pencil, ShieldCheck, Truck } from 'lucide-react'
import { authApi, BASE_URL, cartApi, hasAccessToken, ordersApi, type ApiOrder, type CartItem } from '../lib/api'
import { useNotifications } from '../lib/NotificationContext'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const REGIONS = [
  { value: 'Central Region', label: 'Central Uganda' },
  { value: 'Eastern Region', label: 'Eastern Uganda' },
  { value: 'Northern Region', label: 'Northern Uganda' },
  { value: 'Western Region', label: 'Western Uganda' },
] as const

const money = (value: string | number) => Number(value).toLocaleString()

type District = { id: number; name: string; price: string; region: string }
type DeliveryForm = { region: string; district: string; village: string; note: string }

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [profile, setProfile] = useState<{ name: string; phone: string } | null>(null)
  const [form, setForm] = useState<DeliveryForm>({ region: '', district: '', village: '', note: '' })
  const [editingDelivery, setEditingDelivery] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [error, setError] = useState('')
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const { refresh: refreshNotifications } = useNotifications()

  useEffect(() => {
    const cached = (() => { try { return JSON.parse(localStorage.getItem('majo_user') ?? 'null') } catch { return null } })()

    Promise.all([
      cartApi.list(),
      fetch(`${BASE_URL}/api/settings/districts/`)
        .then(r => r.ok ? r.json() : [])
        .then(d => Array.isArray(d) ? d : (d.results ?? [])),
      hasAccessToken() ? authApi.profile().then(r => r.data) : Promise.resolve(null),
    ]).then(([cartItems, districtList, profileData]) => {
      setItems(cartItems)
      setDistricts(districtList)

      // Merge: backend profile takes priority, fallback to localStorage cache
      const name = profileData?.name ?? cached?.name ?? ''
      const phone = profileData?.phone ?? cached?.phone ?? ''
      const region = profileData?.region ?? cached?.region ?? ''
      const district = profileData?.district ?? cached?.district ?? ''
      const village = profileData?.village ?? cached?.village ?? ''

      setProfile({ name, phone })
      setForm({ region, district, village, note: '' })

      // Persist fresh profile data to localStorage
      if (profileData) {
        localStorage.setItem('majo_user', JSON.stringify({
          ...cached,
          name: profileData.name,
          phone: profileData.phone,
          region: profileData.region,
          district: profileData.district,
          village: profileData.village,
        }))
      }
    }).catch(() => setError('Unable to load checkout data.'))
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof DeliveryForm, value: string) => setForm(f => ({ ...f, [key]: value }))
  const subtotal = items.reduce((t, i) => t + Number(i.product_price) * i.quantity, 0)
  const regionDistricts = useMemo(() => districts.filter(d => d.region === form.region), [districts, form.region])
  const selectedDistrict = useMemo(() => regionDistricts.find(d => d.name === form.district), [regionDistricts, form.district])
  const districtFee = Number(selectedDistrict?.price ?? 0)

  const handleRegionChange = (value: string) => { set('region', value); set('district', '') }

  const handlePay = async (code: string) => {
    setPaying(true)
    setPayError('')
    try {
      const { data } = await ordersApi.pay(code)
      window.location.href = data.redirect_url
    } catch (e: any) {
      setPayError(e?.response?.data?.detail ?? 'Payment initiation failed. Please try again.')
      setPaying(false)
    }
  }

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!hasAccessToken()) { setError('Please sign in before placing your order.'); return }
    if (!items.length) { setError('Your cart is empty.'); return }
    if (!form.region || !form.district) { setError('Please select your region and district.'); return }

    setPlacing(true)
    try {
      const response = await ordersApi.create({
        delivery_address: [form.region, form.district, form.village].filter(Boolean).join(', ') || 'Uganda',
        phone: profile?.phone ?? '',
        note: form.note.trim(),
        guest_name: profile?.name ?? '',
        delivery_fee: districtFee,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      })
      setOrder(response.data)
      refreshNotifications()
      await Promise.all(items.map(i => cartApi.remove(i.product_id)))
    } catch (err: any) {
      const d = err?.response?.data
      setError(d?.detail ?? d?.non_field_errors?.[0] ?? 'Failed to place order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="pt-16 py-24 text-center text-[#64748B]">Loading checkout...</div>
    </>
  )

  if (order) return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-xl mx-auto px-4 py-16 text-center">
        <CheckCircle className="mx-auto text-green-600" size={64} />
        <h1 className="text-3xl font-extrabold text-[#071A2B] mt-5">Order placed!</h1>
        <p className="text-[13px] text-[#64748B] mt-2">Your order has been received and is being processed.</p>
        <div className="mt-7 py-4 border-y border-[#E2E8F0] flex justify-between text-[14px]">
          <span>Order No.</span><strong>{order.code}</strong>
        </div>
        <div className="mt-5 space-y-3 text-[13px] text-[#64748B]">
          <div className="flex justify-between"><span>Subtotal</span><span>UGX {money(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Delivery fee</span><span>UGX {money(order.delivery_fee)}</span></div>
          <div className="flex justify-between pt-4 border-t border-[#E2E8F0] text-[16px] font-extrabold text-[#071A2B]">
            <span>Total</span><span className="text-[#1E3A8A]">UGX {money(order.total)}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-7 text-[13px] text-green-700">
          <Truck size={17} /> Expected delivery after 3 days
        </div>
        {payError && <p className="mt-4 text-[13px] text-red-500 font-semibold">{payError}</p>}
        <button
          onClick={() => handlePay(order.code)}
          disabled={paying}
          className="w-full mt-6 h-12 bg-[#1E3A8A] text-white rounded-xl text-[14px] font-bold disabled:opacity-60 hover:opacity-90"
        >
          {paying ? 'Redirecting to payment...' : '💳 Pay Now — UGX ' + money(order.total)}
        </button>
        <div className="flex gap-3 justify-center mt-3">
          <Link to={`/orders/${order.code}`} className="border border-[#E2E8F0] text-[#071A2B] px-6 py-3 rounded-xl text-[13px] font-bold">Track Order</Link>
          <Link to="/" className="border border-[#E2E8F0] text-[#071A2B] px-6 py-3 rounded-xl text-[13px] font-bold">Back to home</Link>
        </div>
      </main>
      <Footer />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Complete your order</p>
            <h1 className="text-3xl font-extrabold text-[#071A2B] mt-1">Checkout</h1>
          </div>
          <Link to="/cart" className="text-[13px] font-bold text-[#1E3A8A]">Back to cart</Link>
        </div>

        {error && <div className="mb-6 p-4 border border-red-100 bg-red-50 text-[13px] font-semibold text-red-600">{error}</div>}

        {!hasAccessToken() && (
          <div className="mb-8 bg-white border border-[#E2E8F0] p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={24} className="text-[#1E3A8A]" />
            </div>
            <h2 className="text-[18px] font-extrabold text-[#071A2B]">Sign in to continue</h2>
            <p className="text-[13px] text-[#64748B] mt-1 mb-5">Sign in to place your order and track it easily.</p>
            <Link to="/login" state={{ from: '/checkout' }}
              className="inline-block bg-[#1E3A8A] text-white px-8 py-3 rounded-xl text-[14px] font-bold">
              Sign in
            </Link>
            <p className="text-[12px] text-[#94A3B8] mt-4">
              No account?{' '}
              <Link to="/register" state={{ from: '/checkout' }} className="text-[#1E3A8A] font-bold hover:underline">Create one free</Link>
            </p>
          </div>
        )}

        <form onSubmit={placeOrder} className={`grid lg:grid-cols-[1fr_320px] gap-6 items-start ${!hasAccessToken() ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          {/* Payment sidebar — shown first on mobile */}
          <aside className="bg-white border border-[#E2E8F0] p-5 lg:hidden">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-[#1E3A8A]" />
              <h2 className="text-[17px] font-extrabold text-[#071A2B]">Payment</h2>
            </div>
            <p className="text-[12px] text-[#64748B] mt-2">Pay via MTN, Airtel or card.</p>
            <div className="flex justify-between mt-4 text-[13px] text-[#64748B]"><span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between mt-2 text-[13px] text-[#64748B]">
              <span>Delivery</span>
              <span className="font-bold text-[#071A2B]">{selectedDistrict ? `UGX ${money(districtFee)}` : 'Select district'}</span>
            </div>
            <button type="submit" disabled={placing || !items.length || !hasAccessToken()}
              className="w-full h-11 mt-4 bg-[#1E3A8A] text-white text-[13px] font-bold disabled:opacity-40">
              {placing ? 'Placing order...' : 'Place Order'}
            </button>
          </aside>
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="text-[#1E3A8A]" size={19} />
                <div>
                  <h2 className="text-[17px] font-extrabold text-[#071A2B]">Delivery details</h2>
                  <p className="text-[12px] text-[#64748B]">Where should we deliver your order?</p>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] divide-y divide-[#E2E8F0]">

                {/* Name — read only */}
                <ReadOnlyField label="Full Name" value={profile?.name ?? ''} />

                {/* Phone — read only */}
                <ReadOnlyField label="Phone Number" value={profile?.phone ?? ''} hint={
                  <Link to="/account" className="text-[11px] text-[#1E3A8A] font-bold hover:underline">Edit in account</Link>
                } />

                {/* Country — always Uganda */}
                <div className="p-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Country</label>
                  <div className="mt-2 px-3 py-2.5 bg-[#F8FAFC] text-[13px] text-[#64748B]">Uganda</div>
                </div>

                {/* Delivery location — editable */}
                {!editingDelivery ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Delivery Location</label>
                      <button type="button" onClick={() => setEditingDelivery(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-[#1E3A8A] hover:underline">
                        <Pencil size={11} /> Edit
                      </button>
                    </div>
                    {form.region && form.district ? (
                      <p className="text-[13px] text-[#071A2B]">
                        {[form.region, form.district, form.village].filter(Boolean).join(', ')}
                      </p>
                    ) : (
                      <p className="text-[13px] text-[#94A3B8] italic">No delivery location set — click Edit to add one</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="p-4">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Region</label>
                      <div className="relative mt-2">
                        <select value={form.region} onChange={e => handleRegionChange(e.target.value)}
                          className="appearance-none w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none focus:border-[#1E3A8A]">
                          <option value="">Select region</option>
                          {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-[#64748B] pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="p-4">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">District</label>
                      <div className="relative mt-2">
                        <select value={form.district} disabled={!form.region || regionDistricts.length === 0}
                          onChange={e => set('district', e.target.value)}
                          className="appearance-none w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none disabled:opacity-50 focus:border-[#1E3A8A]">
                          <option value="">{form.region ? 'Select district' : 'Choose a region first'}</option>
                          {regionDistricts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-[#64748B] pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="p-4">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Village / Street <span className="text-[#CBD5E1] font-normal normal-case">(optional)</span></label>
                      <input value={form.village} onChange={e => set('village', e.target.value)}
                        placeholder="e.g. Nakawa" className="w-full mt-2 px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none focus:border-[#1E3A8A]" />
                    </div>

                    <div className="p-4">
                      <button type="button" onClick={() => setEditingDelivery(false)}
                        className="text-[12px] font-bold text-[#1E3A8A] hover:underline">
                        ✓ Done editing
                      </button>
                    </div>
                  </>
                )}

                {/* Note */}
                <div className="p-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Order Note <span className="text-[#CBD5E1] font-normal normal-case">(optional)</span></label>
                  <input value={form.note} onChange={e => set('note', e.target.value)}
                    placeholder="Add delivery instructions (optional)"
                    className="w-full mt-2 px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none focus:border-[#1E3A8A]" />
                </div>
              </div>
            </section>

            {/* Items */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <PackageCheck className="text-[#1E3A8A]" size={19} />
                <div>
                  <h2 className="text-[17px] font-extrabold text-[#071A2B]">Your order</h2>
                  <p className="text-[12px] text-[#64748B]">{items.length} item{items.length === 1 ? '' : 's'}</p>
                </div>
              </div>
              <div className="bg-white border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-4">
                    <div className="w-14 h-14 bg-[#F8FAFC] shrink-0">
                      {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-contain" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#071A2B] truncate">{item.product_name}</p>
                      <p className="text-[12px] text-[#64748B] mt-1">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-[13px] font-bold text-[#1E3A8A]">UGX {(Number(item.product_price) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex items-start gap-3 p-4 bg-green-50 text-green-800">
              <ShieldCheck size={19} className="shrink-0" />
              <div>
                <p className="text-[13px] font-bold">Secure checkout</p>
                <p className="text-[12px] mt-1">Final price including delivery is confirmed by the backend when your order is placed.</p>
              </div>
            </div>
          </div>

          {/* Payment sidebar — desktop only */}
          <aside className="hidden lg:block bg-white border border-[#E2E8F0] p-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-[#1E3A8A]" />
              <h2 className="text-[17px] font-extrabold text-[#071A2B]">Payment</h2>
            </div>
            <p className="text-[12px] text-[#64748B] mt-2">Pay via MTN, Airtel or card.</p>
            <div className="flex justify-between mt-6 text-[13px] text-[#64748B]"><span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between mt-3 text-[13px] text-[#64748B]">
              <span>Delivery</span>
              <span className="font-bold text-[#071A2B]">{selectedDistrict ? `UGX ${money(districtFee)}` : 'Select district'}</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-3">District delivery fee applies at checkout.</p>
            <button type="submit" disabled={placing || !items.length || !hasAccessToken()}
              className="w-full h-11 mt-6 bg-[#1E3A8A] text-white text-[13px] font-bold disabled:opacity-40">
              {placing ? 'Placing order...' : 'Place Order'}
            </button>
          </aside>
        </form>
      </main>
      <Footer />
    </div>
  )
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: React.ReactNode }) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</label>
        {hint}
      </div>
      <p className="px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#071A2B]">
        {value || <span className="text-[#94A3B8] italic">Not set</span>}
      </p>
    </div>
  )
}

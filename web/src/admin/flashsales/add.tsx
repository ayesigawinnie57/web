import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Zap, AlertCircle, TrendingDown, Clock, Package, ShoppingCart, Flame, Timer, Info } from 'lucide-react'
import { adminFlashSalesApi, adminProductsApi, type ApiProduct } from '../../lib/api'
import { parseError } from '../ErrorBanner'
import FlashSaleErrorModal from './FlashSaleErrorModal'

type FormState = { product_id: string; flash_price: string; ends_at: string; stock_limit: string; is_active: boolean }

function defaultEndsAt() {
  const d = new Date()
  d.setHours(d.getHours() + 24)
  return d.toISOString().slice(0, 16)
}

function StockBar({ pct }: { pct: number }) {
  const critical = pct <= 20
  return (
    <div className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${critical ? 'bg-[#EF4444]' : pct > 50 ? 'bg-[#22C55E]' : 'bg-[#F97316]'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function AddFlashSale() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({ product_id: '', flash_price: '', ends_at: defaultEndsAt(), stock_limit: '', is_active: true })
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof FormState) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { adminProductsApi.listAll().then(setProducts).catch(() => {}) }, [])

  const eligibleProducts = products.filter(p => !p.seller_uuid)
  const selectedProduct = eligibleProducts.find(p => String(p.id) === form.product_id)
  const filteredProducts = productSearch.trim()
    ? eligibleProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : eligibleProducts

  const origPrice = selectedProduct ? Number(selectedProduct.base_price ?? selectedProduct.listed_price ?? selectedProduct.price) : 0
  const flashPrice = form.flash_price ? Number(form.flash_price) : 0
  const previewDiscount = origPrice > 0 && flashPrice > 0 && flashPrice < origPrice
    ? Math.round((1 - flashPrice / origPrice) * 100)
    : 0
  const savings = origPrice > 0 && flashPrice > 0 && flashPrice < origPrice ? origPrice - flashPrice : 0
  const stockLimit = form.stock_limit ? Number(form.stock_limit) : 0
  const stockPct = stockLimit > 0 ? 100 : 0
  const endsAtDate = form.ends_at ? new Date(form.ends_at) : null
  const hoursLeft = endsAtDate ? Math.max(0, Math.round((endsAtDate.getTime() - Date.now()) / 3600000)) : 0

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.product_id || !form.flash_price || !form.ends_at || !form.stock_limit) {
      setError('All fields are required.'); return
    }
    if (new Date(form.ends_at) <= new Date()) { setError('End time must be in the future.'); return }
    if (origPrice > 0 && flashPrice >= origPrice) { setError('Flash price must be lower than the original price.'); return }
    setSaving(true); setError('')
    try {
      await adminFlashSalesApi.create({
        product_id: Number(form.product_id),
        flash_price: form.flash_price,
        ends_at: new Date(form.ends_at).toISOString(),
        stock_limit: Number(form.stock_limit),
        is_active: form.is_active,
      })
      navigate('/admin/flashsales')
    } catch (err) {
      setError(parseError(err, 'Failed to create flash sale.'))
    } finally {
      setSaving(false)
    }
  }

  const hasPreview = Boolean(selectedProduct)

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <button
          onClick={() => navigate('/admin/flashsales')}
          className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F1F5F9] transition-colors shrink-0"
        >
          <ArrowLeft size={17} color="#071A2B" />
        </button>
        <div>
          <h1 className="text-[18px] font-extrabold text-[#071A2B] leading-tight">New Flash Sale</h1>
          <p className="text-[11px] text-[#64748B]">Create a time-limited deal with stock cap</p>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex gap-6 flex-1 min-h-0 flex-col lg:flex-row">

        {/* ── LEFT: Form ── */}
        <div className="lg:w-[420px] shrink-0">
          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle size={15} color="#ef4444" className="shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-600 font-semibold">{error}</p>
              </div>
            )}

            {/* Product */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
              <label className="block text-[13px] font-bold text-[#071A2B] mb-3">Product *</label>
              {selectedProduct ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  {selectedProduct.image && <img src={selectedProduct.image} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#071A2B] truncate">{selectedProduct.name}</p>
                    <p className="text-[11px] text-[#64748B]">UGX {origPrice.toLocaleString()} · Stock: {selectedProduct.stock}</p>
                  </div>
                  <button type="button" onClick={() => { set('product_id')(''); setProductSearch('') }} className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                    <X size={13} color="#64748B" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search product…"
                    className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#F97316] mb-2"
                  />
                  <div className="max-h-52 overflow-y-auto border border-[#E2E8F0] rounded-xl">
                    {filteredProducts.length === 0
                      ? <p className="px-3 py-4 text-[13px] text-[#64748B] text-center">No eligible products found.</p>
                      : filteredProducts.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const basePrice = p.base_price ?? p.listed_price ?? p.price
                            setProductSearch(p.name)
                            setForm(f => ({ ...f, product_id: String(p.id), flash_price: String(basePrice), stock_limit: String(p.stock) }))
                          }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] text-left"
                        >
                          {p.image && <img src={p.image} className="w-9 h-9 rounded-lg object-cover shrink-0" />}
                          <div>
                            <p className="text-[13px] font-semibold text-[#071A2B]">{p.name}</p>
                            <p className="text-[11px] text-[#64748B]">UGX {Number(p.base_price ?? p.listed_price ?? p.price).toLocaleString()} · Stock: {p.stock}</p>
                          </div>
                        </button>
                      ))
                    }
                  </div>
                </>
              )}
            </div>

            {/* Price + Stock row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Flash Price (UGX) *</label>
                {selectedProduct && (
                  <p className="text-[11px] text-[#64748B] mb-2">
                    Original: {origPrice.toLocaleString()}
                    {previewDiscount > 0 && <span className="ml-1 text-[#F97316] font-bold">−{previewDiscount}%</span>}
                  </p>
                )}
                <input
                  type="number"
                  value={form.flash_price}
                  onChange={e => set('flash_price')(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Stock Limit *</label>
                {selectedProduct && <p className="text-[11px] text-[#64748B] mb-2">Available: {selectedProduct.stock} units</p>}
                <input
                  type="number"
                  value={form.stock_limit}
                  onChange={e => set('stock_limit')(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#F97316]"
                />
              </div>
            </div>

            {/* Ends At */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
              <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Ends At *</label>
              <p className="text-[11px] text-[#64748B] mb-2">When the flash sale automatically closes</p>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={e => set('ends_at')(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#F97316]"
              />
            </div>

            {/* Active toggle */}
            <label className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E2E8F0] cursor-pointer">
              <div>
                <p className="text-[13px] font-bold text-[#071A2B]">Publish immediately</p>
                <p className="text-[11px] text-[#64748B]">Show this deal to customers right away</p>
              </div>
              <div
                onClick={() => set('is_active')(!form.is_active)}
                className={`w-11 h-6 rounded-full cursor-pointer transition-colors relative shrink-0 ${form.is_active ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#F97316] text-white py-3.5 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:bg-[#EA580C] transition-colors shadow-sm"
            >
              <Zap size={15} fill="white" />
              {saving ? 'Creating…' : 'Create Flash Sale'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Preview + Tips ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Live card preview */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-4">Live Preview</p>

            {hasPreview ? (
              <div className="flex gap-4">
                {/* Card mockup */}
                <div className="w-44 shrink-0 rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                  <div className="relative aspect-square bg-[#F8FAFC]">
                    {selectedProduct!.image
                      ? <img src={selectedProduct!.image} className="w-full h-full object-cover" />
                      : <div className="flex h-full items-center justify-center text-4xl">📦</div>
                    }
                    {previewDiscount > 0 && (
                      <span className="absolute top-2 left-2 bg-[#EF4444] text-white text-[9px] font-extrabold px-1.5 py-1 rounded-md">
                        -{previewDiscount}%
                      </span>
                    )}
                    {stockLimit > 0 && stockPct <= 20 && (
                      <span className="absolute top-2 right-2 flex items-center gap-0.5 bg-[#F97316] text-white text-[9px] font-bold px-1.5 py-1 rounded-md">
                        <Flame size={9} fill="white" /> HOT
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    <p className="text-[11px] font-bold text-[#071A2B] truncate">{selectedProduct!.name}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[13px] font-extrabold text-[#EF4444]">
                        {flashPrice > 0 ? `UGX ${flashPrice.toLocaleString()}` : '—'}
                      </span>
                      {origPrice > 0 && <span className="text-[9px] text-[#94A3B8] line-through">UGX {origPrice.toLocaleString()}</span>}
                    </div>
                    {endsAtDate && (
                      <div className="flex items-center gap-1">
                        <Timer size={10} className="text-[#64748B]" />
                        <span className="text-[10px] text-[#64748B]">
                          {hoursLeft > 24 ? `${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h` : `${hoursLeft}h left`}
                        </span>
                      </div>
                    )}
                    {stockLimit > 0 && (
                      <>
                        <StockBar pct={stockPct} />
                        <p className="text-[9px] text-[#64748B]">{stockLimit} left</p>
                      </>
                    )}
                    <button className="w-full flex items-center justify-center gap-1 bg-[#F97316] text-white text-[10px] font-bold py-1.5 rounded-lg">
                      <ShoppingCart size={10} /> Add to Cart
                    </button>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="flex-1 grid grid-cols-2 gap-3 content-start">
                  <div className="bg-[#FFF7ED] border border-[#FDBA74] rounded-xl p-3">
                    <p className="text-[10px] text-[#64748B] font-semibold mb-1">Discount</p>
                    <p className="text-[22px] font-extrabold text-[#F97316] leading-tight">{previewDiscount > 0 ? `${previewDiscount}%` : '—'}</p>
                  </div>
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3">
                    <p className="text-[10px] text-[#64748B] font-semibold mb-1">Customer Saves</p>
                    <p className="text-[14px] font-extrabold text-[#16A34A] leading-tight">
                      {savings > 0 ? `UGX ${savings.toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3">
                    <p className="text-[10px] text-[#64748B] font-semibold mb-1">Duration</p>
                    <p className="text-[14px] font-extrabold text-[#1D4ED8] leading-tight">
                      {hoursLeft > 0 ? (hoursLeft >= 24 ? `${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h` : `${hoursLeft}h`) : '—'}
                    </p>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                    <p className="text-[10px] text-[#64748B] font-semibold mb-1">Stock Cap</p>
                    <p className="text-[14px] font-extrabold text-[#071A2B] leading-tight">
                      {stockLimit > 0 ? `${stockLimit} units` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] flex items-center justify-center">
                  <Zap size={24} color="#F97316" />
                </div>
                <p className="text-[13px] font-bold text-[#071A2B]">Select a product to preview</p>
                <p className="text-[12px] text-[#64748B] max-w-xs">The live card preview will appear here as you fill in the form.</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info size={14} color="#6366F1" />
              <p className="text-[12px] font-bold text-[#071A2B]">Tips for a great flash sale</p>
            </div>
            <div className="space-y-3">
              {[
                { icon: <TrendingDown size={13} color="#F97316" />, title: 'Aim for 20–40% off', desc: 'Discounts in this range drive urgency without hurting margins too much.' },
                { icon: <Clock size={13} color="#6366F1" />, title: 'Keep it under 24 hours', desc: 'Shorter windows create stronger FOMO and faster sell-through.' },
                { icon: <Package size={13} color="#22C55E" />, title: 'Cap stock at 20–50 units', desc: 'A visible low stock bar pushes customers to act before it runs out.' },
                { icon: <Flame size={13} color="#EF4444" />, title: 'Pick high-demand products', desc: 'Flash sales work best on products customers already want to buy.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <p className="text-[12px] font-bold text-[#071A2B]">{title}</p>
                    <p className="text-[11px] text-[#64748B] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-[#FFF7ED] border border-[#FDBA74] rounded-2xl p-5">
            <p className="text-[12px] font-bold text-[#071A2B] mb-3">How flash sales work</p>
            <div className="space-y-2.5">
              {[
                'The deal goes live immediately if "Publish immediately" is on.',
                'Customers see a live countdown timer and stock progress bar.',
                'The sale auto-closes when the timer hits zero or stock runs out.',
                'Trader-owned products manage their own flash sales independently.',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#F97316] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-[12px] text-[#64748B] leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <FlashSaleErrorModal message={error} onClose={() => setError('')} />
    </div>
  )
}

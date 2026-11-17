import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Zap, Clock, Ban, Flame, X, TrendingDown, Package, CheckCircle2, AlertCircle } from 'lucide-react'
import { adminFlashSalesApi, tradersApi, type ApiFlashSaleItem, type ApiTraderProduct } from '../lib/api'

type FormState = { product_id: string; flash_price: string; ends_at: string; stock_limit: string; is_active: boolean }
type Filter = 'all' | 'active' | 'expired'

function defaultEndsAt() {
  const d = new Date()
  d.setHours(d.getHours() + 24)
  return d.toISOString().slice(0, 16)
}

function parseErr(e: unknown) {
  const data = (e as any)?.response?.data
  if (!data) return 'Something went wrong.'
  if (typeof data === 'string') return data
  const vals = Object.values(data).flat()
  return vals.length ? String(vals[0]) : 'Something went wrong.'
}

function Countdown({ endsAt }: { endsAt: string }) {
  const calc = () => Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000))
  const [secs, setSecs] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setSecs(calc), 1000)
    return () => clearInterval(id)
  }, [endsAt])
  if (secs === 0) return <span className="text-red-500 text-[11px] font-semibold">Expired</span>
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60
  const urgent = secs < 3600
  return (
    <span className={`text-[11px] font-semibold tabular-nums ${urgent ? 'text-[#F97316]' : 'text-[#64748B]'}`}>
      {h > 0 ? `${h}h ` : ''}{String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s
    </span>
  )
}

export default function TraderFlashSales() {
  const { traderUuid } = useParams<{ traderUuid: string }>()

  const [sales, setSales] = useState<ApiFlashSaleItem[]>([])
  const [myProducts, setMyProducts] = useState<ApiTraderProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<ApiFlashSaleItem | null>(null)
  const [form, setForm] = useState<FormState>({ product_id: '', flash_price: '', ends_at: defaultEndsAt(), stock_limit: '', is_active: true })
  const [productSearch, setProductSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  const set = (k: keyof FormState) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (!traderUuid) return
    Promise.all([
      adminFlashSalesApi.list().then(({ data }) => {
        const all: ApiFlashSaleItem[] = Array.isArray(data) ? data : (data as any).results ?? []
        setSales(all)
      }),
      tradersApi.products(traderUuid).then(({ data }) => setMyProducts(data)),
    ])
      .catch(e => setLoadError(parseErr(e)))
      .finally(() => setLoading(false))
  }, [traderUuid])

  const myProductIds = new Set(myProducts.map(p => p.public_product_id).filter((id): id is number => id !== null))
  const mySales = sales.filter(s => myProductIds.has(s.product.id))

  const activeCount = mySales.filter(s => s.is_active && !s.is_expired).length
  const expiredCount = mySales.filter(s => s.is_expired || !s.is_active).length
  const criticalCount = mySales.filter(s => s.is_active && !s.is_expired && s.stock_limit > 0 && s.stock_left / s.stock_limit <= 0.2).length

  const visibleSales = mySales.filter(s => {
    if (filter === 'active') return s.is_active && !s.is_expired
    if (filter === 'expired') return s.is_expired || !s.is_active
    return true
  })

  const openAdd = () => {
    setEditing(null)
    setForm({ product_id: '', flash_price: '', ends_at: defaultEndsAt(), stock_limit: '', is_active: true })
    setProductSearch('')
    setError('')
    setModal('add')
  }

  const openEdit = (s: ApiFlashSaleItem) => {
    setEditing(s)
    setForm({
      product_id: String(s.product.id),
      flash_price: String(s.base_flash_price ?? s.flash_price),
      ends_at: new Date(s.ends_at).toISOString().slice(0, 16),
      stock_limit: String(s.stock_limit),
      is_active: s.is_active,
    })
    setProductSearch(s.product.name)
    setError('')
    setModal('edit')
  }

  const closeModal = () => { setModal(null); setEditing(null) }

  const usedIds = new Set(
    mySales
      .filter(s => !s.is_expired && s.is_active && (!editing || s.id !== editing.id))
      .map(s => String(s.product.id))
  )
  const availableProducts = myProducts.filter(p =>
    p.public_product_id !== null &&
    !usedIds.has(String(p.public_product_id)) &&
    (!productSearch.trim() || p.name.toLowerCase().includes(productSearch.toLowerCase()))
  )
  const selectedProduct = myProducts.find(p => String(p.public_product_id) === form.product_id)

  const origPrice = selectedProduct ? Number(selectedProduct.price) : 0
  const flashPrice = form.flash_price ? Number(form.flash_price) : 0
  const previewDiscount = origPrice > 0 && flashPrice > 0 && flashPrice < origPrice
    ? Math.round((1 - flashPrice / origPrice) * 100)
    : 0

  const handleSave = async () => {
    if (!form.product_id || !form.flash_price || !form.ends_at || !form.stock_limit) {
      setError('All fields are required.'); return
    }
    if (new Date(form.ends_at) <= new Date()) { setError('End time must be in the future.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        product_id: Number(form.product_id),
        flash_price: form.flash_price,
        ends_at: new Date(form.ends_at).toISOString(),
        stock_limit: Number(form.stock_limit),
        is_active: form.is_active,
      }
      if (modal === 'edit' && editing) {
        const { data } = await adminFlashSalesApi.update(editing.id, payload)
        setSales(prev => prev.map(s => s.id === editing.id ? data : s))
      } else {
        const { data } = await adminFlashSalesApi.create(payload)
        setSales(prev => [data, ...prev])
      }
      closeModal()
    } catch (e) {
      setError(parseErr(e))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: ApiFlashSaleItem) => {
    if (!confirm(`Remove flash sale for "${s.product.name}"?`)) return
    try {
      await adminFlashSalesApi.delete(s.id)
      setSales(prev => prev.filter(x => x.id !== s.id))
    } catch (e) {
      setLoadError(parseErr(e))
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] flex items-center justify-center">
            <Zap size={18} color="#F97316" fill="#F97316" />
          </div>
          <div>
            <h1 className="text-[18px] font-extrabold text-[#071A2B] leading-tight">Flash Sales</h1>
            <p className="text-[11px] text-[#64748B]">Boost your products with time-limited deals</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#EA580C] transition-colors shadow-sm"
        >
          <Plus size={15} /> New Flash Sale
        </button>
      </div>

      {loadError && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={15} color="#ef4444" className="shrink-0 mt-0.5" />
          <p className="flex-1 text-[13px] text-red-600 font-semibold">{loadError}</p>
          <button onClick={() => setLoadError('')}><X size={14} color="#ef4444" /></button>
        </div>
      )}

      {/* Stats */}
      {!loading && mySales.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: <CheckCircle2 size={15} color="#22C55E" />, label: 'Active', value: activeCount, bg: 'bg-green-50', border: 'border-green-100' },
            { icon: <Ban size={15} color="#94A3B8" />, label: 'Expired', value: expiredCount, bg: 'bg-slate-50', border: 'border-slate-100' },
            { icon: <Flame size={15} color="#EF4444" />, label: 'Critical Stock', value: criticalCount, bg: 'bg-red-50', border: 'border-red-100' },
          ].map(({ icon, label, value, bg, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-xl p-3 flex items-center gap-3`}>
              <div className="shrink-0">{icon}</div>
              <div>
                <p className="text-[18px] font-extrabold text-[#071A2B] leading-tight">{value}</p>
                <p className="text-[11px] text-[#64748B]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {!loading && mySales.length > 0 && (
        <div className="flex gap-1 mb-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-1 w-fit">
          {(['all', 'active', 'expired'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-colors ${filter === f ? 'bg-white text-[#071A2B] shadow-sm' : 'text-[#64748B] hover:text-[#071A2B]'}`}
            >
              {f} {f === 'all' ? `(${mySales.length})` : f === 'active' ? `(${activeCount})` : `(${expiredCount})`}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-9 h-9 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#64748B]">Loading flash sales…</p>
        </div>
      ) : visibleSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] flex items-center justify-center">
            <Zap size={24} color="#F97316" />
          </div>
          <p className="text-[15px] font-bold text-[#071A2B]">No flash sales {filter !== 'all' ? `(${filter})` : 'yet'}</p>
          <p className="text-[13px] text-[#64748B]">
            {filter === 'all' ? 'Create a flash sale to drive urgency and boost conversions.' : `No ${filter} flash sales found.`}
          </p>
          {filter === 'all' && (
            <button
              onClick={openAdd}
              className="mt-1 flex items-center gap-2 bg-[#F97316] text-white px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#EA580C]"
            >
              <Plus size={15} /> Create Flash Sale
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleSales.map(s => {
            const stockPct = s.stock_limit > 0 ? s.stock_left / s.stock_limit : 1
            const critical = stockPct <= 0.2
            const expired = s.is_expired || !s.is_active
            return (
              <div key={s.id} className={`bg-white border rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${expired ? 'border-[#E2E8F0] opacity-60' : critical ? 'border-red-200' : 'border-[#E2E8F0]'}`}>
                <div className="flex items-center gap-4 p-4">
                  {/* Image */}
                  <div className="relative shrink-0">
                    {s.product.image
                      ? <img src={s.product.image} className="w-16 h-16 rounded-xl object-cover" />
                      : <div className="w-16 h-16 rounded-xl bg-[#F8FAFC] flex items-center justify-center text-2xl">📦</div>
                    }
                    <span className="absolute -top-1.5 -right-1.5 bg-[#EF4444] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md">
                      -{s.discount_pct}%
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold text-[#071A2B] truncate">{s.product.name}</p>
                      {!expired && s.is_active && (
                        <span className="shrink-0 rounded-md bg-green-50 border border-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600">Live</span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-[15px] font-extrabold text-[#F97316]">UGX {Number(s.flash_price).toLocaleString()}</span>
                      <span className="text-[11px] text-[#94A3B8] line-through">UGX {Number(s.product.price).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        {expired
                          ? <><Ban size={10} color="#ef4444" /><span className="text-[11px] text-red-500 font-semibold">Expired</span></>
                          : <><Clock size={10} color="#64748B" /><Countdown endsAt={s.ends_at} /></>
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <Package size={10} color="#64748B" />
                        <span className={`text-[11px] font-semibold ${critical ? 'text-red-500' : 'text-[#64748B]'}`}>
                          {s.stock_left}/{s.stock_limit} left
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(s)}
                      className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                    >
                      <Pencil size={13} color="#6366f1" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>

                {/* Stock bar */}
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${critical ? 'bg-red-500' : stockPct > 0.5 ? 'bg-[#22C55E]' : 'bg-[#F97316]'}`}
                        style={{ width: `${stockPct * 100}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${critical ? 'text-red-500' : 'text-[#64748B]'}`}>
                      {Math.round(stockPct * 100)}%
                    </span>
                  </div>
                  {critical && !expired && (
                    <div className="flex items-center gap-1.5 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                      <Flame size={11} color="#ef4444" />
                      <span className="text-[11px] font-bold text-red-500">Only {s.stock_left} left — selling fast!</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-[#F1F5F9] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-2">
                <Zap size={16} color="#F97316" fill="#F97316" />
                <h2 className="text-[16px] font-extrabold text-[#071A2B]">
                  {modal === 'edit' ? 'Edit Flash Sale' : 'New Flash Sale'}
                </h2>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center hover:bg-[#F1F5F9]">
                <X size={16} color="#071A2B" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Live preview */}
              {selectedProduct && previewDiscount > 0 && (
                <div className="flex items-center gap-3 bg-[#FFF7ED] border border-[#FDBA74] rounded-2xl p-3">
                  {selectedProduct.image_url && <img src={selectedProduct.image_url} className="w-10 h-10 rounded-xl object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#071A2B] truncate">{selectedProduct.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-[13px] font-extrabold text-[#F97316]">UGX {flashPrice.toLocaleString()}</span>
                      <span className="text-[10px] text-[#94A3B8] line-through">UGX {origPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-[#EF4444] text-white px-2 py-1 rounded-lg shrink-0">
                    <TrendingDown size={11} />
                    <span className="text-[11px] font-extrabold">-{previewDiscount}%</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle size={15} color="#ef4444" className="shrink-0 mt-0.5" />
                  <p className="text-[13px] text-red-600 font-semibold">{error}</p>
                </div>
              )}

              {/* Product picker */}
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Product *</label>
                {selectedProduct ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                    {selectedProduct.image_url && <img src={selectedProduct.image_url} className="w-10 h-10 rounded-lg object-cover shrink-0" />}
                    <p className="flex-1 text-[13px] font-bold text-[#071A2B] truncate">{selectedProduct.name}</p>
                    <button onClick={() => { set('product_id')(''); setProductSearch('') }} className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                      <X size={13} color="#64748B" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search your products…"
                      className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#F97316] mb-2"
                    />
                    <div className="max-h-44 overflow-y-auto border border-[#E2E8F0] rounded-xl">
                      {availableProducts.length === 0
                        ? <p className="text-[12px] text-[#94A3B8] text-center py-4">No products available</p>
                        : availableProducts.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setProductSearch(p.name)
                              setForm(f => ({ ...f, product_id: String(p.public_product_id), flash_price: String(p.price), stock_limit: String(p.stock) }))
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] text-left"
                          >
                            {p.image_url && <img src={p.image_url} className="w-9 h-9 rounded-lg object-cover shrink-0" />}
                            <div>
                              <p className="text-[13px] font-semibold text-[#071A2B]">{p.name}</p>
                              <p className="text-[11px] text-[#64748B]">UGX {Number(p.price).toLocaleString()} · Stock: {p.stock}</p>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Flash Price (UGX) *</label>
                {selectedProduct && (
                  <p className="text-[11px] text-[#64748B] mb-2">
                    Original: <span className="font-semibold">UGX {origPrice.toLocaleString()}</span>
                    {previewDiscount > 0 && <span className="ml-2 text-[#F97316] font-bold">→ {previewDiscount}% off</span>}
                  </p>
                )}
                <input
                  type="number"
                  value={form.flash_price}
                  onChange={e => set('flash_price')(e.target.value)}
                  className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Ends At *</label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={e => set('ends_at')(e.target.value)}
                  className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#F97316]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Stock Limit *</label>
                {selectedProduct && (
                  <p className="text-[11px] text-[#64748B] mb-2">Available: <span className="font-semibold">{selectedProduct.stock} units</span></p>
                )}
                <input
                  type="number"
                  value={form.stock_limit}
                  onChange={e => set('stock_limit')(e.target.value)}
                  className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#F97316]"
                />
              </div>

              <label className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] cursor-pointer">
                <div>
                  <p className="text-[13px] font-bold text-[#071A2B]">Active</p>
                  <p className="text-[11px] text-[#64748B]">Show this deal to customers</p>
                </div>
                <div
                  onClick={() => set('is_active')(!form.is_active)}
                  className={`w-11 h-6 rounded-full cursor-pointer transition-colors relative shrink-0 ${form.is_active ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#F97316] text-white py-3.5 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:bg-[#EA580C] transition-colors"
              >
                <Zap size={15} fill="white" />
                {saving ? 'Saving…' : modal === 'edit' ? 'Update Flash Sale' : 'Create Flash Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

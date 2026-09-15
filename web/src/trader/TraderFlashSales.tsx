import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Zap, Clock, Ban, Flame, X } from 'lucide-react'
import { adminFlashSalesApi, tradersApi, type ApiFlashSaleItem, type ApiTraderProduct } from '../lib/api'

type FormState = { product_id: string; flash_price: string; ends_at: string; stock_limit: string; is_active: boolean }

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

export default function TraderFlashSales() {
  const { traderUuid } = useParams<{ traderUuid: string }>()

  const [sales, setSales] = useState<ApiFlashSaleItem[]>([])
  const [myProducts, setMyProducts] = useState<ApiTraderProduct[]>([])
  const [loading, setLoading] = useState(true)
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

  // Only show flash sales that belong to this trader's products
  const myProductIds = new Set(myProducts.map(p => p.id))
  const mySales = sales.filter(s => myProductIds.has(s.product.id))

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
      flash_price: String(s.flash_price),
      ends_at: new Date(s.ends_at).toISOString().slice(0, 16),
      stock_limit: String(s.stock_limit),
      is_active: s.is_active,
    })
    setProductSearch(s.product.name)
    setError('')
    setModal('edit')
  }

  const closeModal = () => { setModal(null); setEditing(null) }

  // Products available for new flash sale (not already in an active non-expired sale)
  const usedIds = new Set(
    mySales
      .filter(s => !s.is_expired && s.is_active && (!editing || s.id !== editing.id))
      .map(s => String(s.product.id))
  )
  const availableProducts = myProducts.filter(p =>
    !usedIds.has(String(p.id)) &&
    (!productSearch.trim() || p.name.toLowerCase().includes(productSearch.toLowerCase()))
  )
  const selectedProduct = myProducts.find(p => String(p.id) === form.product_id)

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
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap size={20} color="#F97316" fill="#F97316" />
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">Flash Sales</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#F97316] text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90"
        >
          <Plus size={16} /> New
        </button>
      </div>

      {loadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-[13px] text-red-600 font-semibold rounded-lg flex items-center justify-between">
          {loadError}
          <button onClick={() => setLoadError('')}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : mySales.length === 0 ? (
        <p className="text-center text-[#64748B] text-[14px] py-20">No flash sales yet. Click "New" to create one.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {mySales.map(s => {
            const stockPct = s.stock_limit > 0 ? s.stock_left / s.stock_limit : 1
            const critical = stockPct <= 0.2
            const expired = s.is_expired || !s.is_active
            return (
              <div key={s.id} className={`bg-white border border-[#E2E8F0] rounded-xl p-4 ${expired ? 'opacity-55' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  {s.product.image
                    ? <img src={s.product.image} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    : <div className="w-14 h-14 rounded-lg bg-[#F8FAFC] shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#071A2B] truncate">{s.product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[14px] font-extrabold text-[#F97316]">UGX {Number(s.flash_price).toLocaleString()}</span>
                      <span className="text-[12px] text-[#94A3B8] line-through">UGX {Number(s.product.price).toLocaleString()}</span>
                      <span className="text-[10px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded">-{s.discount_pct}%</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {expired
                        ? <><Ban size={10} color="#ef4444" /><span className="text-[11px] text-red-500">Expired</span></>
                        : <><Clock size={10} color="#64748B" /><span className="text-[11px] text-[#64748B]">Ends {new Date(s.ends_at).toLocaleString()}</span></>
                      }
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(s)} className="w-8 h-8 rounded-lg bg-[#6366f118] flex items-center justify-center hover:opacity-80">
                      <Pencil size={13} color="#6366f1" />
                    </button>
                    <button onClick={() => handleDelete(s)} className="w-8 h-8 rounded-lg bg-[#ef444418] flex items-center justify-center hover:opacity-80">
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${critical ? 'bg-red-500' : 'bg-[#22C55E]'}`}
                      style={{ width: `${stockPct * 100}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold ${critical ? 'text-red-500' : 'text-[#64748B]'}`}>
                    {s.stock_left} left of {s.stock_limit}
                  </span>
                </div>
                {critical && !expired && (
                  <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-3 py-1.5 mt-2">
                    <Flame size={12} color="#ef4444" />
                    <span className="text-[12px] font-bold text-red-500">Only {s.stock_left} left — selling fast!</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-extrabold text-[#071A2B]">
                {modal === 'edit' ? 'Edit Flash Sale' : 'New Flash Sale'}
              </h2>
              <button onClick={closeModal}><X size={20} color="#071A2B" /></button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-[13px] text-red-600 font-semibold rounded-lg">{error}</div>
            )}

            <div className="space-y-4">
              {/* Product picker */}
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Product *</label>
                {selectedProduct ? (
                  <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#22C55E] rounded-xl p-3">
                    {selectedProduct.image_url && <img src={selectedProduct.image_url} className="w-10 h-10 rounded-lg object-cover" />}
                    <p className="flex-1 text-[13px] font-bold text-[#071A2B] truncate">{selectedProduct.name}</p>
                    <button onClick={() => { set('product_id')(''); setProductSearch('') }}><X size={15} color="#64748B" /></button>
                  </div>
                ) : (
                  <>
                    <input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search your products..."
                      className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E] mb-2"
                    />
                    <div className="max-h-44 overflow-y-auto border border-[#E2E8F0] rounded-xl">
                      {availableProducts.length === 0
                        ? <p className="text-[12px] text-[#94A3B8] text-center py-4">No products found</p>
                        : availableProducts.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setProductSearch(p.name)
                              setForm(f => ({ ...f, product_id: String(p.id), flash_price: String(p.price), stock_limit: String(p.stock) }))
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] text-left"
                          >
                            {p.image_url && <img src={p.image_url} className="w-9 h-9 rounded-lg object-cover" />}
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
                  <p className="text-[11px] text-[#64748B] italic mb-2">Original: UGX {Number(selectedProduct.price).toLocaleString()} — must be lower</p>
                )}
                <input
                  type="number"
                  value={form.flash_price}
                  onChange={e => set('flash_price')(e.target.value)}
                  className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Ends At *</label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={e => set('ends_at')(e.target.value)}
                  className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Stock Limit *</label>
                {selectedProduct && (
                  <p className="text-[11px] text-[#64748B] italic mb-2">Available: {selectedProduct.stock} units</p>
                )}
                <input
                  type="number"
                  value={form.stock_limit}
                  onChange={e => set('stock_limit')(e.target.value)}
                  className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
                />
              </div>

              <label className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#071A2B]">Active</span>
                <div
                  onClick={() => set('is_active')(!form.is_active)}
                  className={`w-10 h-5 rounded-full cursor-pointer transition-colors relative ${form.is_active ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-[#F97316] text-white py-3 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:opacity-90"
              >
                {saving ? 'Saving…' : modal === 'edit' ? 'Update Flash Sale' : 'Create Flash Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

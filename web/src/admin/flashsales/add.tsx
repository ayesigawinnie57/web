import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { adminFlashSalesApi, adminProductsApi, type ApiProduct } from '../../lib/api'
import { parseError } from '../ErrorBanner'
import FlashSaleErrorModal from './FlashSaleErrorModal'

type FormState = { product_id: string; flash_price: string; ends_at: string; stock_limit: string; is_active: boolean }

function defaultEndsAt() {
  const d = new Date()
  d.setHours(d.getHours() + 24)
  return d.toISOString().slice(0, 16)
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

  const selectedProduct = products.find(p => String(p.id) === form.product_id)
  const eligibleProducts = products.filter(p => !p.seller_uuid)
  const filteredProducts = productSearch.trim()
    ? eligibleProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : eligibleProducts

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.product_id || !form.flash_price || !form.ends_at || !form.stock_limit) {
      setError('All fields are required.'); return
    }
    if (new Date(form.ends_at) <= new Date()) { setError('End time must be in the future.'); return }
    setSaving(true)
    setError('')
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

  return (
    <div className="p-8 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/flashsales')} className="p-1 hover:opacity-70"><ArrowLeft size={20} color="#071A2B" /></button>
        <h1 className="text-xl font-extrabold text-[#071A2B]">New Flash Sale</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Product *</label>
          {selectedProduct ? (
            <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#22C55E] rounded-xl p-3">
              {selectedProduct.image && <img src={selectedProduct.image} className="w-10 h-10 rounded-lg object-cover" />}
              <p className="flex-1 text-[13px] font-bold text-[#071A2B] truncate">{selectedProduct.name}</p>
              <button type="button" onClick={() => { set('product_id')(''); setProductSearch('') }}><X size={15} color="#64748B" /></button>
            </div>
          ) : (
            <>
              <input
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Search product..."
                className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E] mb-2"
              />
              <div className="max-h-48 overflow-y-auto border border-[#E2E8F0] rounded-xl">
                {filteredProducts.length === 0 && <p className="px-3 py-4 text-[13px] text-[#64748B]">No eligible products found.</p>}
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProductSearch(p.name); setForm(f => ({ ...f, product_id: String(p.id), flash_price: String(p.price), stock_limit: String(p.stock) })) }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] text-left"
                  >
                    {p.image && <img src={p.image} className="w-9 h-9 rounded-lg object-cover" />}
                    <div>
                      <p className="text-[13px] font-semibold text-[#071A2B]">{p.name}</p>
                      <p className="text-[11px] text-[#64748B]">UGX {Number(p.price).toLocaleString()} · Stock: {p.stock}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Flash Price (UGX) *</label>
          {selectedProduct && <p className="text-[11px] text-[#64748B] italic mb-2">Original: UGX {Number(selectedProduct.price).toLocaleString()} — must be lower</p>}
          <input
            type="number"
            value={form.flash_price}
            onChange={e => set('flash_price')(e.target.value)}
            placeholder="e.g. 25000"
            className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Ends At *</label>
          <input
            type="datetime-local"
            value={form.ends_at}
            onChange={e => set('ends_at')(e.target.value)}
            className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Stock Limit *</label>
          {selectedProduct && <p className="text-[11px] text-[#64748B] italic mb-2">Available: {selectedProduct.stock} units</p>}
          <input
            type="number"
            value={form.stock_limit}
            onChange={e => set('stock_limit')(e.target.value)}
            placeholder="e.g. 50"
            className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
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

        <button type="submit" disabled={saving} className="w-full bg-[#F97316] text-white py-3 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:opacity-90 mt-4">
          {saving ? 'Creating...' : 'Create Flash Sale'}
        </button>
      </form>
      <FlashSaleErrorModal message={error} onClose={() => setError('')} />
    </div>
  )
}

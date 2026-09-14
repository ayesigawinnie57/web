import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { tradersApi, type ApiTraderProduct } from '../lib/api'

const fmt = (n: string | number) => `UGX ${Number(n).toLocaleString()}`

export default function TraderProducts() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [products, setProducts] = useState<ApiTraderProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | ApiTraderProduct | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', image_url: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    tradersApi.products(traderUuid!).then(r => setProducts(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [traderUuid])

  const openAdd = () => {
    setForm({ name: '', description: '', price: '', stock: '', image_url: '', is_active: true })
    setError('')
    setModal('add')
  }

  const openEdit = (p: ApiTraderProduct) => {
    setForm({ name: p.name, description: p.description, price: p.price, stock: String(p.stock), image_url: p.image_url, is_active: p.is_active })
    setError('')
    setModal(p)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { setError('Name and price are required.'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) }
      if (modal === 'add') {
        const r = await tradersApi.createProduct(traderUuid!, payload)
        setProducts(p => [r.data, ...p])
      } else {
        const r = await tradersApi.updateProduct(traderUuid!, (modal as ApiTraderProduct).uuid, payload)
        setProducts(p => p.map(x => x.uuid === r.data.uuid ? r.data : x))
      }
      setModal(null)
    } catch { setError('Failed to save product.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (uuid: string) => {
    setDeleting(uuid)
    try {
      await tradersApi.deleteProduct(traderUuid!, uuid)
      setProducts(p => p.filter(x => x.uuid !== uuid))
    } finally { setDeleting(null) }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package size={20} color="#071A2B" />
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">My Products</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#071A2B] text-white text-[13px] font-bold rounded-xl hover:opacity-80">
          <Plus size={14} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} color="#CBD5E1" className="mx-auto mb-3" />
          <p className="text-[14px] text-[#64748B]">No products yet. Add your first product.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.uuid} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              {p.image_url
                ? <img src={p.image_url} className="w-full h-40 object-cover" />
                : <div className="w-full h-40 bg-[#F8FAFC] flex items-center justify-center"><Package size={32} color="#CBD5E1" /></div>
              }
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[14px] font-extrabold text-[#071A2B] leading-tight">{p.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <p className="text-[13px] font-bold text-[#22C55E] mb-1">{fmt(p.price)}</p>
                <p className="text-[11px] text-[#94A3B8]">Stock: {p.stock}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 py-2 border border-[#E2E8F0] rounded-lg text-[12px] font-bold text-[#071A2B] hover:bg-[#F8FAFC]">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(p.uuid)} disabled={deleting === p.uuid}
                    className="flex items-center justify-center gap-1 px-3 py-2 border border-red-100 rounded-lg text-[12px] font-bold text-red-500 hover:bg-red-50 disabled:opacity-50">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <p className="text-[16px] font-extrabold text-[#071A2B] mb-4">{modal === 'add' ? 'Add Product' : 'Edit Product'}</p>
            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
            <div className="flex flex-col gap-3">
              {[
                { k: 'name', label: 'Product Name', type: 'text' },
                { k: 'price', label: 'Price (UGX)', type: 'number' },
                { k: 'stock', label: 'Stock Quantity', type: 'number' },
                { k: 'image_url', label: 'Image URL (optional)', type: 'url' },
              ].map(({ k, label, type }) => (
                <div key={k}>
                  <label className="text-[11px] font-bold text-[#64748B] mb-1 block">{label}</label>
                  <input type={type} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]" />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B] resize-none" />
              </div>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#071A2B] cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Active (visible to customers)
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#071A2B] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

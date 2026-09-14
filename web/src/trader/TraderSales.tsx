import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingBag, Plus } from 'lucide-react'
import { tradersApi, type ApiTraderSale, type ApiTraderProduct } from '../lib/api'

const fmt = (n: string | number) => `UGX ${Number(n).toLocaleString()}`

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TraderSales() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [sales, setSales] = useState<ApiTraderSale[]>([])
  const [products, setProducts] = useState<ApiTraderProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ product: '', product_name: '', quantity: '1', unit_price: '', customer_name: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      tradersApi.sales(traderUuid!).then(r => setSales(r.data)),
      tradersApi.products(traderUuid!).then(r => setProducts(r.data)),
    ]).finally(() => setLoading(false))
  }, [traderUuid])

  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0)

  const handleProductChange = (productId: string) => {
    const p = products.find(x => String(x.id) === productId)
    setForm(f => ({ ...f, product: productId, product_name: p?.name ?? '', unit_price: p ? p.price : f.unit_price }))
  }

  const handleSave = async () => {
    if (!form.product_name.trim() || !form.unit_price) { setError('Product name and price are required.'); return }
    setSaving(true); setError('')
    try {
      const total = Number(form.unit_price) * Number(form.quantity)
      const r = await tradersApi.createSale(traderUuid!, {
        product: form.product ? Number(form.product) : null,
        product_name: form.product_name,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        total,
        customer_name: form.customer_name,
        note: form.note,
      })
      setSales(p => [r.data, ...p])
      setModal(false)
      setForm({ product: '', product_name: '', quantity: '1', unit_price: '', customer_name: '', note: '' })
    } catch { setError('Failed to record sale.') }
    finally { setSaving(false) }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShoppingBag size={20} color="#071A2B" />
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">Sales</h1>
        </div>
        <button onClick={() => { setError(''); setModal(true) }} className="flex items-center gap-1.5 px-4 py-2 bg-[#071A2B] text-white text-[13px] font-bold rounded-xl hover:opacity-80">
          <Plus size={14} /> Record Sale
        </button>
      </div>

      {/* Summary */}
      <div className="bg-[#071A2B] rounded-xl p-5 text-white mb-6">
        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
        <p className="text-[28px] font-extrabold text-[#22C55E]">{fmt(totalRevenue)}</p>
        <p className="text-[12px] text-white/40 mt-1">{sales.length} sale{sales.length !== 1 ? 's' : ''} recorded</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : sales.length === 0 ? (
        <p className="text-center text-[#64748B] text-[14px] py-20">No sales recorded yet.</p>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>{['Product', 'Customer', 'Qty', 'Unit Price', 'Total', 'When'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[#94A3B8] uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {sales.map(s => (
                  <tr key={s.uuid}>
                    <td className="px-4 py-3 font-bold text-[#071A2B]">{s.product_name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.customer_name || '—'}</td>
                    <td className="px-4 py-3">{s.quantity}</td>
                    <td className="px-4 py-3">{fmt(s.unit_price)}</td>
                    <td className="px-4 py-3 font-bold text-[#22C55E]">{fmt(s.total)}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{timeAgo(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p className="text-[16px] font-extrabold text-[#071A2B] mb-4">Record Sale</p>
            {error && <p className="text-[12px] text-red-500 mb-3">{error}</p>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Product</label>
                <select value={form.product} onChange={e => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]">
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {!form.product && (
                <div>
                  <label className="text-[11px] font-bold text-[#64748B] mb-1 block">Or enter product name</label>
                  <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]" />
                </div>
              )}
              {[
                { k: 'quantity', label: 'Quantity', type: 'number' },
                { k: 'unit_price', label: 'Unit Price (UGX)', type: 'number' },
                { k: 'customer_name', label: 'Customer Name (optional)', type: 'text' },
              ].map(({ k, label, type }) => (
                <div key={k}>
                  <label className="text-[11px] font-bold text-[#64748B] mb-1 block">{label}</label>
                  <input type={type} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#071A2B]" />
                </div>
              ))}
              {form.unit_price && form.quantity && (
                <p className="text-[12px] font-bold text-[#22C55E]">
                  Total: {fmt(Number(form.unit_price) * Number(form.quantity))}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-[#22C55E] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

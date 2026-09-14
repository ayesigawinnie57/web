import { useEffect, useState } from 'react'
import { Boxes, AlertTriangle, CheckCircle2, PackageX, Plus, RefreshCw } from 'lucide-react'
import { inventoryApi, adminProductsApi, type ApiInventorySummary, type ApiStockMovement, type ApiProduct } from '../../lib/api'

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
}

const TYPE_COLOR: Record<string, string> = {
  in: '#10b981', out: '#ef4444', adjust: '#6366f1', return: '#f59e0b',
}

export default function AdminInventory() {
  const [summary, setSummary] = useState<ApiInventorySummary | null>(null)
  const [movements, setMovements] = useState<ApiStockMovement[]>([])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ product: '', type: 'in', quantity: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [s, m, p] = await Promise.all([
        inventoryApi.summary(),
        inventoryApi.movements(),
        adminProductsApi.listAll(),
      ])
      setSummary(s.data)
      setMovements(Array.isArray(m.data) ? m.data : (m.data as any).results ?? [])
      setProducts(p)
    } catch { setError('Failed to load inventory.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.product || !form.quantity) return
    setSaving(true)
    try {
      await inventoryApi.addMovement({
        product: Number(form.product),
        type: form.type,
        quantity: form.type === 'out' ? -Math.abs(Number(form.quantity)) : Math.abs(Number(form.quantity)),
        note: form.note,
      })
      setModal(false)
      setForm({ product: '', type: 'in', quantity: '', note: '' })
      load()
    } catch { setError('Failed to save movement.') }
    finally { setSaving(false) }
  }

  const stats = summary ? [
    { label: 'Total Products', value: summary.total, icon: Boxes, color: '#6366f1' },
    { label: 'In Stock', value: summary.in_stock, icon: CheckCircle2, color: '#10b981' },
    { label: 'Low Stock', value: summary.low_stock, icon: AlertTriangle, color: '#f59e0b' },
    { label: 'Out of Stock', value: summary.out_of_stock, icon: PackageX, color: '#ef4444' },
  ] : []

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Boxes size={20} color="#071A2B" />
          <h1 className="text-xl font-extrabold text-[#071A2B]">Inventory</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 hover:opacity-70"><RefreshCw size={16} color="#64748B" /></button>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#071A2B] text-white text-[12px] font-bold hover:opacity-80"
          >
            <Plus size={13} /> Add Movement
          </button>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-500 mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {stats.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: color + '18' }}>
                  <Icon size={16} color={color} />
                </div>
                <p className="text-[20px] font-extrabold text-[#071A2B]">{value}</p>
                <p className="text-[11px] text-[#64748B] font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Low / Out of stock alerts */}
          {summary && (summary.low_stock_items.length > 0 || summary.out_of_stock_items.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {summary.low_stock_items.length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                  <p className="text-[12px] font-extrabold text-[#f59e0b] mb-3 uppercase tracking-wide">⚠ Low Stock</p>
                  <div className="flex flex-col gap-2">
                    {summary.low_stock_items.map(i => (
                      <div key={i.id} className="flex justify-between text-[12px]">
                        <span className="text-[#071A2B] font-semibold truncate">{i.name}</span>
                        <span className="text-[#f59e0b] font-bold shrink-0 ml-2">{i.stock} left</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {summary.out_of_stock_items.length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                  <p className="text-[12px] font-extrabold text-[#ef4444] mb-3 uppercase tracking-wide">✕ Out of Stock</p>
                  <div className="flex flex-col gap-2">
                    {summary.out_of_stock_items.map(i => (
                      <div key={i.id} className="flex justify-between text-[12px]">
                        <span className="text-[#071A2B] font-semibold truncate">{i.name}</span>
                        <span className="text-[#ef4444] font-bold shrink-0 ml-2">0</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Movements */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
              <p className="text-[13px] font-extrabold text-[#071A2B]">Recent Stock Movements</p>
            </div>
            {movements.length === 0 ? (
              <p className="text-[12px] text-[#94A3B8] p-5">No movements recorded yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-[#F1F5F9]">
                {movements.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0"
                      style={{ backgroundColor: TYPE_COLOR[m.type] + '18', color: TYPE_COLOR[m.type] }}
                    >
                      {m.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[#071A2B] truncate">{m.product_name}</p>
                      {m.note && <p className="text-[11px] text-[#94A3B8] truncate">{m.note}</p>}
                    </div>
                    <p className="text-[13px] font-extrabold shrink-0" style={{ color: TYPE_COLOR[m.type] }}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] shrink-0">{timeAgo(m.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add movement modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-[16px] font-extrabold text-[#071A2B] mb-4">Add Stock Movement</h2>
            <div className="flex flex-col gap-3">
              <select
                value={form.product}
                onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none"
              >
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none"
              >
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="adjust">Adjustment</option>
                <option value="return">Return</option>
              </select>
              <input
                type="number" min="1"
                placeholder="Quantity"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none"
              />
              <input
                placeholder="Note (optional)"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-bold text-[#64748B]">Cancel</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#071A2B] text-white text-[13px] font-bold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

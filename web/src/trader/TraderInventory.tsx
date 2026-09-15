import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Boxes, Plus, Trash2, ArrowDownToLine, ArrowUpFromLine,
  SlidersHorizontal, X, AlertTriangle, TrendingUp,
} from 'lucide-react'
import { tradersApi, type ApiTraderInventoryItem, type ApiTraderProduct } from '../lib/api'

const fmt = (n: string | number) => `UGX ${Number(n).toLocaleString()}`

type MovementType = 'in' | 'out' | 'adjust' | 'return'

const MOVEMENT_LABELS: Record<MovementType, string> = {
  in: 'Stock In',
  out: 'Stock Out',
  adjust: 'Adjustment',
  return: 'Return',
}

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Out of Stock</span>
  if (qty <= 5) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">Low Stock</span>
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">In Stock</span>
}

export default function TraderInventory() {
  const { traderUuid } = useParams<{ traderUuid: string }>()

  const [items, setItems] = useState<ApiTraderInventoryItem[]>([])
  const [myProducts, setMyProducts] = useState<ApiTraderProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add to inventory modal
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ product: '', quantity: '', cost_price: '', location: '', note: '' })
  const [productSearch, setProductSearch] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit details modal
  const [editItem, setEditItem] = useState<ApiTraderInventoryItem | null>(null)
  const [editForm, setEditForm] = useState({ cost_price: '', location: '', note: '' })
  const [editSaving, setEditSaving] = useState(false)

  // Stock movement modal
  const [moveItem, setMoveItem] = useState<ApiTraderInventoryItem | null>(null)
  const [moveForm, setMoveForm] = useState<{ type: MovementType; quantity: string; note: string }>({ type: 'in', quantity: '', note: '' })
  const [moveSaving, setMoveSaving] = useState(false)
  const [moveError, setMoveError] = useState('')

  useEffect(() => {
    if (!traderUuid) return
    Promise.all([
      tradersApi.inventory(traderUuid).then(({ data }) => setItems(data)),
      tradersApi.products(traderUuid).then(({ data }) => setMyProducts(data)),
    ])
      .catch(() => setError('Failed to load inventory.'))
      .finally(() => setLoading(false))
  }, [traderUuid])

  // Products not yet in inventory
  const inventoriedIds = new Set(items.map(i => i.product))
  const availableProducts = myProducts.filter(p =>
    !inventoriedIds.has(p.id) &&
    (!productSearch.trim() || p.name.toLowerCase().includes(productSearch.toLowerCase()))
  )
  const selectedProduct = myProducts.find(p => String(p.id) === addForm.product)

  // Summary stats
  const totalItems = items.length
  const outOfStock = items.filter(i => i.quantity === 0).length
  const lowStock = items.filter(i => i.quantity > 0 && i.quantity <= 5).length
  const totalValue = items.reduce((s, i) => s + Number(i.cost_price) * i.quantity, 0)

  const openAdd = () => {
    setAddForm({ product: '', quantity: '', cost_price: '', location: '', note: '' })
    setProductSearch(''); setAddError(''); setAddModal(true)
  }

  const handleAdd = async () => {
    if (!addForm.product) { setAddError('Select a product.'); return }
    if (!addForm.quantity) { setAddError('Enter quantity.'); return }
    setAddSaving(true); setAddError('')
    try {
      const { data } = await tradersApi.addInventoryItem(traderUuid!, {
        product: Number(addForm.product),
        quantity: Number(addForm.quantity),
        cost_price: addForm.cost_price || 0,
        location: addForm.location,
        note: addForm.note,
      })
      setItems(prev => [data, ...prev])
      setAddModal(false)
    } catch (e: any) {
      setAddError(e?.response?.data?.detail ?? 'Failed to add.')
    } finally {
      setAddSaving(false)
    }
  }

  const openEdit = (item: ApiTraderInventoryItem) => {
    setEditItem(item)
    setEditForm({ cost_price: item.cost_price, location: item.location, note: item.note })
  }

  const handleEdit = async () => {
    if (!editItem) return
    setEditSaving(true)
    try {
      const { data } = await tradersApi.updateInventoryItem(traderUuid!, editItem.id, editForm)
      setItems(prev => prev.map(i => i.id === editItem.id ? data : i))
      setEditItem(null)
    } finally {
      setEditSaving(false)
    }
  }

  const handleDelete = async (item: ApiTraderInventoryItem) => {
    if (!confirm(`Remove "${item.product_name}" from inventory?`)) return
    await tradersApi.deleteInventoryItem(traderUuid!, item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const openMove = (item: ApiTraderInventoryItem) => {
    setMoveItem(item)
    setMoveForm({ type: 'in', quantity: '', note: '' })
    setMoveError('')
  }

  const handleMove = async () => {
    if (!moveItem) return
    if (!moveForm.quantity || Number(moveForm.quantity) <= 0) { setMoveError('Enter a valid quantity.'); return }
    setMoveSaving(true); setMoveError('')
    try {
      const { data } = await tradersApi.addStockMovement(traderUuid!, moveItem.id, {
        type: moveForm.type,
        quantity: Number(moveForm.quantity),
        note: moveForm.note,
      })
      setItems(prev => prev.map(i => i.id === moveItem.id ? data : i))
      setMoveItem(null)
    } catch (e: any) {
      setMoveError(e?.response?.data?.detail ?? 'Failed.')
    } finally {
      setMoveSaving(false)
    }
  }

  return (
    <div className="p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Boxes size={20} color="#071A2B" />
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">Inventory</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#071A2B] text-white text-[13px] font-bold rounded-xl hover:opacity-80"
        >
          <Plus size={14} /> Add Product
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-[13px] text-red-600 font-semibold rounded-lg flex justify-between">
          {error} <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Items', value: totalItems, color: 'text-[#071A2B]' },
          { label: 'Out of Stock', value: outOfStock, color: 'text-red-500' },
          { label: 'Low Stock', value: lowStock, color: 'text-orange-500' },
          { label: 'Inventory Value', value: fmt(totalValue), color: 'text-[#22C55E]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-1 min-w-0">
            <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide leading-tight">{label}</p>
            <p className={`font-extrabold ${color} break-words leading-tight text-[clamp(14px,3vw,20px)]`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Boxes size={40} color="#CBD5E1" className="mx-auto mb-3" />
          <p className="text-[14px] text-[#64748B]">No inventory yet. Add your first product.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <div className="flex items-center gap-3">
                {item.product_image
                  ? <img src={item.product_image} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  : <div className="w-14 h-14 rounded-xl bg-[#F1F5F9] flex items-center justify-center shrink-0"><Boxes size={22} color="#CBD5E1" /></div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-extrabold text-[#071A2B] truncate">{item.product_name}</p>
                    <StockBadge qty={item.quantity} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    <span className="text-[12px] text-[#64748B]">Qty: <strong className="text-[#071A2B]">{item.quantity}</strong></span>
                    <span className="text-[12px] text-[#64748B]">Cost: <strong className="text-[#071A2B]">{fmt(item.cost_price)}</strong></span>
                    <span className="text-[12px] text-[#64748B]">Price: <strong className="text-[#22C55E]">{fmt(item.product_price)}</strong></span>
                    {item.location && <span className="text-[12px] text-[#64748B]">📍 {item.location}</span>}
                  </div>
                  {item.note && <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{item.note}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openMove(item)}
                    title="Stock movement"
                    className="w-8 h-8 rounded-lg bg-[#22C55E18] flex items-center justify-center hover:opacity-80"
                  >
                    <TrendingUp size={13} color="#22C55E" />
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    title="Edit details"
                    className="w-8 h-8 rounded-lg bg-[#6366f118] flex items-center justify-center hover:opacity-80"
                  >
                    <SlidersHorizontal size={13} color="#6366f1" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    title="Remove"
                    className="w-8 h-8 rounded-lg bg-[#ef444418] flex items-center justify-center hover:opacity-80"
                  >
                    <Trash2 size={13} color="#ef4444" />
                  </button>
                </div>
              </div>
              {item.quantity <= 5 && item.quantity > 0 && (
                <div className="flex items-center gap-1.5 mt-3 bg-orange-50 rounded-lg px-3 py-1.5">
                  <AlertTriangle size={12} color="#f97316" />
                  <span className="text-[12px] font-bold text-orange-600">Only {item.quantity} units left — restock soon</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add to Inventory Modal ── */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-extrabold text-[#071A2B]">Add to Inventory</h2>
              <button onClick={() => setAddModal(false)}><X size={20} color="#071A2B" /></button>
            </div>
            {addError && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-[13px] text-red-600 font-semibold rounded-lg">{addError}</div>}
            <div className="space-y-4">
              {/* Product picker */}
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Product *</label>
                {selectedProduct ? (
                  <div className="flex items-center gap-3 bg-[#F8FAFC] border border-[#22C55E] rounded-xl p-3">
                    {selectedProduct.image_url && <img src={selectedProduct.image_url} className="w-10 h-10 rounded-lg object-cover" />}
                    <p className="flex-1 text-[13px] font-bold text-[#071A2B] truncate">{selectedProduct.name}</p>
                    <button onClick={() => { setAddForm(f => ({ ...f, product: '' })); setProductSearch('') }}><X size={15} color="#64748B" /></button>
                  </div>
                ) : (
                  <>
                    <input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder="Search your products..."
                      className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E] mb-2"
                    />
                    <div className="max-h-44 overflow-y-auto border border-[#E2E8F0] rounded-xl">
                      {availableProducts.length === 0
                        ? <p className="text-[12px] text-[#94A3B8] text-center py-4">No products available</p>
                        : availableProducts.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setAddForm(f => ({ ...f, product: String(p.id), cost_price: p.price, quantity: String(p.stock) }))
                              setProductSearch(p.name)
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] text-left"
                          >
                            {p.image_url && <img src={p.image_url} className="w-9 h-9 rounded-lg object-cover" />}
                            <div>
                              <p className="text-[13px] font-semibold text-[#071A2B]">{p.name}</p>
                              <p className="text-[11px] text-[#64748B]">{fmt(p.price)} · Stock: {p.stock}</p>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'quantity', label: 'Quantity *', placeholder: 'e.g. 50' },
                  { key: 'cost_price', label: 'Cost Price (UGX)', placeholder: 'e.g. 20000' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[13px] font-bold text-[#071A2B] mb-1">{label}</label>
                    <input
                      type="number"
                      value={(addForm as any)[key]}
                      onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Storage Location</label>
                <input
                  value={addForm.location}
                  onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Shelf A3, Warehouse 2"
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Note</label>
                <textarea
                  rows={2}
                  value={addForm.note}
                  onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Optional note..."
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E] resize-none"
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={addSaving}
                className="w-full bg-[#071A2B] text-white py-3 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:opacity-90"
              >
                {addSaving ? 'Adding…' : 'Add to Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Details Modal ── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-extrabold text-[#071A2B]">Edit — {editItem.product_name}</h2>
              <button onClick={() => setEditItem(null)}><X size={20} color="#071A2B" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Cost Price (UGX)</label>
                <input
                  type="number"
                  value={editForm.cost_price}
                  onChange={e => setEditForm(f => ({ ...f, cost_price: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Storage Location</label>
                <input
                  value={editForm.location}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Note</label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E] resize-none"
                />
              </div>
              <button
                onClick={handleEdit}
                disabled={editSaving}
                className="w-full bg-[#071A2B] text-white py-3 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:opacity-90"
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Movement Modal ── */}
      {moveItem && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[17px] font-extrabold text-[#071A2B]">Stock Movement</h2>
              <button onClick={() => setMoveItem(null)}><X size={20} color="#071A2B" /></button>
            </div>
            <p className="text-[12px] text-[#64748B] mb-5">{moveItem.product_name} · Current stock: <strong>{moveItem.quantity}</strong></p>
            {moveError && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-[13px] text-red-600 font-semibold rounded-lg">{moveError}</div>}
            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Movement Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['in', 'out', 'adjust', 'return'] as MovementType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setMoveForm(f => ({ ...f, type: t }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-semibold transition-colors ${
                        moveForm.type === t
                          ? 'bg-[#071A2B] border-[#071A2B] text-white'
                          : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#071A2B]'
                      }`}
                    >
                      {t === 'in' || t === 'return' ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                      {MOVEMENT_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">
                  Quantity {moveForm.type === 'adjust' ? '(+ to add, − to remove)' : '*'}
                </label>
                <input
                  type="number"
                  value={moveForm.quantity}
                  onChange={e => setMoveForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-1">Note</label>
                <input
                  value={moveForm.note}
                  onChange={e => setMoveForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Optional reason..."
                  className="w-full px-3 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#22C55E]"
                />
              </div>

              <button
                onClick={handleMove}
                disabled={moveSaving}
                className="w-full bg-[#22C55E] text-white py-3 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:opacity-90"
              >
                {moveSaving ? 'Saving…' : 'Confirm Movement'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Clock, CheckCircle, Truck, XCircle, Package, ChevronRight, Search } from 'lucide-react'
import { adminOrdersApi, type ApiAdminOrder } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',   color: '#92400e', bg: '#fef3c7' },
  processing: { label: 'Confirmed', color: '#1e40af', bg: '#dbeafe' },
  shipped:    { label: 'Shipped',   color: '#6d28d9', bg: '#ede9fe' },
  delivered:  { label: 'Delivered', color: '#166534', bg: '#dcfce7' },
  cancelled:  { label: 'Cancelled', color: '#991b1b', bg: '#fee2e2' },
}

const TABS = [
  { key: '', label: 'All', icon: ShoppingBag },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'processing', label: 'Confirmed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminOrders() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('')
  const [orders, setOrders] = useState<ApiAdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    adminOrdersApi.list(tab || undefined)
      .then(({ data }) => setOrders(Array.isArray(data) ? data : (data as any).results ?? []))
      .catch(err => setError(parseError(err, 'Failed to load orders.')))
      .finally(() => setLoading(false))
  }, [tab])

  const filtered = search.trim()
    ? orders.filter(o =>
        o.code.toLowerCase().includes(search.toLowerCase()) ||
        o.phone?.toLowerCase().includes(search.toLowerCase()) ||
        o.items.some((i: any) => i.product?.name?.toLowerCase().includes(search.toLowerCase()))
      )
    : orders

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-white shrink-0">
        <div>
          <h1 className="text-[18px] font-extrabold text-[#071A2B]">Orders</h1>
          <p className="text-[12px] text-[#64748B]">{filtered.length} of {orders.length} orders</p>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 h-9 w-64">
          <Search size={13} className="text-[#94A3B8] shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders, phone..."
            className="flex-1 bg-transparent text-[13px] text-[#071A2B] outline-none placeholder-[#94A3B8]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-6 py-3 border-b border-[#E2E8F0] bg-white shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-bold whitespace-nowrap transition-colors ${
              tab === key ? 'bg-[#071A2B] border-[#071A2B] text-white' : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#071A2B]'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {error && <div className="px-6 pt-4"><ErrorBanner message={error} onDismiss={() => setError('')} /></div>}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#94A3B8]">
            <ShoppingBag size={40} />
            <p className="text-[14px] font-semibold">No orders found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-6 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Order</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Items</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Phone</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Total</th>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => {
                    const meta = STATUS_META[order.status] ?? STATUS_META.pending
                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/admin/orders/${order.code}`)}
                        className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3.5">
                          <span className="text-[13px] font-extrabold text-[#071A2B]">{order.code}</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-[200px]">
                          <p className="text-[12px] text-[#64748B] truncate">
                            {order.items.map((i: any) => i.product?.name ?? 'Item').join(', ')}
                          </p>
                          <p className="text-[11px] text-[#94A3B8]">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[12px] text-[#64748B]">{order.phone || '—'}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[12px] text-[#64748B]">{formatDate(order.created_at)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] font-extrabold text-[#22C55E]">UGX {Number(order.total).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <ChevronRight size={16} className="text-[#CBD5E1]" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2 p-4">
              {filtered.map(order => {
                const meta = STATUS_META[order.status] ?? STATUS_META.pending
                return (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/admin/orders/${order.code}`)}
                    className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-left hover:border-[#071A2B] transition-colors w-full"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[14px] font-extrabold text-[#071A2B]">{order.code}</span>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                    </div>
                    <p className="text-[12px] text-[#64748B] truncate mb-2">
                      {order.items.map((i: any) => i.product?.name ?? 'Item').join(', ')}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
                      <span>{formatDate(order.created_at)}</span>
                      <span>·</span>
                      <span className="font-bold text-[#22C55E]">UGX {Number(order.total).toLocaleString()}</span>
                      <ChevronRight size={14} className="ml-auto text-[#CBD5E1]" />
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

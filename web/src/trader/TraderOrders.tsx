import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Package, Clock, ChefHat, CheckCircle2, MapPin } from 'lucide-react'
import { tradersApi, type ApiTraderOrderItem } from '../lib/api'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',  icon: Clock,         dot: 'bg-yellow-400' },
  preparing: { label: 'Preparing',  color: 'bg-blue-50 text-blue-700 border-blue-200',        icon: ChefHat,       dot: 'bg-blue-400' },
  ready:     { label: 'Ready',      color: 'bg-green-50 text-green-700 border-green-200',     icon: CheckCircle2,  dot: 'bg-green-500' },
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting Confirmation', processing: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered',
}

const TABS = [
  { key: '',          label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready',     label: 'Ready' },
]

const money = (v: string | number) => Number(v).toLocaleString()

export default function TraderOrders() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [items, setItems] = useState<ApiTraderOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')
  const [updating, setUpdating] = useState<number | null>(null)

  useEffect(() => {
    if (!traderUuid) return
    setLoading(true)
    tradersApi.orders(traderUuid, tab || undefined)
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [traderUuid, tab])

  const updateStatus = async (item: ApiTraderOrderItem, newStatus: 'pending' | 'preparing' | 'ready') => {
    if (!traderUuid) return
    setUpdating(item.id)
    try {
      const r = await tradersApi.updateOrderItem(traderUuid, item.id, { status: newStatus })
      setItems(prev => prev.map(i => i.id === item.id ? r.data : i))
    } catch {}
    finally { setUpdating(null) }
  }

  const counts = {
    '': items.length,
    pending: items.filter(i => i.status === 'pending').length,
    preparing: items.filter(i => i.status === 'preparing').length,
    ready: items.filter(i => i.status === 'ready').length,
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-[#071A2B]">Orders</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">Orders containing your products — confirm and prepare them</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#F1F5F9] p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-colors flex items-center gap-1.5 ${
              tab === t.key ? 'bg-white text-[#071A2B] shadow-sm' : 'text-[#64748B] hover:text-[#071A2B]'
            }`}>
            {t.label}
            {counts[t.key as keyof typeof counts] > 0 && (
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-[#071A2B] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
              }`}>{counts[t.key as keyof typeof counts]}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-[#64748B]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-[13px]">Loading orders...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 text-[#94A3B8]">
          <Package size={40} strokeWidth={1.5} />
          <p className="text-[14px] font-semibold text-[#071A2B]">No orders yet</p>
          <p className="text-[12px]">Orders containing your products will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const cfg = STATUS_CONFIG[item.status]
            const StatusIcon = cfg.icon
            const isBusy = updating === item.id

            return (
              <div key={item.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3">

                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-extrabold text-[#071A2B] tracking-wide">#{item.order_code}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">
                      {ORDER_STATUS_LABEL[item.order_status] ?? item.order_status}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${cfg.color}`}>
                    <StatusIcon size={11} />
                    {cfg.label}
                  </span>
                </div>

                {/* Product row */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] shrink-0 overflow-hidden">
                    {item.product_image
                      ? <img src={item.product_image} alt="" className="w-full h-full object-contain" />
                      : <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-[#CBD5E1]" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#071A2B] truncate">{item.product_name}</p>
                    <p className="text-[12px] text-[#64748B]">Qty: {item.quantity} · UGX {money(Number(item.price) * item.quantity)}</p>
                  </div>
                </div>

                {/* Delivery address */}
                {item.delivery_address && (
                  <div className="flex items-start gap-1.5 text-[12px] text-[#64748B]">
                    <MapPin size={12} className="shrink-0 mt-0.5 text-[#94A3B8]" />
                    <span className="truncate">{item.delivery_address}</span>
                  </div>
                )}

                {/* Action buttons */}
                {item.order_status !== 'delivered' && item.order_status !== 'cancelled' && (
                  <div className="flex gap-2 pt-1">
                    {item.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(item, 'preparing')}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#1E3A8A] text-white rounded-xl text-[12px] font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 size={13} className="animate-spin" /> : <ChefHat size={13} />}
                        Confirm & Start Preparing
                      </button>
                    )}
                    {item.status === 'preparing' && (
                      <button
                        onClick={() => updateStatus(item, 'ready')}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#16A34A] text-white rounded-xl text-[12px] font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Mark as Ready
                      </button>
                    )}
                    {item.status === 'ready' && (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-[12px] font-bold">
                        <CheckCircle2 size={13} /> Ready for Pickup / Delivery
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-[#94A3B8]">
                  Ordered {new Date(item.order_created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {item.status !== 'pending' && (
                    <> &middot; Status updated {new Date(item.updated_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {item.status_changed_by_name && <> by <span className="font-semibold text-[#64748B]">{item.status_changed_by_name}</span></>}</>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, MapPin, FileText, CheckCircle, Clock, Truck, XCircle, ShoppingBag } from 'lucide-react'
import { adminOrdersApi, type ApiAdminOrder } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'] as const

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:    { label: 'Pending',   color: '#92400e', bg: '#fef3c7', icon: Clock       },
  processing: { label: 'Confirmed', color: '#1e40af', bg: '#dbeafe', icon: Package     },
  shipped:    { label: 'Shipped',   color: '#6d28d9', bg: '#ede9fe', icon: Truck       },
  delivered:  { label: 'Delivered', color: '#166534', bg: '#dcfce7', icon: CheckCircle },
  cancelled:  { label: 'Cancelled', color: '#991b1b', bg: '#fee2e2', icon: XCircle    },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminOrderDetail() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<ApiAdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    adminOrdersApi.get(code!)
      .then(({ data }) => setOrder(data))
      .catch(() => setError('Could not load order details.'))
      .finally(() => setLoading(false))
  }, [code])

  const act = async (action: () => Promise<{ data: ApiAdminOrder }>) => {
    setActing(true)
    setActionError('')
    try {
      const { data } = await action()
      setOrder(data)
      return true
    } catch (e) {
      setActionError(parseError(e, 'Action failed.'))
      return false
    } finally {
      setActing(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) { setActionError('Please enter a cancellation reason.'); return }
    const ok = await act(() => adminOrdersApi.cancel(order!.code, cancelReason.trim()))
    if (ok) {
      setCancelModal(false)
      setCancelReason('')
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
  if (error || !order) return <div className="p-8 text-[#64748B]">{error || 'Order not found.'}</div>

  const meta = STATUS_META[order.status] ?? STATUS_META.pending
  const StatusIcon = meta.icon
  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'
  const currentStep = STATUS_STEPS.indexOf(order.status as any)

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/orders')} className="p-1 hover:opacity-70"><ArrowLeft size={20} color="#071A2B" /></button>
        <div>
          <h1 className="text-xl font-extrabold text-[#071A2B]">Order Details</h1>
          <p className="text-[11px] text-[#64748B]">{order.code}</p>
        </div>
      </div>

      <div className="space-y-4">
        {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError('')} />}
        {/* Status banner */}
        <div className="flex items-center gap-4 rounded-xl p-4" style={{ backgroundColor: meta.bg }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: meta.color }}>
            <StatusIcon size={20} color="#fff" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wide">Status</p>
            <p className="text-[16px] font-extrabold" style={{ color: meta.color }}>{meta.label}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wide">Updated</p>
            <p className="text-[11px] text-[#64748B]">{formatDate(order.updated_at)}</p>
          </div>
        </div>

        {/* Progress */}
        {!isCancelled && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-[13px] font-extrabold text-[#071A2B] mb-4">Order Progress</p>
            <div className="w-full">
              {/* circles + connectors */}
              <div className="flex items-center w-full mb-2">
                {STATUS_STEPS.map((step, i) => {
                  const done = currentStep >= i
                  const active = currentStep === i
                  const StepIcon = STATUS_META[step].icon
                  return (
                    <div key={step} className="flex items-center flex-1 last:flex-none">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                        done ? 'bg-[#22C55E] border-[#22C55E] shadow-md' : 'bg-white border-[#E2E8F0]'
                      } ${active ? 'ring-4 ring-green-100' : ''}`}>
                        <StepIcon size={15} color={done ? '#fff' : '#CBD5E1'} />
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className="flex-1 h-1 mx-1 rounded-full overflow-hidden bg-[#E2E8F0]">
                          <div className={`h-full rounded-full transition-all duration-500 ${
                            currentStep > i ? 'bg-[#22C55E] w-full' : 'w-0'
                          }`} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* labels */}
              <div className="flex w-full">
                {STATUS_STEPS.map((step, i) => {
                  const done = currentStep >= i
                  const active = currentStep === i
                  return (
                    <div key={step} className="flex-1 last:flex-none text-center" style={{ minWidth: 0 }}>
                      <p className={`text-[11px] font-bold truncate ${
                        active ? 'text-[#22C55E]' : done ? 'text-[#071A2B]' : 'text-[#94A3B8]'
                      }`}>{STATUS_META[step].label}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E2E8F0]">
            <ShoppingBag size={14} color="#22C55E" />
            <p className="text-[13px] font-extrabold text-[#071A2B] flex-1">Items</p>
            <span className="text-[11px] text-[#64748B] font-semibold">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
          </div>
          {order.items.map((item: any, i: number) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < order.items.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}>
              {item.product?.image
                ? <img src={item.product.image} className="w-12 h-12 rounded-lg object-cover" />
                : <div className="w-12 h-12 rounded-lg bg-[#F8FAFC] flex items-center justify-center"><Package size={16} color="#CBD5E1" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#071A2B] truncate">{item.product?.name ?? 'Product'}</p>
                <p className="text-[11px] text-[#64748B]">Qty: {item.quantity}</p>
              </div>
              <p className="text-[13px] font-extrabold text-[#071A2B]">UGX {(Number(item.price) * item.quantity).toLocaleString()}</p>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 border-t border-[#E2E8F0]">
            <p className="text-[14px] font-extrabold text-[#071A2B]">Total</p>
            <p className="text-[14px] font-extrabold text-[#22C55E]">UGX {Number(order.total).toLocaleString()}</p>
          </div>
        </div>

        {/* Delivery info */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E2E8F0]">
            <MapPin size={14} color="#22C55E" />
            <p className="text-[13px] font-extrabold text-[#071A2B]">Delivery Info</p>
          </div>
          <div className="grid grid-cols-2 gap-4 px-4 py-3">
            <div>
              <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-1">Address</p>
              <p className="text-[13px] text-[#071A2B] font-semibold">{order.delivery_address || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-1">Phone</p>
              <p className="text-[13px] text-[#071A2B] font-semibold">{order.phone || '—'}</p>
            </div>
          </div>
          {!!order.note && (
            <div className="flex gap-2 px-4 py-3 border-t border-[#E2E8F0]">
              <FileText size={13} color="#94A3B8" className="mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-1">Note</p>
                <p className="text-[13px] text-[#071A2B] font-semibold">{order.note}</p>
              </div>
            </div>
          )}
        </div>

        {/* Cancel reason */}
        {isCancelled && !!order.cancel_reason && (
          <div className="flex gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
            <XCircle size={14} color="#991b1b" className="mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-red-700 font-bold uppercase tracking-wide mb-1">Cancellation Reason</p>
              <p className="text-[13px] text-red-800 font-semibold">{order.cancel_reason}</p>
            </div>
          </div>
        )}

        {/* Admin actions */}
        {!isCancelled && !isDelivered && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-[13px] font-extrabold text-[#071A2B] mb-3">Admin Actions</p>
            <div className="flex gap-2 flex-wrap">
              {order.status === 'pending' && (
                <button
                  onClick={() => act(() => adminOrdersApi.confirm(order.code))}
                  disabled={acting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-[13px] font-bold hover:opacity-80 disabled:opacity-50"
                >
                  <CheckCircle size={15} /> Confirm
                </button>
              )}
              {order.status === 'processing' && (
                <button
                  onClick={() => act(() => adminOrdersApi.ship(order.code))}
                  disabled={acting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-[13px] font-bold hover:opacity-80 disabled:opacity-50"
                >
                  <Truck size={15} /> Mark Shipped
                </button>
              )}
              {order.status === 'shipped' && (
                <button
                  onClick={() => act(() => adminOrdersApi.deliver(order.code))}
                  disabled={acting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 text-[13px] font-bold hover:opacity-80 disabled:opacity-50"
                >
                  <CheckCircle size={15} /> Mark Delivered
                </button>
              )}
              <button
                onClick={() => setCancelModal(true)}
                disabled={acting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 text-[13px] font-bold hover:opacity-80 disabled:opacity-50"
              >
                <XCircle size={15} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-[17px] font-extrabold text-[#071A2B] mb-1">Cancel Order</h2>
            <p className="text-[13px] text-[#64748B] mb-4">Provide a reason for cancellation.</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
              className="w-full px-3 py-3 border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#071A2B] resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelModal(false); setCancelReason('') }}
                className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[14px] font-bold text-[#64748B] hover:opacity-80"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={acting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[14px] font-bold disabled:opacity-60 hover:opacity-90"
              >
                {acting ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

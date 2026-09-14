import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, MapPin, FileText, CheckCircle, Clock, Truck, XCircle, ShoppingBag, Phone } from 'lucide-react'
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
    if (ok) { setCancelModal(false); setCancelReason('') }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
  if (error || !order) return <div className="p-6 text-[#64748B]">{error || 'Order not found.'}</div>

  const meta = STATUS_META[order.status] ?? STATUS_META.pending
  const StatusIcon = meta.icon
  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'
  const currentStep = STATUS_STEPS.indexOf(order.status as any)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E2E8F0] bg-white shrink-0">
        <button onClick={() => navigate('/admin/orders')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] transition-colors">
          <ArrowLeft size={18} color="#071A2B" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-extrabold text-[#071A2B]">Order {order.code}</h1>
          <p className="text-[12px] text-[#64748B]">{formatDate(order.created_at)}</p>
        </div>
        <span className="text-[12px] font-bold px-3 py-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {actionError && <div className="mb-4"><ErrorBanner message={actionError} onDismiss={() => setActionError('')} /></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left column — items + progress */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Progress */}
            {!isCancelled && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
                <p className="text-[13px] font-extrabold text-[#071A2B] mb-5">Order Progress</p>
                <div className="flex items-center w-full mb-3">
                  {STATUS_STEPS.map((step, i) => {
                    const done = currentStep >= i
                    const active = currentStep === i
                    const StepIcon = STATUS_META[step].icon
                    return (
                      <div key={step} className="flex items-center flex-1 last:flex-none">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                          done ? 'bg-[#22C55E] border-[#22C55E] shadow-sm' : 'bg-white border-[#E2E8F0]'
                        } ${active ? 'ring-4 ring-green-100' : ''}`}>
                          <StepIcon size={16} color={done ? '#fff' : '#CBD5E1'} />
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className="flex-1 h-1 mx-1.5 rounded-full overflow-hidden bg-[#E2E8F0]">
                            <div className={`h-full rounded-full transition-all duration-500 ${currentStep > i ? 'bg-[#22C55E] w-full' : 'w-0'}`} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex w-full">
                  {STATUS_STEPS.map((step, i) => {
                    const done = currentStep >= i
                    const active = currentStep === i
                    return (
                      <div key={step} className="flex-1 last:flex-none text-center" style={{ minWidth: 0 }}>
                        <p className={`text-[11px] font-bold truncate ${active ? 'text-[#22C55E]' : done ? 'text-[#071A2B]' : 'text-[#94A3B8]'}`}>
                          {STATUS_META[step].label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E2E8F0]">
                <ShoppingBag size={14} color="#22C55E" />
                <p className="text-[13px] font-extrabold text-[#071A2B] flex-1">Order Items</p>
                <span className="text-[11px] text-[#64748B] font-semibold">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
              </div>
              {order.items.map((item: any, i: number) => (
                <div key={item.id} className={`flex items-center gap-3 px-5 py-3.5 ${i < order.items.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}>
                  {item.product?.image
                    ? <img src={item.product.image} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0"><Package size={16} color="#CBD5E1" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#071A2B] truncate">{item.product?.name ?? 'Product'}</p>
                    <p className="text-[11px] text-[#64748B]">Qty: {item.quantity} · UGX {Number(item.price).toLocaleString()} each</p>
                  </div>
                  <p className="text-[13px] font-extrabold text-[#071A2B] shrink-0">UGX {(Number(item.price) * item.quantity).toLocaleString()}</p>
                </div>
              ))}
              {/* Totals */}
              <div className="border-t border-[#E2E8F0] px-5 py-3 space-y-1.5">
                <div className="flex justify-between text-[12px] text-[#64748B]">
                  <span>Subtotal</span>
                  <span>UGX {Number(order.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[12px] text-[#64748B]">
                  <span>Delivery Fee</span>
                  <span>UGX {Number(order.delivery_fee).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[14px] font-extrabold text-[#071A2B] pt-1 border-t border-[#E2E8F0]">
                  <span>Total</span>
                  <span className="text-[#22C55E]">UGX {Number(order.total).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cancel reason */}
            {isCancelled && !!order.cancel_reason && (
              <div className="flex gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                <XCircle size={15} color="#991b1b" className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-red-700 font-bold uppercase tracking-wide mb-1">Cancellation Reason</p>
                  <p className="text-[13px] text-red-800 font-semibold">{order.cancel_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right column — delivery info + actions */}
          <div className="flex flex-col gap-4">

            {/* Status card */}
            <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: meta.bg }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: meta.color }}>
                <StatusIcon size={18} color="#fff" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: meta.color }}>Current Status</p>
                <p className="text-[15px] font-extrabold" style={{ color: meta.color }}>{meta.label}</p>
              </div>
            </div>

            {/* Delivery info */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E2E8F0]">
                <MapPin size={14} color="#22C55E" />
                <p className="text-[13px] font-extrabold text-[#071A2B]">Delivery Info</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-0.5">Address</p>
                    <p className="text-[13px] text-[#071A2B] font-semibold">{order.delivery_address || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-0.5">Phone</p>
                    <p className="text-[13px] text-[#071A2B] font-semibold">{order.phone || '—'}</p>
                  </div>
                </div>
                {!!order.note && (
                  <div className="flex items-start gap-2">
                    <FileText size={13} className="text-[#94A3B8] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-0.5">Note</p>
                      <p className="text-[13px] text-[#071A2B] font-semibold">{order.note}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Admin actions */}
            {!isCancelled && !isDelivered && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
                <p className="text-[13px] font-extrabold text-[#071A2B] mb-3">Actions</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCancelModal(true)}
                    disabled={acting}
                    className="flex items-center justify-center gap-1 flex-1 px-2 py-2.5 rounded-xl bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <XCircle size={15} /> Cancel Order
                  </button>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => act(() => adminOrdersApi.confirm(order.code))}
                      disabled={acting}
                      className="flex items-center justify-center gap-1 flex-1 px-2 py-2.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      <CheckCircle size={15} /> {acting ? 'Processing...' : 'Confirm Order'}
                    </button>
                  )}
                  {order.status === 'processing' && (
                    <button
                      onClick={() => act(() => adminOrdersApi.ship(order.code))}
                      disabled={acting}
                      className="flex items-center justify-center gap-1 flex-1 px-2 py-2.5 rounded-xl bg-purple-600 text-white text-[11px] font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      <Truck size={15} /> {acting ? 'Processing...' : 'Mark as Shipped'}
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => act(() => adminOrdersApi.deliver(order.code))}
                      disabled={acting}
                      className="flex items-center justify-center gap-1 flex-1 px-2 py-2.5 rounded-xl bg-green-600 text-white text-[11px] font-bold hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      <CheckCircle size={15} /> {acting ? 'Processing...' : 'Mark as Delivered'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-[17px] font-extrabold text-[#071A2B] mb-1">Cancel Order</h2>
            <p className="text-[13px] text-[#64748B] mb-4">Provide a reason for cancellation.</p>
            {actionError && <div className="mb-3"><ErrorBanner message={actionError} onDismiss={() => setActionError('')} /></div>}
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
                className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[14px] font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={acting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[14px] font-bold disabled:opacity-60 hover:bg-red-600 transition-colors"
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

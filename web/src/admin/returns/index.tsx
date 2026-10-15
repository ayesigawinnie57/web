import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Clock, CreditCard, RotateCcw, Search, UserRound, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminOrdersApi, type AdminReturnRequest } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

type ReturnAction = 'approve' | 'reject' | 'mark-refunded'
type ActionDialog = { item: AdminReturnRequest; action: ReturnAction }

const STATUS_FILTERS = [
  { key: 'all', label: 'All requests' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Refund requested' },
  { key: 'refund_failed', label: 'Refund failed' },
  { key: 'refunded', label: 'Refunded' },
  { key: 'rejected', label: 'Rejected' },
] as const

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800',
  processing: 'bg-blue-50 text-blue-800',
  approved: 'bg-blue-50 text-blue-800',
  refunded: 'bg-green-50 text-green-800',
  rejected: 'bg-slate-100 text-slate-600',
  refund_failed: 'bg-red-50 text-red-700',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-UG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatMoney(amount: string | null | undefined) {
  return `UGX ${Number(amount ?? 0).toLocaleString()}`
}

export default function AdminReturns() {
  const [requests, setRequests] = useState<AdminReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['key']>('all')
  const [dialog, setDialog] = useState<ActionDialog | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [refundVerified, setRefundVerified] = useState(false)
  const [acting, setActing] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    adminOrdersApi.listReturns()
      .then(({ data }) => setRequests(data))
      .catch(err => setError(parseError(err, 'Failed to load return requests.')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()
    return requests.filter(item => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesSearch = !query || [item.order_code, item.customer_name, item.customer_email, item.reason]
        .some(value => value.toLowerCase().includes(query))
      return matchesStatus && matchesSearch
    })
  }, [requests, search, statusFilter])

  const openDialog = (item: AdminReturnRequest, action: ReturnAction) => {
    setAdminNote('')
    setRefundVerified(false)
    setDialog({ item, action })
  }

  const closeDialog = () => {
    if (acting) return
    setDialog(null)
    setAdminNote('')
    setRefundVerified(false)
  }

  const submitAction = async () => {
    if (!dialog) return
    if (dialog.action === 'reject' && !adminNote.trim()) {
      setError('Add a note explaining why the return is being rejected.')
      return
    }
    if (dialog.action === 'mark-refunded' && !refundVerified) {
      setError('Confirm that you verified the refund with the payment provider.')
      return
    }

    setActing(true)
    setError('')
    try {
      const { item, action } = dialog
      const { data } = action === 'approve'
        ? await adminOrdersApi.approveReturn(item.id)
        : action === 'mark-refunded'
          ? await adminOrdersApi.markReturnRefunded(item.id)
          : await adminOrdersApi.rejectReturn(item.id, adminNote.trim())
      setRequests(current => current.map(row => row.id === item.id ? data : row))
      setDialog(null)
      setAdminNote('')
      setRefundVerified(false)
    } catch (err) {
      setError(parseError(err, 'Could not update this return request.'))
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-5 py-4 md:px-6">
        <div>
          <h1 className="text-[18px] font-extrabold text-[#071A2B]">Returns</h1>
          <p className="mt-1 text-[12px] text-[#64748B]">{filteredRequests.length} of {requests.length} requests</p>
        </div>
        <label className="flex h-9 w-full items-center gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 sm:w-72">
          <Search size={14} className="shrink-0 text-[#94A3B8]" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order or customer" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#94A3B8]" />
        </label>
      </header>

      <nav aria-label="Filter return requests" className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#E2E8F0] bg-white px-5 py-3 md:px-6">
        {STATUS_FILTERS.map(filter => (
          <button key={filter.key} onClick={() => setStatusFilter(filter.key)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-bold ${statusFilter === filter.key ? 'border-[#071A2B] bg-[#071A2B] text-white' : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#071A2B]'}`}>
            {filter.label}
          </button>
        ))}
      </nav>

      {error && <div className="px-5 pt-4 md:px-6"><ErrorBanner message={error} onDismiss={() => setError('')} /></div>}

      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#22C55E] border-t-transparent" /></div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-[#94A3B8]"><RotateCcw size={36} /><p className="text-[14px] font-semibold">No return requests found</p></div>
        ) : (
          <div className="mx-auto max-w-5xl space-y-3 p-4 md:p-6">
            {filteredRequests.map(item => (
              <article key={item.id} className="border border-[#E2E8F0] bg-white p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link to={`/admin/orders/${item.order_code}`} className="text-[14px] font-extrabold text-[#071A2B] hover:underline">Order {item.order_code}</Link>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#64748B]"><UserRound size={13} />{item.customer_name} · {item.customer_email}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#94A3B8]"><Clock size={12} />{formatDate(item.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-extrabold text-[#071A2B]">{formatMoney(item.refund_amount ?? item.order_total)}</p>
                    <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-[#64748B]"><CreditCard size={12} />{item.payment_method || item.payment_status || 'Payment details unavailable'}</p>
                  </div>
                </div>

                <div className="mt-4 border-l-2 border-[#CBD5E1] pl-3">
                  <p className="text-[10px] font-bold uppercase text-[#94A3B8]">Customer reason</p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-[#334155]">{item.reason}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-[#E2E8F0] pt-3">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLES[item.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {item.status === 'approved' ? 'Refund requested' : item.status.replace('_', ' ')}
                    </span>
                    {item.admin_note && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[11px] text-[#64748B]">{item.admin_note}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.status === 'pending' && <>
                      <button onClick={() => openDialog(item, 'reject')} className="rounded-md border border-[#E2E8F0] px-3 py-2 text-[12px] font-bold text-[#64748B] hover:bg-[#F8FAFC]">Reject</button>
                      <button onClick={() => openDialog(item, 'approve')} className="rounded-md bg-[#15803D] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#166534]">Review & approve</button>
                    </>}
                    {item.status === 'approved' && <button onClick={() => openDialog(item, 'mark-refunded')} className="rounded-md bg-[#15803D] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#166534]">Confirm refund processed</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {dialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <button aria-label="Close return review" className="absolute inset-0 bg-black/50" onClick={closeDialog} />
          <section role="dialog" aria-modal="true" aria-labelledby="return-dialog-title" className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[#E2E8F0] bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-5 py-4">
              <div>
                <h2 id="return-dialog-title" className="text-[16px] font-extrabold text-[#071A2B]">
                  {dialog.action === 'approve' ? 'Review return request' : dialog.action === 'reject' ? 'Reject return request' : 'Confirm refund'}
                </h2>
                <p className="mt-1 text-[12px] text-[#64748B]">Order {dialog.item.order_code} · {dialog.item.customer_name}</p>
              </div>
              <button onClick={closeDialog} disabled={acting} aria-label="Close" className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-50"><X size={18} /></button>
            </header>

            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div className="bg-[#F8FAFC] p-3"><p className="text-[#64748B]">Customer</p><p className="mt-1 break-all font-semibold text-[#071A2B]">{dialog.item.customer_email}</p></div>
                <div className="bg-[#F8FAFC] p-3"><p className="text-[#64748B]">Refund amount</p><p className="mt-1 font-semibold text-[#071A2B]">{formatMoney(dialog.item.refund_amount ?? dialog.item.order_total)}</p></div>
              </div>
              <div className="border-l-2 border-[#94A3B8] pl-3">
                <p className="text-[10px] font-bold uppercase text-[#64748B]">Customer's reason</p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-[#071A2B]">{dialog.item.reason}</p>
              </div>

              {dialog.action === 'approve' && <div className="flex gap-2 border border-amber-200 bg-amber-50 p-3 text-[12px] leading-5 text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><p>Approving sends a refund request to the original payment provider. It does not confirm that the customer has received the funds.</p></div>}

              {dialog.action === 'reject' && <label className="block text-[12px] font-semibold text-[#334155]">Reason sent to customer
                <textarea value={adminNote} onChange={event => setAdminNote(event.target.value)} rows={4} maxLength={1000} className="mt-2 w-full resize-y border border-[#CBD5E1] p-3 text-[13px] font-normal outline-none focus:border-[#071A2B]" placeholder="Explain why this request cannot be approved." />
              </label>}

              {dialog.action === 'mark-refunded' && <label className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-[12px] leading-5 text-amber-900">
                <input type="checkbox" checked={refundVerified} onChange={event => setRefundVerified(event.target.checked)} className="mt-1" />
                <span>I verified with the payment provider that the refund was processed.</span>
              </label>}

              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
                <button onClick={closeDialog} disabled={acting} className="px-4 py-2 text-[12px] font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
                <button onClick={submitAction} disabled={acting || (dialog.action === 'mark-refunded' && !refundVerified)} className={`inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50 ${dialog.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#15803D] hover:bg-[#166534]'}`}>
                  {acting ? 'Saving...' : <><Check size={14} />{dialog.action === 'approve' ? 'Approve & request refund' : dialog.action === 'reject' ? 'Reject request' : 'Confirm refund'}</>}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
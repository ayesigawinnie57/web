import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Package, CheckCircle, Loader2, X, User, MapPin, Phone, PackageCheck } from 'lucide-react'
import { adminOrdersApi, type ApiAdminOrder } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:          { label: 'Pending',          color: '#92400e', bg: '#fef3c7' },
  processing:       { label: 'Confirmed',        color: '#1e40af', bg: '#dbeafe' },
  shipped:          { label: 'Shipped',          color: '#6d28d9', bg: '#ede9fe' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#166534', bg: '#dcfce7' },
  delivered:        { label: 'Delivered',        color: '#374151', bg: '#f3f4f6' },
  cancelled:        { label: 'Cancelled',        color: '#991b1b', bg: '#fee2e2' },
}

const money = (v: string | number) => Number(v).toLocaleString()

export default function AdminPickupPage() {
  const [query, setQuery]             = useState('')
  const [suggestions, setSuggestions] = useState<ApiAdminOrder[]>([])
  const [suggesting, setSuggesting]   = useState(false)
  const [showDrop, setShowDrop]       = useState(false)
  const [order, setOrder]             = useState<ApiAdminOrder | null>(null)
  const [searching, setSearching]     = useState(false)
  const [searchError, setSearchError] = useState('')
  const [delivering, setDelivering]   = useState(false)
  const [actionError, setActionError] = useState('')
  const [done, setDone]               = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Defined first so useEffect below can reference it
  const loadOrder = useCallback(async (code: string) => {
    setShowDrop(false)
    setSearching(true)
    setSearchError('')
    setOrder(null)
    setDone(false)
    setActionError('')
    try {
      const { data } = await adminOrdersApi.get(code)
      setOrder(data)
    } catch {
      setSearchError('Order not found. Check the order code and try again.')
    } finally {
      setSearching(false)
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-suggest after 4 chars typed
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 4) { setSuggestions([]); setShowDrop(false); return }
    debounceRef.current = setTimeout(async () => {
      setSuggesting(true)
      try {
        const { data } = await adminOrdersApi.list()
        const ql = q.toLowerCase()
        const matches = data.filter(o => o.code.toLowerCase().includes(ql)).slice(0, 6)
        setSuggestions(matches)
        // Exact full-code match — auto-load immediately
        const exact = matches.find(o => o.code.toLowerCase() === ql)
        if (exact) {
          setShowDrop(false)
          loadOrder(exact.code)
        } else {
          setShowDrop(matches.length > 0)
        }
      } catch {
        setSuggestions([])
      } finally {
        setSuggesting(false)
      }
    }, 350)
  }, [query, loadOrder])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const code = query.trim()
    if (code) loadOrder(code)
  }

  const handleSuggestionClick = (o: ApiAdminOrder) => {
    setQuery(o.code)
    loadOrder(o.code)
  }

  const handleDeliver = async () => {
    if (!order) return
    setDelivering(true)
    setActionError('')
    try {
      const { data } = await adminOrdersApi.deliver(order.code)
      setOrder(data)
      setDone(true)
    } catch (e) {
      setActionError(parseError(e, 'Failed to mark as delivered.'))
    } finally {
      setDelivering(false)
    }
  }

  const reset = () => {
    setQuery(''); setOrder(null); setDone(false)
    setSearchError(''); setActionError(''); setSuggestions([]); setShowDrop(false)
  }

  const isEligible = order?.status === 'ready_for_pickup'
  const meta = order ? (STATUS_META[order.status] ?? STATUS_META.pending) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E2E8F0] bg-white shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#DCFCE7] flex items-center justify-center shrink-0">
          <PackageCheck size={18} color="#16A34A" />
        </div>
        <div>
          <h1 className="text-[17px] font-extrabold text-[#071A2B]">Pickup Desk</h1>
          <p className="text-[12px] text-[#64748B]">Search an order code to confirm in-store customer pickup</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">

          {/* Search bar */}
          <div ref={wrapRef} className="relative max-w-xl mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-4 h-12 focus-within:border-[#071A2B] transition-colors shadow-sm">
                {searching || suggesting
                  ? <Loader2 size={15} className="text-[#94A3B8] shrink-0 animate-spin" />
                  : <Search size={15} className="text-[#94A3B8] shrink-0" />
                }
                <input
                  value={query}
                  onChange={e => { setQuery(e.target.value); setSearchError('') }}
                  onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                  placeholder="Type order code — suggestions appear after 4 characters"
                  className="flex-1 text-[14px] text-[#071A2B] placeholder-[#94A3B8] outline-none bg-transparent"
                  autoFocus
                  autoComplete="off"
                />
                {query && (
                  <button type="button" onClick={reset}>
                    <X size={14} className="text-[#94A3B8] hover:text-[#071A2B]" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="h-12 px-5 bg-[#071A2B] text-white rounded-xl text-[13px] font-bold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0 shadow-sm"
              >
                <Search size={14} /> Search
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showDrop && suggestions.length > 0 && (
              <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden">
                <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] border-b border-[#F1F5F9]">
                  Matching Orders
                </p>
                {suggestions.map(o => {
                  const m = STATUS_META[o.status] ?? STATUS_META.pending
                  return (
                    <button
                      key={o.code}
                      type="button"
                      onClick={() => handleSuggestionClick(o)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F8FAFC] transition-colors border-b border-[#F1F5F9] last:border-0 text-left"
                    >
                      <div>
                        <p className="text-[13px] font-bold text-[#071A2B]">{o.code}</p>
                        <p className="text-[11px] text-[#64748B]">{o.user_name} · UGX {money(o.total)}</p>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ml-3"
                        style={{ backgroundColor: m.bg, color: m.color }}
                      >
                        {m.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {searchError && (
            <div className="max-w-xl mb-4">
              <ErrorBanner message={searchError} onDismiss={() => setSearchError('')} />
            </div>
          )}

          {/* Success state */}
          {done && order && (
            <div className="max-w-xl bg-[#DCFCE7] border border-[#86EFAC] rounded-2xl p-8 flex flex-col items-center text-center gap-3">
              <CheckCircle size={52} className="text-[#16A34A]" />
              <p className="text-[20px] font-extrabold text-[#166534]">Pickup Confirmed!</p>
              <p className="text-[13px] text-[#166534]">
                Order <strong>#{order.code}</strong> has been marked as delivered to <strong>{order.user_name}</strong>.
              </p>
              <button onClick={reset} className="mt-2 px-8 py-3 bg-[#16A34A] text-white rounded-xl text-[13px] font-bold hover:bg-[#15803D] transition-colors">
                Next Customer →
              </button>
            </div>
          )}

          {/* Order detail — two column layout */}
          {order && !done && (
            <div className="space-y-4">
              {actionError && <div className="max-w-xl"><ErrorBanner message={actionError} onDismiss={() => setActionError('')} /></div>}

              {/* Status banner */}
              <div
                className="flex items-center justify-between px-5 py-3.5 rounded-xl border max-w-xl"
                style={{ backgroundColor: meta!.bg, borderColor: meta!.color + '44' }}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: meta!.color }}>Order Status</p>
                  <p className="text-[16px] font-extrabold" style={{ color: meta!.color }}>{meta!.label}</p>
                </div>
                {isEligible
                  ? <CheckCircle size={22} color={meta!.color} />
                  : <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/70" style={{ color: meta!.color }}>
                      {order.status === 'delivered' ? 'Already delivered' : order.status === 'cancelled' ? 'Cancelled' : 'Not ready yet'}
                    </span>
                }
              </div>

              {/* Two columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Left — customer info + action */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Order Code</p>
                    <p className="text-[20px] font-extrabold text-[#071A2B] tracking-widest mt-0.5">{order.code}</p>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                        <User size={14} color="#64748B" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-0.5">Customer</p>
                        <p className="text-[14px] font-bold text-[#071A2B]">{order.user_name}</p>
                        <p className="text-[12px] text-[#64748B]">{order.user_email}</p>
                      </div>
                    </div>
                    {order.phone && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                          <Phone size={14} color="#64748B" />
                        </div>
                        <div>
                          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-0.5">Phone</p>
                          <p className="text-[14px] font-bold text-[#071A2B]">{order.phone}</p>
                        </div>
                      </div>
                    )}
                    {order.delivery_address && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                          <MapPin size={14} color="#64748B" />
                        </div>
                        <div>
                          <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wide mb-0.5">Address</p>
                          <p className="text-[14px] font-bold text-[#071A2B]">{order.delivery_address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-5 pb-5">
                    {isEligible ? (
                      <button
                        onClick={handleDeliver}
                        disabled={delivering}
                        className="w-full py-3.5 bg-[#16A34A] text-white rounded-xl text-[14px] font-extrabold flex items-center justify-center gap-2 hover:bg-[#15803D] disabled:opacity-60 transition-colors"
                      >
                        {delivering
                          ? <><Loader2 size={16} className="animate-spin" /> Processing...</>
                          : <><CheckCircle size={16} /> Confirm Pickup &amp; Mark Delivered</>
                        }
                      </button>
                    ) : (
                      <div className="w-full py-3.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-[13px] font-bold text-[#94A3B8] text-center cursor-not-allowed select-none">
                        {order.status === 'delivered' ? '✓ Already delivered'
                          : order.status === 'cancelled' ? '✕ Order cancelled'
                          : '⏳ Not yet ready for pickup'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right — items */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Items</p>
                    <span className="text-[11px] font-bold text-[#64748B]">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                        {item.product?.image
                          ? <img src={item.product.image} className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#F1F5F9]" />
                          : <div className="w-11 h-11 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] flex items-center justify-center shrink-0"><Package size={14} color="#CBD5E1" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-[#071A2B] truncate">{item.product?.name ?? 'Product'}</p>
                          <p className="text-[11px] text-[#64748B]">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-[13px] font-extrabold text-[#071A2B] shrink-0">
                          UGX {money(Number(item.price) * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[13px] font-bold text-[#071A2B]">Order Total</span>
                    <span className="text-[16px] font-extrabold text-[#16A34A]">UGX {money(order.total)}</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Empty state */}
          {!order && !done && !searching && !searchError && (
            <div className="max-w-xl flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-4">
                <PackageCheck size={28} color="#94A3B8" />
              </div>
              <p className="text-[15px] font-bold text-[#071A2B] mb-1">Ready to serve a customer?</p>
              <p className="text-[13px] text-[#64748B]">Type at least 4 characters of the order code — matching orders appear automatically.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

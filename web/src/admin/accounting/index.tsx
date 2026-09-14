import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, ShoppingBag, ReceiptText, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { accountingApi, type ApiAccountingSummary, type ApiTransaction } from '../../lib/api'

function fmt(n: number) { return `UGX ${n.toLocaleString()}` }

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
}

const STATUS_COLOR: Record<string, string> = {
  completed: '#10b981', pending: '#f59e0b', failed: '#ef4444', invalid: '#94a3b8', cancelled: '#ef4444',
}

export default function AdminAccounting() {
  const [summary, setSummary] = useState<ApiAccountingSummary | null>(null)
  const [transactions, setTransactions] = useState<ApiTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [s, t] = await Promise.all([accountingApi.summary(), accountingApi.transactions()])
      setSummary(s.data)
      setTransactions(t.data)
    } catch { setError('Failed to load accounting data.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const stats = summary ? [
    { label: 'Total Revenue', value: fmt(summary.total_revenue), icon: TrendingUp, color: '#10b981' },
    { label: 'Pending Payouts', value: fmt(summary.pending_payouts), icon: ReceiptText, color: '#f59e0b' },
    { label: 'Orders Delivered', value: summary.delivered_orders, icon: CheckCircle2, color: '#6366f1' },
    { label: 'Orders Cancelled', value: summary.cancelled_orders, icon: XCircle, color: '#ef4444' },
  ] : []

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <DollarSign size={20} color="#071A2B" />
          <h1 className="text-xl font-extrabold text-[#071A2B]">Accounting</h1>
        </div>
        <button onClick={load} className="p-1.5 hover:opacity-70"><RefreshCw size={16} color="#64748B" /></button>
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
                <p className="text-[15px] font-extrabold text-[#071A2B] leading-tight">{value}</p>
                <p className="text-[11px] text-[#64748B] font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Monthly revenue */}
          {summary!.monthly.length > 0 && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag size={14} color="#22C55E" />
                <p className="text-[13px] font-extrabold text-[#071A2B]">Monthly Revenue</p>
              </div>
              <div className="flex flex-col gap-2">
                {summary!.monthly.slice(-6).map(m => {
                  const max = Math.max(...summary!.monthly.map(x => x.revenue), 1)
                  const pct = (m.revenue / max) * 100
                  return (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="text-[11px] text-[#64748B] w-16 shrink-0">{m.month}</span>
                      <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="h-full bg-[#22C55E] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-[#071A2B] w-28 text-right shrink-0">{fmt(m.revenue)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0]">
              <p className="text-[13px] font-extrabold text-[#071A2B]">Recent Transactions</p>
            </div>
            {transactions.length === 0 ? (
              <p className="text-[12px] text-[#94A3B8] p-5">No transactions yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-[#F1F5F9]">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[#071A2B]">
                        {t.order_code ? `Order #${t.order_code}` : 'Unknown Order'}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">{t.payment_method || 'Pesapal'}</p>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0"
                      style={{ backgroundColor: STATUS_COLOR[t.status] + '18', color: STATUS_COLOR[t.status] }}
                    >
                      {t.status}
                    </span>
                    <p className="text-[13px] font-extrabold text-[#071A2B] shrink-0">{t.currency} {t.amount.toLocaleString()}</p>
                    <p className="text-[11px] text-[#94A3B8] shrink-0">{timeAgo(t.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

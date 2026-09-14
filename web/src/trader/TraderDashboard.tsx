import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingUp, TrendingDown, Package, ShoppingBag, DollarSign, Store } from 'lucide-react'
import { tradersApi, type ApiTraderDashboard, type ApiTraderApplication } from '../lib/api'

const fmt = (n: number) => `UGX ${Number(n).toLocaleString()}`

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: color + '18' }}>
        <Icon size={18} color={color} />
      </div>
      <p className="text-[18px] font-extrabold text-[#071A2B]">{value}</p>
      <p className="text-[12px] text-[#64748B] font-semibold mt-0.5">{label}</p>
    </div>
  )
}

export default function TraderDashboard() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [data, setData] = useState<ApiTraderDashboard | null>(null)
  const [profile, setProfile] = useState<ApiTraderApplication | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      tradersApi.dashboard(traderUuid!).then(r => setData(r.data)),
      tradersApi.profile(traderUuid!).then(r => setProfile(r.data)),
    ]).finally(() => setLoading(false))
  }, [traderUuid])

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#071A2B] flex items-center justify-center">
          <Store size={22} color="#22C55E" />
        </div>
        <div>
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">{profile?.business_name}</h1>
          <p className="text-[12px] text-[#64748B]">{profile?.location} · {profile?.business_type.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Today */}
      <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Today</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Today's Revenue" value={fmt(data?.today_revenue ?? 0)} icon={TrendingUp} color="#22C55E" />
        <StatCard label="Today's Sales" value={String(data?.today_orders ?? 0)} icon={ShoppingBag} color="#6366f1" />
        <StatCard label="Active Products" value={String(data?.active_products ?? 0)} icon={Package} color="#0ea5e9" />
      </div>

      {/* Overall */}
      <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Overall</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Revenue" value={fmt(data?.total_revenue ?? 0)} icon={DollarSign} color="#22C55E" />
        <StatCard label="Total Expenses" value={fmt(data?.total_expenses ?? 0)} icon={TrendingDown} color="#ef4444" />
        <StatCard label="Net Profit" value={fmt(data?.net_profit ?? 0)} icon={TrendingUp} color={data && data.net_profit >= 0 ? '#10b981' : '#ef4444'} />
        <StatCard label="Total Sales" value={String(data?.total_sales ?? 0)} icon={ShoppingBag} color="#f59e0b" />
      </div>

      {/* P&L summary */}
      <div className="bg-[#071A2B] rounded-xl p-6 text-white">
        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-4">Profit & Loss Summary</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Revenue', value: fmt(data?.total_revenue ?? 0), color: '#22C55E' },
            { label: 'Expenses', value: fmt(data?.total_expenses ?? 0), color: '#ef4444' },
            { label: 'Net Profit', value: fmt(data?.net_profit ?? 0), color: data && data.net_profit >= 0 ? '#22C55E' : '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[10px] text-white/40 font-semibold mb-1">{label}</p>
              <p className="text-[16px] font-extrabold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

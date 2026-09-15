import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Store, ChevronRight } from 'lucide-react'
import { tradersApi, type ApiTraderDashboard, type ApiTraderApplication, type ApiTraderSale, type ApiTraderExpense, type ApiTraderInventoryItem, type ApiTraderOrderItem, type ApiTraderProduct } from '../lib/api'

const fmt = (n: number) => `UGX ${Number(n).toLocaleString()}`
const fmtShort = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n)

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <p className="text-[18px] font-extrabold text-[#071A2B]">{value}</p>
      <p className="text-[12px] text-[#64748B] font-semibold mt-0.5">{label}</p>
    </div>
  )
}

function SectionCard({
  title, to, children,
}: { title: string; to: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div
      className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden cursor-pointer hover:border-[#071A2B]/30 transition-colors"
      onClick={() => navigate(to)}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0]">
        <p className="text-[13px] font-extrabold text-[#071A2B]">{title}</p>
        <ChevronRight size={15} color="#94A3B8" />
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Kpi({ label, value, color = 'text-[#071A2B]' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-[clamp(13px,2.5vw,17px)] font-extrabold break-words leading-tight ${color}`}>{value}</p>
    </div>
  )
}

export default function TraderDashboard() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [data, setData] = useState<ApiTraderDashboard | null>(null)
  const [profile, setProfile] = useState<ApiTraderApplication | null>(null)
  const [sales, setSales] = useState<ApiTraderSale[]>([])
  const [expenses, setExpenses] = useState<ApiTraderExpense[]>([])
  const [inventory, setInventory] = useState<ApiTraderInventoryItem[]>([])
  const [orders, setOrders] = useState<ApiTraderOrderItem[]>([])
  const [products, setProducts] = useState<ApiTraderProduct[]>([])
  const [loading, setLoading] = useState(true)

  const href = (to: string) => `/trader/${traderUuid}/${to}`

  useEffect(() => {
    Promise.all([
      tradersApi.dashboard(traderUuid!).then(r => setData(r.data)),
      tradersApi.profile(traderUuid!).then(r => setProfile(r.data)),
      tradersApi.sales(traderUuid!).then(r => setSales(r.data)),
      tradersApi.expenses(traderUuid!).then(r => setExpenses(r.data)),
      tradersApi.inventory(traderUuid!).then(r => setInventory(r.data)),
      tradersApi.orders(traderUuid!).then(r => setOrders(r.data)),
      tradersApi.products(traderUuid!).then(r => setProducts(r.data)),
    ]).finally(() => setLoading(false))
  }, [traderUuid])

  if (loading) return <div className="flex justify-center py-32"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>

  // Derived
  const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0)
  const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount), 0)
  const netProfit = totalRevenue - totalExpenses
  const latestSale = sales[0]

  const outOfStock = inventory.filter(i => i.quantity === 0).length
  const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity <= 5).length
  const inventoryValue = inventory.reduce((s, i) => s + Number(i.cost_price) * i.quantity, 0)

  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const preparingOrders = orders.filter(o => o.status === 'preparing').length
  const readyOrders = orders.filter(o => o.status === 'ready').length

  const activeProducts = products.filter(p => p.is_active).length

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
        <StatCard label="Today's Revenue" value={fmt(data?.today_revenue ?? 0)} />
        <StatCard label="Today's Sales" value={String(data?.today_orders ?? 0)} />
        <StatCard label="Active Products" value={String(data?.active_products ?? 0)} />
      </div>

      {/* P&L summary */}
      <div className="bg-[#071A2B] rounded-xl p-6 text-white mb-8">
        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-4">Profit & Loss</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Revenue', value: fmt(data?.total_revenue ?? 0), color: '#22C55E' },
            { label: 'Expenses', value: fmt(data?.total_expenses ?? 0), color: '#ef4444' },
            { label: 'Net Profit', value: fmt(data?.net_profit ?? 0), color: data && data.net_profit >= 0 ? '#22C55E' : '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[10px] text-white/40 font-semibold mb-1">{label}</p>
              <p className="text-[clamp(13px,2.5vw,16px)] font-extrabold break-words" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Page summaries */}
      <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Overview</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Sales */}
        <SectionCard title="Sales" to={href('sales')}>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Total Revenue" value={`UGX ${fmtShort(totalRevenue)}`} color="text-[#22C55E]" />
            <Kpi label="Total Sales" value={String(sales.length)} />
          </div>
          {latestSale ? (
            <div className="bg-[#F8FAFC] rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-0.5">Latest Sale</p>
              <p className="text-[12px] font-bold text-[#071A2B] truncate">{latestSale.product_name}</p>
              <p className="text-[11px] text-[#22C55E] font-semibold">{fmt(Number(latestSale.total))}</p>
            </div>
          ) : (
            <p className="text-[12px] text-[#94A3B8]">No sales yet.</p>
          )}
        </SectionCard>

        {/* Accounting */}
        <SectionCard title="Accounting" to={href('accounting')}>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Kpi label="Revenue" value={`UGX ${fmtShort(totalRevenue)}`} color="text-[#22C55E]" />
            <Kpi label="Expenses" value={`UGX ${fmtShort(totalExpenses)}`} color="text-red-500" />
            <Kpi
              label="Net Profit"
              value={`UGX ${fmtShort(Math.abs(netProfit))}${netProfit < 0 ? ' loss' : ''}`}
              color={netProfit >= 0 ? 'text-[#10b981]' : 'text-red-500'}
            />
          </div>
          <div className={`rounded-lg px-3 py-2 ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-[12px] font-bold ${netProfit >= 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
              {netProfit >= 0 ? '✓ Profitable' : '⚠ Running at a loss'}
            </p>
          </div>
        </SectionCard>

        {/* Inventory */}
        <SectionCard title="Inventory" to={href('inventory')}>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Total Items" value={String(inventory.length)} />
            <Kpi label="Inventory Value" value={`UGX ${fmtShort(inventoryValue)}`} color="text-[#22C55E]" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {outOfStock > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{outOfStock} out of stock</span>
            )}
            {lowStock > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">{lowStock} low stock</span>
            )}
            {outOfStock === 0 && lowStock === 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">All stocked</span>
            )}
          </div>
        </SectionCard>

        {/* Orders */}
        <SectionCard title="Orders" to={href('orders')}>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Kpi label="Pending" value={String(pendingOrders)} color={pendingOrders > 0 ? 'text-orange-500' : 'text-[#071A2B]'} />
            <Kpi label="Preparing" value={String(preparingOrders)} color="text-[#6366f1]" />
            <Kpi label="Ready" value={String(readyOrders)} color="text-[#22C55E]" />
          </div>
          <p className="text-[12px] text-[#64748B]">{orders.length} total order items</p>
        </SectionCard>

        {/* Products */}
        <SectionCard title="Products" to={href('products')}>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Total Products" value={String(products.length)} />
            <Kpi label="Active" value={String(activeProducts)} color="text-[#22C55E]" />
          </div>
          <p className="text-[12px] text-[#64748B]">{products.length - activeProducts} hidden / inactive</p>
        </SectionCard>

        {/* Flash Sales */}
        <SectionCard title="Flash Sales" to={href('flashsales')}>
          <p className="text-[12px] text-[#64748B]">Manage time-limited deals and discounts on your products.</p>
        </SectionCard>

      </div>
    </div>
  )
}

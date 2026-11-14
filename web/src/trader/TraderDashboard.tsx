import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Store, ChevronRight, Megaphone, Package } from 'lucide-react'
import { advertisingApi, cloudinaryUrl, productsApi, tradersApi, type ApiAdvertisingDashboard, type ApiCatalogProduct, type ApiTraderDashboard, type ApiTraderApplication, type ApiTraderSale, type ApiTraderExpense, type ApiTraderInventoryItem, type ApiTraderOrderItem, type ApiTraderProduct, type ApiTraderWallet } from '../lib/api'

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
  const [wallet, setWallet] = useState<ApiTraderWallet | null>(null)
  const [advertising, setAdvertising] = useState<ApiAdvertisingDashboard | null>(null)
  const [advertisingError, setAdvertisingError] = useState(false)
  const [sharedCatalog, setSharedCatalog] = useState<ApiCatalogProduct[]>([])
  const [sharedCatalogLoading, setSharedCatalogLoading] = useState(true)
  const [sharedCatalogError, setSharedCatalogError] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
      tradersApi.wallet(traderUuid!).then(r => setWallet(r.data)),
    ]).finally(() => setLoading(false))
  }, [traderUuid])

  useEffect(() => {
    if (!traderUuid) return
    let active = true
    advertisingApi.dashboard(traderUuid)
      .then(({ data: result }) => {
        if (active) {
          setAdvertising(result)
          setAdvertisingError(false)
        }
      })
      .catch(() => { if (active) setAdvertisingError(true) })
    return () => { active = false }
  }, [traderUuid])

  useEffect(() => {
    let active = true
    productsApi.browseCatalog()
      .then(({ data: result }) => {
        if (active) {
          setSharedCatalog(result.results.slice(0, 4))
          setSharedCatalogError(false)
        }
      })
      .catch(() => { if (active) setSharedCatalogError(true) })
      .finally(() => { if (active) setSharedCatalogLoading(false) })
    return () => { active = false }
  }, [])

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

      <section className="mb-8 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-extrabold text-[#071A2B]">Products available to sell</h2>
            <p className="mt-1 text-[11px] text-[#64748B]">Approved shared products are available to every trader.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(href('products'))}
            className="text-[11px] font-bold text-[#16A34A]"
          >
            Browse all products →
          </button>
        </div>
        {sharedCatalogError ? (
          <p role="status" className="py-4 text-[12px] text-[#64748B]">Shared catalog is unavailable. Open Products to retry.</p>
        ) : sharedCatalogLoading ? (
          <p className="py-4 text-[12px] text-[#64748B]">Loading shared products…</p>
        ) : sharedCatalog.length === 0 ? (
          <p className="py-4 text-[12px] text-[#64748B]">No approved shared products are available yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sharedCatalog.map(product => {
              const imageUrl = product.image_references[0]
                ? cloudinaryUrl(product.image_references[0])
                : null
              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => navigate(href('products'))}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-[#E2E8F0] p-3 text-left hover:border-[#22C55E]"
                >
                  {imageUrl
                    ? <img src={imageUrl} alt={product.name} className="h-12 w-12 shrink-0 rounded-lg bg-[#F1F5F9] object-contain" />
                    : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F1F5F9]"><Package size={18} className="text-[#94A3B8]" /></span>}
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-[#071A2B]">{product.name}</span>
                    <span className="mt-1 block text-[10px] text-[#64748B]">{product.category_name || 'Shared catalog'}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Today */}
      <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Today</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Today's Revenue" value={fmt(data?.today_revenue ?? 0)} />
        <StatCard label="Today's Sales" value={String(data?.today_orders ?? 0)} />
        <StatCard label="Active Products" value={String(data?.active_products ?? 0)} />
      </div>

      {wallet && (
        <button
          type="button"
          onClick={() => navigate(href('payments'))}
          className="mb-8 block w-full rounded-xl border border-[#E2E8F0] bg-white p-5 text-left transition-colors hover:border-[#22C55E]"
        >
          <div className="mb-4">
            <h2 className="text-[14px] font-extrabold text-[#071A2B]">Payments & product earnings</h2>
            <p className="mt-1 text-[11px] text-[#64748B]">Earnings use the price you listed. New paid-order earnings stay locked for {wallet.payout_hold_days} days, then become available automatically.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Earned" value={fmt(Number(wallet.total_earned))} />
            <StatCard label="Locked" value={fmt(Number(wallet.locked_balance))} />
            <StatCard label="Pending Withdrawal" value={fmt(Number(wallet.pending_withdrawal))} />
            <StatCard label="Available" value={fmt(Number(wallet.available_balance))} />
          </div>
          {wallet.next_release_at && Number(wallet.locked_balance) > 0 && (
            <p className="mt-3 text-[11px] text-[#64748B]">Next funds unlock: {new Date(wallet.next_release_at).toLocaleString()}</p>
          )}
          {wallet.payout_account.method ? (
            <p className="mt-2 text-[11px] text-[#64748B]">
              Payout destination: {wallet.payout_account.method === 'bank' ? 'Bank' : 'Mobile Money'} · {wallet.payout_account.provider} · {wallet.payout_account.account_number}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-orange-600">Set your bank or mobile-money payout account to request withdrawals.</p>
          )}
          <p className="mt-3 text-[11px] font-bold text-[#16A34A]">Open Payments to view release progress and request a withdrawal →</p>
        </button>
      )}

      <button
        type="button"
        onClick={() => navigate(href('advertising'))}
        className="mb-8 block w-full rounded-xl border border-[#E2E8F0] bg-white p-5 text-left transition-colors hover:border-[#22C55E]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-[#1E3A8A]" />
            <h2 className="text-[14px] font-extrabold text-[#071A2B]">Sponsored Products</h2>
          </div>
          <span className="text-[11px] font-bold text-[#1E3A8A]">Manage advertising →</span>
        </div>
        {advertising ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Advertising Wallet" value={fmt(Number(advertising.wallet.balance))} />
            <Kpi label="Active Campaigns" value={String(advertising.stats.active_campaigns)} />
            <Kpi label="Impressions" value={advertising.stats.impressions.toLocaleString()} />
            <Kpi label="Clicks" value={advertising.stats.clicks.toLocaleString()} />
          </div>
        ) : advertisingError ? (
          <p role="status" className="mt-3 text-[11px] text-[#64748B]">Advertising summary is unavailable. Open Advertising to retry.</p>
        ) : (
          <p className="mt-3 text-[11px] text-[#64748B]">Loading advertising wallet and campaign summary…</p>
        )}
      </button>

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

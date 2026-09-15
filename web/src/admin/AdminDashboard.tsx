import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ShieldCheck } from 'lucide-react'
import {
  adminProductsApi, adminFlashSalesApi, adminOrdersApi, adminUsersApi,
  adminPaymentsApi, inventoryApi, accountingApi, tradersApi,
  type ApiAdminOrder, type ApiPayment, type ApiAdminUser,
  type ApiFlashSaleItem, type ApiProduct, type ApiInventorySummary,
  type ApiAccountingDashboard, type ApiTraderApplication,
} from '../lib/api'
import ErrorBanner from './ErrorBanner'

function getCachedUser() {
  try { return JSON.parse(localStorage.getItem('majo_user') ?? 'null') as { name: string } | null } catch { return null }
}

const fmt     = (n: number) => `UGX ${Number(n).toLocaleString()}`
const fmtShort = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n)

function SectionCard({ title, to, children }: { title: string; to: string; children: React.ReactNode }) {
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 md:p-5">
      <p className="text-[clamp(13px,3.5vw,18px)] font-extrabold text-[#071A2B] leading-tight">{value}</p>
      <p className="text-[clamp(9px,2.5vw,12px)] text-[#64748B] font-semibold mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const user = getCachedUser()

  const [products,    setProducts]    = useState<ApiProduct[]>([])
  const [flashSales,  setFlashSales]  = useState<ApiFlashSaleItem[]>([])
  const [orders,      setOrders]      = useState<ApiAdminOrder[]>([])
  const [users,       setUsers]       = useState<ApiAdminUser[]>([])
  const [payments,    setPayments]    = useState<ApiPayment[]>([])
  const [inventory,   setInventory]   = useState<ApiInventorySummary | null>(null)
  const [accounting,  setAccounting]  = useState<ApiAccountingDashboard | null>(null)
  const [traders,     setTraders]     = useState<ApiTraderApplication[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')

  useEffect(() => {
    Promise.all([
      adminProductsApi.listAll().then(setProducts),
      adminFlashSalesApi.list().then(r => setFlashSales(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])),
      adminOrdersApi.list().then(r => setOrders(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])),
      adminUsersApi.list().then(r => setUsers(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])),
      adminPaymentsApi.list().then(r => setPayments(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])),
      inventoryApi.summary().then(r => setInventory(r.data)),
      accountingApi.dashboard().then(r => setAccounting(r.data)),
      tradersApi.adminList().then(r => setTraders(Array.isArray(r.data) ? r.data : (r.data as any).results ?? [])),
    ])
      .catch(() => setError('Failed to load dashboard data. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  // Derived — orders
  const pendingOrders    = orders.filter(o => o.status === 'pending').length
  const processingOrders = orders.filter(o => o.status === 'processing').length
  const shippedOrders    = orders.filter(o => o.status === 'shipped').length
  const latestOrder      = orders[0]

  // Derived — products
  const activeProducts = products.filter(p => p.stock > 0).length
  const activeFlash    = flashSales.filter(s => s.is_active && !s.is_expired).length

  // Derived — payments
  const completedPayments = payments.filter(p => p.status === 'completed')
  const totalRevenue      = completedPayments.reduce((s, p) => s + Number(p.amount), 0)
  const pendingPayments   = payments.filter(p => p.status === 'pending').length

  // Derived — traders
  const pendingTraders  = traders.filter(t => t.status === 'pending').length
  const approvedTraders = traders.filter(t => t.status === 'approved').length

  // Derived — accounting
  const netProfit = accounting?.net_profit ?? 0

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 md:p-8">

      {/* Welcome header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#071A2B] flex items-center justify-center">
          <ShieldCheck size={22} color="#F97316" />
        </div>
        <div>
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">{user?.name ?? 'Admin'}</h1>
          <p className="text-[12px] text-[#64748B]">Admin Panel · Full control</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* Top stats */}
      <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Today</p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Today's Revenue"  value={fmt(accounting?.today_revenue ?? 0)} />
        <StatCard label="Today's Orders"   value={String(accounting?.today_orders ?? 0)} />
        <StatCard label="Active Products"  value={String(activeProducts)} />
      </div>

      {/* P&L */}
      <div className="bg-[#071A2B] rounded-xl p-6 text-white mb-8">
        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest mb-4">Profit & Loss</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Revenue',    value: fmt(accounting?.total_revenue ?? 0),  color: '#22C55E' },
            { label: 'Expenses',   value: fmt(accounting?.total_expenses ?? 0), color: '#ef4444' },
            { label: 'Net Profit', value: fmt(netProfit), color: netProfit >= 0 ? '#22C55E' : '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[10px] text-white/40 font-semibold mb-1">{label}</p>
              <p className="text-[clamp(13px,2.5vw,16px)] font-extrabold break-words" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section summaries */}
      <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Overview</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Orders */}
        <SectionCard title="Orders" to="/admin/orders">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Kpi label="Pending"    value={String(pendingOrders)}    color={pendingOrders > 0 ? 'text-orange-500' : 'text-[#071A2B]'} />
            <Kpi label="Processing" value={String(processingOrders)} color="text-[#6366f1]" />
            <Kpi label="Shipped"    value={String(shippedOrders)}    color="text-[#22C55E]" />
          </div>
          {latestOrder ? (
            <div className="bg-[#F8FAFC] rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-[#94A3B8] uppercase mb-0.5">Latest Order</p>
              <p className="text-[12px] font-bold text-[#071A2B]">#{latestOrder.code} · {latestOrder.user_name}</p>
              <p className="text-[11px] text-[#22C55E] font-semibold">{fmt(Number(latestOrder.total))}</p>
            </div>
          ) : (
            <p className="text-[12px] text-[#94A3B8]">No orders yet.</p>
          )}
        </SectionCard>

        {/* Accounting */}
        <SectionCard title="Accounting" to="/admin/accounting">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <Kpi label="Revenue"  value={`UGX ${fmtShort(accounting?.total_revenue ?? 0)}`}  color="text-[#22C55E]" />
            <Kpi label="Expenses" value={`UGX ${fmtShort(accounting?.total_expenses ?? 0)}`} color="text-red-500" />
            <Kpi label="Net"      value={`UGX ${fmtShort(Math.abs(netProfit))}${netProfit < 0 ? ' loss' : ''}`} color={netProfit >= 0 ? 'text-[#10b981]' : 'text-red-500'} />
          </div>
          <div className={`rounded-lg px-3 py-2 ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-[12px] font-bold ${netProfit >= 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
              {netProfit >= 0 ? '✓ Profitable' : '⚠ Running at a loss'}
            </p>
          </div>
        </SectionCard>

        {/* Inventory */}
        <SectionCard title="Inventory" to="/admin/inventory">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Total Items" value={String(inventory?.total ?? 0)} />
            <Kpi label="In Stock"    value={String(inventory?.in_stock ?? 0)} color="text-[#22C55E]" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(inventory?.out_of_stock ?? 0) > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">{inventory!.out_of_stock} out of stock</span>
            )}
            {(inventory?.low_stock ?? 0) > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">{inventory!.low_stock} low stock</span>
            )}
            {(inventory?.out_of_stock ?? 0) === 0 && (inventory?.low_stock ?? 0) === 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">All stocked</span>
            )}
          </div>
        </SectionCard>

        {/* Products */}
        <SectionCard title="Products" to="/admin/products">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Total"  value={String(products.length)} />
            <Kpi label="Active" value={String(activeProducts)} color="text-[#22C55E]" />
          </div>
          <p className="text-[12px] text-[#64748B]">{products.length - activeProducts} out of stock / inactive</p>
        </SectionCard>

        {/* Payments */}
        <SectionCard title="Payments" to="/admin/payments">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Total Revenue" value={`UGX ${fmtShort(totalRevenue)}`} color="text-[#22C55E]" />
            <Kpi label="Transactions"  value={String(completedPayments.length)} />
          </div>
          {pendingPayments > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">{pendingPayments} pending</span>
          )}
        </SectionCard>

        {/* Users */}
        <SectionCard title="Users" to="/admin/users">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Registered" value={String(users.length)} />
            <Kpi label="Staff"      value={String(users.filter(u => u.is_staff).length)} color="text-[#F97316]" />
          </div>
          <p className="text-[12px] text-[#64748B]">{users.length} total registered users</p>
        </SectionCard>

        {/* Traders */}
        <SectionCard title="Traders" to="/admin/traders">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Approved" value={String(approvedTraders)} color="text-[#22C55E]" />
            <Kpi label="Pending"  value={String(pendingTraders)}  color={pendingTraders > 0 ? 'text-orange-500' : 'text-[#071A2B]'} />
          </div>
          {pendingTraders > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">{pendingTraders} awaiting review</span>
          )}
        </SectionCard>

        {/* Flash Sales */}
        <SectionCard title="Flash Sales" to="/admin/flashsales">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Kpi label="Active"  value={String(activeFlash)}    color="text-[#F97316]" />
            <Kpi label="Total"   value={String(flashSales.length)} />
          </div>
          <p className="text-[12px] text-[#64748B]">{flashSales.filter(s => s.is_expired).length} expired sales</p>
        </SectionCard>

        {/* Categories */}
        <SectionCard title="Categories" to="/admin/categories">
          <p className="text-[12px] text-[#64748B]">Organise products into categories for easier browsing.</p>
        </SectionCard>

        {/* Data */}
        <SectionCard title="Data Management" to="/admin/data">
          <p className="text-[12px] text-[#64748B]">Export and import products, orders, and user data.</p>
        </SectionCard>

      </div>
    </div>
  )
}

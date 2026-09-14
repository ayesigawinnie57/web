import { useState, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Grid2X2, ShoppingBag, Zap, Users, CreditCard, Menu, X, Search, Bell, Settings, UserCircle, Database, DollarSign, Boxes, Store } from 'lucide-react'
import { LOGO } from '../lib/api'
import { useNotifications } from '../lib/NotificationContext'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/flashsales', label: 'Flash Sales', icon: Zap },
  { to: '/admin/categories', label: 'Categories', icon: Grid2X2 },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/traders', label: 'Traders', icon: Store },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/accounting', label: 'Accounting', icon: DollarSign },
  { to: '/admin/data', label: 'Data', icon: Database },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  const sideNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-5 py-2.5 text-[13px] font-semibold transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
    }`

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
      isActive ? 'text-[#F97316]' : 'text-[#64748B]'
    }`

  const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-5 py-3.5 text-[13px] font-semibold transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
    }`

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">

      {/* Top header */}
      <header className="flex items-center gap-3 px-4 h-14 bg-[#071A2B] border-b border-white/10 shrink-0 z-40">
        <img src={LOGO} alt="Majo Gadgets" className="h-8 w-auto object-contain shrink-0" />
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest shrink-0 hidden sm:block">Admin</span>

        {/* Search bar */}
        <div className="flex-1 flex items-center bg-white/10 rounded-full px-3 h-9 gap-2 max-w-sm mx-auto">
          <Search className="w-3.5 h-3.5 text-white/50 shrink-0" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-[13px] text-white placeholder-white/40 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X className="w-3.5 h-3.5 text-white/50" />
            </button>
          )}
        </div>

        {/* Desktop-only: Notification + Account icons */}
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => navigate('/notifications')} className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-white/70" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/admin/account')} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            <UserCircle className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Menu icon — hidden on desktop since sidebar is visible */}
        <button onClick={() => setDrawerOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0 md:hidden">
          <Menu className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* Right drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[200] flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="ml-auto w-[min(80%,280px)] h-full bg-[#071A2B] shadow-2xl flex flex-col relative z-10">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
              <span className="text-[14px] font-extrabold text-white">Admin Panel</span>
              <button onClick={() => setDrawerOpen(false)}><X className="w-5 h-5 text-white/60" /></button>
            </div>
            <nav className="flex-1 py-2 overflow-y-auto">
              {NAV.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setDrawerOpen(false)} className={drawerLinkClass}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-white/10 p-4 space-y-1">
              <button onClick={() => { navigate('/'); setDrawerOpen(false) }}
                className="w-full flex items-center px-4 py-3 rounded-lg text-[13px] font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                Back to Store
              </button>
              <button onClick={logout}
                className="w-full flex items-center px-4 py-3 rounded-lg text-[13px] font-semibold text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-56 bg-[#071A2B] flex-col shrink-0">
          <nav className="flex-1 py-4 overflow-y-auto">
            {NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={sideNavClass}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-white/10">
            <button onClick={() => navigate('/')} className="w-full flex items-center px-5 py-3.5 text-[13px] font-semibold text-white/40 hover:text-white transition-colors">
              Back to Store
            </button>
            <button onClick={logout} className="w-full flex items-center px-5 py-3.5 text-[13px] font-semibold text-white/40 hover:text-white transition-colors">
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E2E8F0] flex md:hidden">
        <NavLink to="/admin" end className={tabClass}>
          <LayoutDashboard size={20} /><span>Home</span>
        </NavLink>
        <NavLink to="/admin/orders" className={tabClass}>
          <ShoppingBag size={20} /><span>Orders</span>
        </NavLink>
        <NavLink to="/notifications" className={tabClass}>
          <Bell size={20} /><span>Notifications</span>
        </NavLink>
        <NavLink to="/admin/settings" className={tabClass}>
          <Settings size={20} /><span>Settings</span>
        </NavLink>
      </nav>

    </div>
  )
}

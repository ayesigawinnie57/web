import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, DollarSign, LogOut, Store, ChevronLeft, Menu, X } from 'lucide-react'
import { LOGO } from '../lib/api'

const NAV = [
  { to: '', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: 'products', label: 'Products', icon: Package },
  { to: 'sales', label: 'Sales', icon: ShoppingBag },
  { to: 'accounting', label: 'Accounting', icon: DollarSign },
]

export default function TraderLayout() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const href = (to: string) => `/trader/${traderUuid}${to ? `/${to}` : ''}`

  const sideNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-5 py-3 text-[13px] font-semibold transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
    }`

  const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-5 py-3.5 text-[13px] font-semibold transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
    }`

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
      isActive ? 'text-[#22C55E]' : 'text-[#64748B]'
    }`

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">

      {/* Top header */}
      <header className="flex items-center gap-3 px-4 h-14 bg-[#071A2B] border-b border-white/10 shrink-0 z-40">
        <img src={LOGO} alt="Majo Gadgets" className="h-8 w-auto object-contain shrink-0" />
        <div className="flex items-center gap-1.5 shrink-0">
          <Store size={12} className="text-[#22C55E]" />
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest hidden sm:block">Trader Portal</span>
        </div>
        <div className="flex-1" />
        {/* Menu icon — mobile only */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0 md:hidden"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* Right drawer — mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[200] flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="ml-auto w-[min(80%,280px)] h-full bg-[#071A2B] shadow-2xl flex flex-col relative z-10">
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
              <span className="text-[14px] font-extrabold text-white">Trader Portal</span>
              <button onClick={() => setDrawerOpen(false)}><X className="w-5 h-5 text-white/60" /></button>
            </div>
            <nav className="flex-1 py-2 overflow-y-auto">
              {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={label} to={href(to)} end={end} onClick={() => setDrawerOpen(false)} className={drawerLinkClass}>
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-white/10 p-4 space-y-1">
              <button
                onClick={() => { navigate('/'); setDrawerOpen(false) }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ChevronLeft size={14} /> Back to Store
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
              >
                <LogOut size={14} /> Logout
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
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={label} to={href(to)} end={end} className={sideNavClass}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-white/10 p-3 space-y-1">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft size={14} /> Back to Store
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut size={14} /> Logout
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
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={label} to={href(to)} end={end} className={tabClass}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  )
}

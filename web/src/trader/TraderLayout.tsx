import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, DollarSign, LogOut, Store, ChevronLeft } from 'lucide-react'
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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-5 py-3 text-[13px] font-semibold transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
    }`

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-[#071A2B] flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <img src={LOGO} alt="Majo Gadgets" className="h-8 w-auto object-contain" />
          <div className="flex items-center gap-1.5 mt-2">
            <Store size={12} className="text-[#22C55E]" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Trader Portal</span>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={`/trader/${traderUuid}${to ? `/${to}` : ''}`}
              end={end}
              className={linkClass}
            >
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
            onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); navigate('/login') }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

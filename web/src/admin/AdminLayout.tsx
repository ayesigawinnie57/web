import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Grid2X2, ShoppingBag, Zap, Users, CreditCard, LogOut, Home, Menu, X } from 'lucide-react'
import { LOGO } from '../lib/api'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/flashsales', label: 'Flash Sales', icon: Zap },
  { to: '/admin/categories', label: 'Categories', icon: Grid2X2 },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  const goHome = () => {
    setMobileMenuOpen(false)
    navigate('/')
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-5 py-2.5 text-[13px] font-semibold transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:text-white hover:bg-white/5'
    }`

  const navigation = (
    <nav className="flex-1 py-4 overflow-y-auto">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setMobileMenuOpen(false)} className={navClass}>
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[#071A2B] flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <img src={LOGO} alt="Majo Gadgets" className="h-8 w-auto object-contain" />
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">Admin Panel</p>
        </div>
        {navigation}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-5 py-4 text-[13px] font-semibold text-white/40 hover:text-white border-t border-white/10 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      {/* Mobile admin drawer, opened from the fixed bottom bar */}
      {mobileMenuOpen && (
        <>
          <button aria-label="Close admin menu" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-[#071A2B]/45 md:hidden" />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-[#071A2B] flex flex-col md:hidden shadow-2xl">
            <div className="flex items-start justify-between px-5 py-5 border-b border-white/10">
              <div><img src={LOGO} alt="Majo Gadgets" className="h-8 w-auto object-contain" /><p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2">Admin Panel</p></div>
              <button aria-label="Close admin menu" onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>
            {navigation}
            <button onClick={logout} className="flex items-center gap-3 px-5 py-4 text-[13px] font-semibold text-white/40 hover:text-white border-t border-white/10 transition-colors"><LogOut size={16} />Logout</button>
          </aside>
        </>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Fixed mobile admin navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-around md:hidden">
        <button onClick={goHome} className="flex flex-col items-center gap-1 text-[#64748B] text-[10px] font-semibold"><Home size={19} />Home</button>
        <button onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center gap-1 text-[#1E3A8A] text-[10px] font-extrabold"><Menu size={20} />Admin</button>
      </nav>
    </div>
  )
}

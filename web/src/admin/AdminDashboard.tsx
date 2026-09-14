import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, List } from 'lucide-react'
import { adminProductsApi, adminFlashSalesApi, adminUsersApi, type ApiFlashSaleItem } from '../lib/api'
import ErrorBanner from './ErrorBanner'

function getCachedUser() {
  try { return JSON.parse(localStorage.getItem('majo_user') ?? 'null') as { name: string } | null } catch { return null }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const user = getCachedUser()
  const [productCount, setProductCount] = useState(0)
  const [flashSales, setFlashSales] = useState<ApiFlashSaleItem[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      adminProductsApi.list().then(({ data }) => {
        const arr = Array.isArray(data) ? data : (data as any).results ?? []
        setProductCount(arr.length)
      }),
      adminFlashSalesApi.list().then(({ data }) => setFlashSales(Array.isArray(data) ? data : (data as any).results ?? [])),
      adminUsersApi.list().then(({ data }) => setUserCount(Array.isArray(data) ? data.length : (data as any).count ?? 0)),
    ])
      .catch(() => setError('Failed to load dashboard data. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  const activeFlash = flashSales.filter(s => s.is_active && !s.is_expired).length

  const pages = [
    {
      label: 'Products', desc: `${productCount} total products`, color: '#6366f1',
      actions: [{ label: 'View All', route: '/admin/products' }, { label: 'Add New', route: '/admin/products/add' }],
    },
    {
      label: 'Flash Sales', desc: `${activeFlash} active sale${activeFlash !== 1 ? 's' : ''}`, color: '#F97316',
      actions: [{ label: 'Manage', route: '/admin/flashsales' }],
    },
    {
      label: 'Categories', desc: 'Organise your products', color: '#10b981',
      actions: [{ label: 'View All', route: '/admin/categories' }, { label: 'Add New', route: '/admin/categories/add' }],
    },
    {
      label: 'Orders', desc: 'Track & manage orders', color: '#f59e0b',
      actions: [{ label: 'View All', route: '/admin/orders' }],
    },
    {
      label: 'Users', desc: `${userCount} registered user${userCount !== 1 ? 's' : ''}`, color: '#8b5cf6',
      actions: [{ label: 'View All', route: '/admin/users' }],
    },
    {
      label: 'Payments', desc: 'Pesapal transactions', color: '#0ea5e9',
      actions: [{ label: 'View All', route: '/admin/payments' }],
    },
    {
      label: 'Inventory', desc: 'Track stock levels', color: '#6366f1',
      actions: [{ label: 'View All', route: '/admin/inventory' }],
    },
    {
      label: 'Accounting', desc: 'Revenue & expenses', color: '#10b981',
      actions: [{ label: 'View All', route: '/admin/accounting' }],
    },
    {
      label: 'Data Management', desc: 'Export, import & manage data', color: '#8b5cf6',
      actions: [{ label: 'Manage', route: '/admin/data' }],
    },
  ]

  return (
    <div className="p-6 md:p-8">

      {/* Welcome header */}
      <div className="relative rounded-2xl overflow-hidden mb-8 bg-[#071A2B] px-6 py-7">
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -right-2 w-28 h-28 rounded-full bg-white/5" />
        <p className="text-[13px] text-white/50 font-semibold mb-1">Welcome back,</p>
        <h1 className="text-[26px] font-extrabold text-white leading-tight mb-3">
          {user?.name ?? 'Admin'} 😊
        </h1>
        <p className="text-[13px] text-white/60 leading-relaxed max-w-sm">
          This is your admin account. You have full control over <span className="text-white font-semibold">Majo Gadgets</span>. Enjoy managing!
        </p>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <h2 className="text-[15px] font-bold text-[#071A2B] mb-4">Manage</h2>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-3">
          {pages.map(({ label, desc, color, actions }) => (
            <div key={label} className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-extrabold text-[#071A2B]">{label}</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">{desc}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {actions.map(({ label: aLabel, route }) => (
                  <button
                    key={aLabel}
                    onClick={() => navigate(route)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-opacity hover:opacity-80"
                    style={{ borderColor: color + '40', backgroundColor: color + '0d', color }}
                  >
                    {aLabel === 'Add New' ? <Plus size={12} /> : <List size={12} />}
                    {aLabel}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NotificationProvider } from './lib/NotificationContext'
import { lazy, Suspense, useEffect, useState } from 'react'
import { BASE_URL } from './lib/api'

const LandingPage            = lazy(() => import('./landing'))
const ProductPage            = lazy(() => import('./pages/ProductPage'))
const CartPage               = lazy(() => import('./pages/CartPage'))
const CheckoutPage           = lazy(() => import('./pages/CheckoutPage'))
const LoginPage              = lazy(() => import('./pages/LoginPage'))
const RegisterPage           = lazy(() => import('./pages/RegisterPage'))
const ShopPage               = lazy(() => import('./pages/ShopPage'))
const CategoryPage           = lazy(() => import('./pages/CategoryPage'))
const DealsPage              = lazy(() => import('./pages/DealsPage'))
const WishlistPage           = lazy(() => import('./pages/WishlistPage'))
const AccountPage            = lazy(() => import('./pages/AccountPage'))
const OrdersPage             = lazy(() => import('./pages/OrdersPage'))
const OrderDetailPage        = lazy(() => import('./pages/OrderDetailPage'))
const NotificationsPage      = lazy(() => import('./pages/NotificationsPage'))
const NotificationDetailPage = lazy(() => import('./pages/NotificationDetailPage'))
const ForgotPasswordPage     = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage      = lazy(() => import('./pages/ResetPasswordPage'))
const RateOrderPage          = lazy(() => import('./pages/RateOrderPage'))
const ReturnPage       = lazy(() => import('./pages/ReturnPage'))
const BecomeTraderPage = lazy(() => import('./pages/BecomeTraderPage'))

const AdminGuard      = lazy(() => import('./admin/AdminGuard'))
const AdminLayout     = lazy(() => import('./admin/AdminLayout'))
const AdminDashboard  = lazy(() => import('./admin/AdminDashboard'))
const AdminProducts   = lazy(() => import('./admin/products/index'))
const AddProduct      = lazy(() => import('./admin/products/add'))
const EditProduct     = lazy(() => import('./admin/products/[id]'))
const AdminCategories = lazy(() => import('./admin/categories/index'))
const AddCategory     = lazy(() => import('./admin/categories/add'))
const EditCategory    = lazy(() => import('./admin/categories/[id]'))
const AdminOrders     = lazy(() => import('./admin/orders/index'))
const AdminOrderDetail = lazy(() => import('./admin/orders/[code]'))
const AdminFlashSales = lazy(() => import('./admin/flashsales/index'))
const AddFlashSale    = lazy(() => import('./admin/flashsales/add'))
const AdminUsers      = lazy(() => import('./admin/users/index'))
const AdminPayments   = lazy(() => import('./admin/payments/index'))
const AdminAccount    = lazy(() => import('./admin/account'))
const AdminSettings   = lazy(() => import('./admin/settings'))
const AdminData       = lazy(() => import('./admin/data/index'))
const AdminAccounting = lazy(() => import('./admin/accounting/index'))
const AdminInventory  = lazy(() => import('./admin/inventory/index'))
const AdminTraders    = lazy(() => import('./admin/traders/index'))
const TraderGuard      = lazy(() => import('./trader/TraderGuard'))
const TraderLayout     = lazy(() => import('./trader/TraderLayout'))
const TraderDashboard  = lazy(() => import('./trader/TraderDashboard'))
const TraderProducts   = lazy(() => import('./trader/TraderProducts'))
const TraderSales      = lazy(() => import('./trader/TraderSales'))
const TraderAccounting = lazy(() => import('./trader/TraderAccounting'))

function SiteOffline() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">🌐</div>
      <p className="text-[20px] font-extrabold text-[#071A2B] mb-2">This site does not exist</p>
      <p className="text-[13px] text-[#64748B]">Check your network connection</p>
    </div>
  )
}

export default function App() {
  const [uiActive, setUiActive] = useState<boolean | null>(null)
  const isAdmin = (() => { try { return JSON.parse(localStorage.getItem('majo_user') ?? 'null')?.isAdmin === true } catch { return false } })()

  useEffect(() => {
    fetch(`${BASE_URL}/api/settings/platform/`)
      .then(r => r.json()).then(d => setUiActive(!!d.ui_active)).catch(() => setUiActive(true))
  }, [])

  if (uiActive === null) return null
  if (!uiActive && !isAdmin) return <SiteOffline />
  return (
    <NotificationProvider>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/shop/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:code" element={<OrderDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notifications/:slug" element={<NotificationDetailPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/rate/:code" element={<RateOrderPage />} />
          <Route path="/returns" element={<ReturnPage />} />
          <Route path="/become-a-trader" element={<BecomeTraderPage />} />
          <Route element={<TraderGuard />}>
            <Route path="/trader/:traderUuid" element={<TraderLayout />}>
              <Route index element={<TraderDashboard />} />
              <Route path="products" element={<TraderProducts />} />
              <Route path="sales" element={<TraderSales />} />
              <Route path="accounting" element={<TraderAccounting />} />
            </Route>
          </Route>
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/add" element={<AddProduct />} />
              <Route path="products/:id" element={<EditProduct />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="categories/add" element={<AddCategory />} />
              <Route path="categories/:id" element={<EditCategory />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:code" element={<AdminOrderDetail />} />
              <Route path="flashsales" element={<AdminFlashSales />} />
              <Route path="flashsales/add" element={<AddFlashSale />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="account" element={<AdminAccount />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="data" element={<AdminData />} />
              <Route path="accounting" element={<AdminAccounting />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="traders" element={<AdminTraders />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
    </NotificationProvider>
  )
}

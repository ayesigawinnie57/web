import { HashRouter, Routes, Route } from 'react-router-dom'
import { NotificationProvider } from './lib/NotificationContext'
import { useEffect, useState } from 'react'
import { BASE_URL } from './lib/api'
import LandingPage from './landing'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ShopPage from './pages/ShopPage'
import CategoryPage from './pages/CategoryPage'
import DealsPage from './pages/DealsPage'
import AdminGuard from './admin/AdminGuard'
import AdminLayout from './admin/AdminLayout'
import AdminDashboard from './admin/AdminDashboard'
import AdminProducts from './admin/products/index'
import AddProduct from './admin/products/add'
import EditProduct from './admin/products/[id]'
import AdminCategories from './admin/categories/index'
import AddCategory from './admin/categories/add'
import EditCategory from './admin/categories/[id]'
import AdminOrders from './admin/orders/index'
import AdminOrderDetail from './admin/orders/[code]'
import AdminFlashSales from './admin/flashsales/index'
import AddFlashSale from './admin/flashsales/add'
import AdminUsers from './admin/users/index'
import AdminPayments from './admin/payments/index'
import AdminAccount from './admin/account'
import AdminSettings from './admin/settings'
import WishlistPage from './pages/WishlistPage'
import AccountPage from './pages/AccountPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import NotificationDetailPage from './pages/NotificationDetailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import RateOrderPage from './pages/RateOrderPage'

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
    <HashRouter>
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
          </Route>
        </Route>
      </Routes>
    </HashRouter>
    </NotificationProvider>
  )
}

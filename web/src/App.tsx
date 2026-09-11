import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NotificationProvider } from './lib/NotificationContext'
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
import WishlistPage from './pages/WishlistPage'
import NotificationsPage from './pages/NotificationsPage'
import NotificationDetailPage from './pages/NotificationDetailPage'

export default function App() {
  return (
    <NotificationProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
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
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/notifications/:slug" element={<NotificationDetailPage />} />
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
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </NotificationProvider>
  )
}

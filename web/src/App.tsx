import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom'
import { NotificationProvider } from './lib/NotificationContext'
import { SwitchProvider, useSwitchPortal } from './lib/SwitchContext'
import { lazy, Suspense, useEffect, useState } from 'react'
import { BASE_URL, sessionApi } from './lib/api'
import CookieBanner from './components/CookieBanner'
import SwitchTransition from './components/SwitchTransition'

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
const RateProductPage        = lazy(() => import('./pages/RateProductPage'))
const ReturnPage             = lazy(() => import('./pages/ReturnPage'))
const RequestReturnPage      = lazy(() => import('./pages/RequestReturnPage'))
const HelpCenterPage         = lazy(() => import('./pages/HelpCenterPage'))
const AboutPage              = lazy(() => import('./pages/AboutPage'))
const ContactUsPage          = lazy(() => import('./pages/ContactUsPage'))
const PaymentPage            = lazy(() => import('./pages/PaymentPage'))
const PrivacyPolicyPage      = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsPage              = lazy(() => import('./pages/TermsPage'))
const CookiesPage            = lazy(() => import('./pages/CookiesPage'))
const BecomeTraderPage       = lazy(() => import('./pages/BecomeTraderPage'))
const PaymentCallbackPage    = lazy(() => import('./pages/PaymentCallbackPage'))

const AdminPickupPage  = lazy(() => import('./admin/orders/pickup'))

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
const TraderOrders     = lazy(() => import('./trader/TraderOrders'))
const TraderAccount    = lazy(() => import('./trader/TraderAccount'))
const TraderFlashSales = lazy(() => import('./trader/TraderFlashSales'))
const TraderInventory  = lazy(() => import('./trader/TraderInventory'))
const TraderSales      = lazy(() => import('./trader/TraderSales'))
const TraderAccounting = lazy(() => import('./trader/TraderAccounting'))

function ProductRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/shop/${slug}`} replace />
}

// Renders the transition overlay and drives navigation from above the route tree
function SwitchOverlay() {
  const { current, endSwitch } = useSwitchPortal()
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<typeof current>(null)

  useEffect(() => {
    if (current) {
      setSnapshot(current)
      // Delay navigation until the overlay is fully covering the screen
      setTimeout(() => navigate(current.toPath), 120)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.toPath])

  if (!snapshot) return null
  return (
    <SwitchTransition
      from={snapshot.from}
      to={snapshot.to}
      userName={snapshot.userName}
      accountName={snapshot.accountName}
      onDone={() => { endSwitch(); setTimeout(() => setSnapshot(null), 250) }}
    />
  )
}

function SiteOffline() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">🌐</div>
      <p className="text-[20px] font-extrabold text-[#071A2B] mb-2">This site does not exist</p>
      <p className="text-[13px] text-[#64748B]">Check your network connection</p>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

export default function App() {
  const [uiActive, setUiActive] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch(`${BASE_URL}/api/settings/platform/`)
      .then(r => r.json()).then(d => setUiActive(!!d.ui_active)).catch(() => setUiActive(true))
    if (localStorage.getItem('access_token'))
      sessionApi.profile().then(p => setIsAdmin(p.is_staff))
  }, [])

  if (uiActive === false && !isAdmin) return <SiteOffline />
  return (
    <SwitchProvider>
    <NotificationProvider>
    <BrowserRouter>
      <ScrollToTop />
      <SwitchOverlay />
      <CookieBanner />
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#071A2B' }} />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/shop/:slug" element={<ProductPage />} />
          <Route path="/products/:slug" element={<ProductRedirect />} />
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
          <Route path="/rate-product/:slug" element={<RateProductPage />} />
          <Route path="/returns" element={<ReturnPage />} />
          <Route path="/returns/request/:code" element={<RequestReturnPage />} />
          <Route path="/help-center" element={<HelpCenterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactUsPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/become-a-trader" element={<BecomeTraderPage />} />
          <Route path="/payment-callback" element={<PaymentCallbackPage />} />
          <Route element={<TraderGuard />}>
            <Route path="/trader/:traderUuid" element={<TraderLayout />}>
              <Route index element={<TraderDashboard />} />
              <Route path="products" element={<TraderProducts />} />
              <Route path="orders" element={<TraderOrders />} />
              <Route path="account" element={<TraderAccount />} />
              <Route path="flashsales" element={<TraderFlashSales />} />
              <Route path="inventory" element={<TraderInventory />} />
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
              <Route path="pickup" element={<AdminPickupPage />} />
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
    </SwitchProvider>
  )
}

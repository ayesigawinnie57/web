import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { authApi, cartApi, wishlistApi, notifyCartUpdated, notifyWishlistUpdated, LOGO } from '../lib/api'
import { useNotifications } from '../lib/NotificationContext'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const nextPath = new URLSearchParams(location.search).get('next')
  const { refresh: refreshNotifications } = useNotifications()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const afterLogin = async (access: string, refresh: string) => {
    authApi.saveTokens(access, refresh)
    let isStaff = false
    try {
      const payload = JSON.parse(atob(access.split('.')[1]))
      isStaff = !!payload.is_staff
    } catch { /* ignore */ }
    try {
      const { data: p } = await authApi.profile()
      authApi.saveProfile(p.name, p.email, p.is_staff)
      isStaff = !!p.is_staff
    } catch { /* ignore */ }
    try {
      const guestCart = JSON.parse(localStorage.getItem('majo_guest_cart') ?? '[]')
      if (guestCart.length > 0) {
        await Promise.all(guestCart.map((item: any) =>
          cartApi.add({ id: item.product_id, slug: item.product_slug, name: item.product_name, price: Number(item.product_price), image: item.product_image, images: [], rating: Number(item.product_rating), reviewsCount: 0, stock: 99, deliveryFee: 0, shortDescription: '', longDescription: '', category: item.product_category, categoryName: '' }, item.quantity)
        ))
        localStorage.removeItem('majo_guest_cart')
        notifyCartUpdated()
      }
    } catch { /* ignore */ }
    try {
      const pending = localStorage.getItem('majo_pending_wishlist')
      if (pending) {
        await wishlistApi.add(JSON.parse(pending))
        localStorage.removeItem('majo_pending_wishlist')
        notifyWishlistUpdated()
      }
    } catch { /* ignore */ }
    const from = (location.state as any)?.from
    navigate(isStaff ? '/admin' : (from ?? nextPath ?? '/'), { replace: true })
    refreshNotifications()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    try {
      const { data } = await authApi.login(email.trim(), password)
      await afterLogin(data.access, data.refresh)
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail ?? 'Invalid email or password.')
    } finally { setLoading(false) }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      try {
        const { data } = await authApi.googleLogin(tokenResponse.access_token)
        await afterLogin(data.access, data.refresh)
      } catch {
        setError('Google sign-in failed. Please try again.')
      } finally { setLoading(false) }
    },
    onError: () => setError('Google sign-in was cancelled or failed.'),
  })

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 min-h-[calc(100vh-320px)] flex items-center justify-center px-4 py-12">
        <section className="w-full max-w-md bg-white border border-[#E2E8F0] p-6 sm:p-8">
          <img src={LOGO} alt="Majo Gadgets" className="h-12 w-auto object-contain mx-auto mb-7" />
          <div className="mb-7"><h1 className="text-2xl font-extrabold text-[#071A2B]">Welcome back</h1><p className="text-[13px] text-[#64748B] mt-1">Sign in to your account</p></div>
          {error && <div className="mb-5 p-3 bg-red-50 border border-red-100 text-[13px] font-semibold text-red-600">{error}</div>}
          <form onSubmit={submit} className="space-y-5">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">Password</span><div className="relative"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" className="w-full px-3 py-3 pr-11 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-2.5 text-[#64748B]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            <button disabled={loading} className="w-full h-12 bg-[#1E3A8A] text-white text-[14px] font-bold disabled:opacity-50">{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
          <p className="text-center text-[13px] text-[#64748B] mt-6">Don't have an account? <Link to="/register" className="font-bold text-[#1E3A8A]">Sign Up</Link></p>
          <p className="text-center text-[13px] text-[#64748B] mt-2"><Link to="/forgot-password" className="font-bold text-[#1E3A8A]">Forgot password?</Link></p>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-[12px] text-[#94A3B8]">or</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 border border-[#E2E8F0] bg-white text-[#071A2B] text-[14px] font-bold hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">{label}</span><input required type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" /></label>
}

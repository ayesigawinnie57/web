import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { authApi, LOGO } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const nextPath = new URLSearchParams(location.search).get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    try {
      const { data } = await authApi.login(email.trim(), password)
      authApi.saveTokens(data.access, data.refresh)
      let isStaff = false
      try {
        const payload = JSON.parse(atob(data.access.split('.')[1]))
        isStaff = !!payload.is_staff
      } catch { /* ignore */ }
      try {
        const { data: p } = await authApi.profile()
        authApi.saveProfile(p.name, p.email, p.is_staff)
        isStaff = !!p.is_staff
      } catch {
        authApi.saveProfile(email.trim(), email.trim(), isStaff)
      }
      navigate(isStaff ? '/admin' : (nextPath ?? '/'), { replace: true })
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail ?? 'Invalid email or password.')
    } finally { setLoading(false) }
  }

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
        </section>
      </main>
      <Footer />
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }: { label: string; type: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">{label}</span><input required type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" /></label>
}

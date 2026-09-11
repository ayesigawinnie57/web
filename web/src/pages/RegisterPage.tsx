import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, Eye, EyeOff, UserPlus } from 'lucide-react'
import { authApi, LOGO } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

const REGIONS = ['Central Uganda', 'Eastern Uganda', 'Northern Uganda', 'Western Uganda']
type Form = { name: string; email: string; phone: string; region: string; district: string; village: string; password: string; confirm: string }

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>({ name: '', email: '', phone: '', region: '', district: '', village: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (key: keyof Form, value: string) => setForm(current => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password) { setError('Name, email and password are required.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { data } = await authApi.register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, country: 'Uganda', region: form.region, district: form.district.trim(), village: form.village.trim() })
      authApi.saveTokens(data.access, data.refresh)
      authApi.saveProfile(form.name.trim(), form.email.trim())
      navigate('/', { replace: true })
    } catch (requestError: any) {
      const data = requestError?.response?.data
      setError(data?.email?.[0] ?? data?.password?.[0] ?? data?.detail ?? 'Registration failed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 px-4 py-10"><section className="w-full max-w-2xl mx-auto bg-white border border-[#E2E8F0] p-6 sm:p-8"><img src={LOGO} alt="Majo Gadgets" className="h-12 w-auto object-contain mx-auto mb-7" /><div className="flex items-center gap-3 mb-7"><div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center"><UserPlus className="text-[#1E3A8A]" size={19} /></div><div><h1 className="text-2xl font-extrabold text-[#071A2B]">Create account</h1><p className="text-[13px] text-[#64748B] mt-1">Sign up to get started</p></div></div>{error && <div className="mb-5 p-3 bg-red-50 border border-red-100 text-[13px] font-semibold text-red-600">{error}</div>}<form onSubmit={submit} className="grid sm:grid-cols-2 gap-x-4 gap-y-5"><Field label="Full Name" required value={form.name} onChange={value => set('name', value)} placeholder="Your name" /><Field label="Email" required type="email" value={form.email} onChange={value => set('email', value)} placeholder="you@example.com" /><Field label="Phone" type="tel" value={form.phone} onChange={value => set('phone', value)} placeholder="+256 700 000000" /><label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">Country</span><div className="px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] text-[#64748B]">Uganda</div></label><label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">Region</span><div className="relative"><select value={form.region} onChange={event => set('region', event.target.value)} className="appearance-none w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none"><option value="">Select region</option>{REGIONS.map(region => <option key={region}>{region}</option>)}</select><ChevronDown className="absolute right-3 top-3 text-[#64748B] pointer-events-none" size={16} /></div></label><Field label="District" value={form.district} onChange={value => set('district', value)} placeholder="e.g. Kampala" /><Field label="Village / Street" value={form.village} onChange={value => set('village', value)} placeholder="e.g. Nakawa" /><div className="sm:col-span-2"><PasswordField label="Password" value={form.password} show={showPassword} onChange={value => set('password', value)} onToggle={() => setShowPassword(value => !value)} /></div><div className="sm:col-span-2"><Field label="Confirm Password" required type="password" value={form.confirm} onChange={value => set('confirm', value)} placeholder="Repeat password" /></div><button disabled={loading} className="sm:col-span-2 w-full h-12 bg-[#1E3A8A] text-white text-[14px] font-bold disabled:opacity-50">{loading ? 'Creating account...' : 'Create Account'}</button></form><p className="text-center text-[13px] text-[#64748B] mt-6">Already have an account? <Link to="/login" className="font-bold text-[#1E3A8A]">Sign In</Link></p></section></main>
      <Footer />
    </div>
  )
}

function Field({ label, required, type = 'text', value, onChange, placeholder }: { label: string; required?: boolean; type?: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">{label}{required && ' *'}</span><input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" /></label> }
function PasswordField({ label, value, show, onChange, onToggle }: { label: string; value: string; show: boolean; onChange: (value: string) => void; onToggle: () => void }) { return <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">{label} *</span><div className="relative"><input required minLength={8} type={show ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} placeholder="Min. 8 characters" className="w-full px-3 py-3 pr-11 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" /><button type="button" onClick={onToggle} className="absolute right-3 top-3 text-[#64748B]">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label> }

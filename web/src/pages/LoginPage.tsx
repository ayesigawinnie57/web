import { type FormEvent, useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ChevronDown, ShieldCheck } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { authApi, cartApi, wishlistApi, notifyCartUpdated, notifyWishlistUpdated, LOGO, fetchAllDistricts, type DistrictRecord, type LoginResponse } from '../lib/api'
import { useNotifications } from '../lib/NotificationContext'
import { initializeSupportEncryptionBackup } from '../lib/supportEncryption'
import { Helmet } from 'react-helmet-async'

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
  const [pendingProfile, setPendingProfile] = useState<{ tmpToken: string; name: string; email: string } | null>(null)
  const [pendingMfa, setPendingMfa] = useState<{ challengeId: string; emailHint: string } | null>(null)

  const afterLogin = async (access: string, refresh: string, password?: string) => {
    authApi.saveTokens(access, refresh)
    let isStaff = false
    let userId: number | null = null
    try {
      const payload = JSON.parse(atob(access.split('.')[1]))
      isStaff = !!payload.is_staff
    } catch { /* ignore */ }
    try {
      const { data: p } = await authApi.profile()
      userId = p.id
      authApi.saveProfile(p.name, p.email, p.is_staff)
      isStaff = !!p.is_staff
    } catch { /* ignore */ }
    if (password && userId !== null) {
      try {
        await initializeSupportEncryptionBackup(userId, password)
      } catch {
        window.alert('You are signed in, but your encrypted chat-key backup could not be updated or restored. Existing chat remains on this device. A password reset cannot unlock an older backup.')
      }
    }
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

  const handleLoginResponse = async (data: LoginResponse, loginPassword?: string) => {
    if ('mfa_required' in data) {
      setPendingProfile(null)
      setPendingMfa({ challengeId: data.challenge_id, emailHint: data.email_hint })
      setError('')
      return
    }
    if (data.trusted_device) localStorage.setItem('majo_mfa_trusted_device', data.trusted_device)
    await afterLogin(data.access, data.refresh, loginPassword)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    try {
      const trustedDevice = localStorage.getItem('majo_mfa_trusted_device')
      const { data } = await authApi.login(email.trim(), password, trustedDevice)
      await handleLoginResponse(data, password)
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail ?? 'Invalid email or password.')
    } finally { setLoading(false) }
  }

  const verifyEmailCode = async (challengeId: string, code: string) => {
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.verifyEmailMfa(challengeId, code)
      await handleLoginResponse(data, password)
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail ?? 'Could not verify the sign-in code.')
    } finally {
      setLoading(false)
    }
  }

  const resendEmailCode = async (challengeId: string): Promise<boolean> => {
    setError('')
    setLoading(true)
    try {
      await authApi.resendEmailMfa(challengeId)
      return true
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail ?? 'Could not resend the sign-in code.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID

  if (pendingProfile) {
    return (
      <GoogleProfileForm
        name={pendingProfile.name}
        email={pendingProfile.email}
        tmpToken={pendingProfile.tmpToken}
        onComplete={handleLoginResponse}
      />
    )
  }

  if (pendingMfa) {
    return (
      <EmailMfaForm
        emailHint={pendingMfa.emailHint}
        loading={loading}
        error={error}
        onVerify={code => void verifyEmailCode(pendingMfa.challengeId, code)}
        onResend={() => resendEmailCode(pendingMfa.challengeId)}
        onCancel={() => { setPendingMfa(null); setPassword(''); setError('') }}
      />
    )
  }

  return (
    <div className="auth-page-background min-h-screen flex items-center justify-center px-4 py-12" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>Sign In - Majo Gadgets</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <section className="w-full max-w-md bg-white border border-[#E2E8F0] p-6 sm:p-8">
        <img src={LOGO} alt="Majo Gadgets" className="h-12 w-auto object-contain mx-auto mb-7" />
        <div className="mb-7"><h1 className="text-2xl font-extrabold text-[#071A2B]">Welcome back</h1><p className="text-[13px] text-[#64748B] mt-1">Sign in to your account</p></div>
        {error && <div className="mb-5 p-3 bg-red-50 border border-red-100 text-[13px] font-semibold text-red-600">{error}</div>}
        <form onSubmit={submit} className="space-y-5">
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">Password</span><div className="relative"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" className="w-full px-3 py-3 pr-11 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-2.5 text-[#64748B]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <button disabled={loading} className="w-full h-12 bg-[#1E3A8A] text-white rounded-xl text-[13px] font-bold disabled:opacity-60 hover:opacity-90">{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <p className="text-center text-[13px] text-[#64748B] mt-6"><Link to="/forgot-password" className="font-bold text-[#1E3A8A]">Forgot password?</Link></p>
        <p className="mt-4 text-center text-[13px] text-[#64748B]">
          Don’t have an account? <Link to="/register" className="font-bold text-[#1E3A8A] hover:underline">Sign up</Link>
        </p>
        {hasGoogleClientId && <GoogleButton loading={loading} onSuccess={data => handleLoginResponse(data)} onError={setError} onNeedsProfile={setPendingProfile} />}
      </section>
    </div>
  )
}

function EmailMfaForm({ emailHint, loading, error, onVerify, onResend, onCancel }: {
  emailHint: string
  loading: boolean
  error: string
  onVerify: (code: string) => void
  onResend: () => Promise<boolean>
  onCancel: () => void
}) {
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState('')
  return (
    <div className="auth-page-background min-h-screen flex items-center justify-center px-4 py-12" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section className="w-full max-w-md bg-white border border-[#E2E8F0] p-6 sm:p-8">
        <ShieldCheck size={36} className="mb-4 text-[#1E3A8A]" />
        <h1 className="text-2xl font-extrabold text-[#071A2B]">Verify your sign-in</h1>
        <p className="mt-2 text-[13px] leading-5 text-[#64748B]">We emailed a six-digit security code to <strong>{emailHint}</strong>. The code expires in 10 minutes.</p>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-[13px] text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-green-100 bg-green-50 p-3 text-[13px] text-green-700">{notice}</p>}
        <form onSubmit={event => { event.preventDefault(); onVerify(code) }} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">Email verification code</span>
            <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-center font-mono text-xl tracking-[0.4em] outline-none focus:border-[#1E3A8A]" />
          </label>
          <p className="text-[11px] leading-4 text-[#64748B]">Remember this device for 7 days. Only do this on a device you control.</p>
          <button disabled={loading || code.length !== 6} className="w-full rounded-xl bg-[#1E3A8A] py-3 text-[13px] font-bold text-white disabled:opacity-50">{loading ? 'Verifying...' : 'Verify and continue'}</button>
        </form>
        <div className="mt-4 flex justify-between text-[12px]">
          <button type="button" onClick={() => { setNotice(''); void onResend().then(sent => { if (sent) setNotice('A new verification code was sent.') }) }} disabled={loading} className="font-bold text-[#1E3A8A] disabled:opacity-50">Resend code</button>
          <button type="button" onClick={onCancel} className="font-semibold text-[#64748B]">Use another sign-in</button>
        </div>
      </section>
    </div>
  )
}

function GoogleButton({ loading, onSuccess, onError, onNeedsProfile }: {
  loading: boolean
  onSuccess: (data: LoginResponse) => Promise<void>
  onError: (msg: string) => void
  onNeedsProfile: (p: { tmpToken: string; name: string; email: string }) => void
}) {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const { data } = await authApi.googleLogin(tokenResponse.access_token, localStorage.getItem('majo_mfa_trusted_device'))
        if ('needs_profile' in data) {
          onNeedsProfile({ tmpToken: data.tmp_token, name: data.name, email: data.email })
        } else {
          await onSuccess(data)
        }
      } catch {
        onError('Google sign-in failed. Please try again.')
      }
    },
    onError: () => onError('Google sign-in was cancelled or failed.'),
  })
  return (
    <>
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[#E2E8F0]" />
        <span className="text-[12px] text-[#94A3B8]">or</span>
        <div className="flex-1 h-px bg-[#E2E8F0]" />
      </div>
      <button type="button" onClick={() => googleLogin()} disabled={loading} className="w-full h-12 flex items-center justify-center gap-3 border border-[#E2E8F0] rounded-xl bg-white text-[#071A2B] text-[13px] font-bold hover:bg-[#F8FAFC] transition-colors disabled:opacity-50">
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
    </>
  )
}

const REGIONS = [
  { value: 'Central Region', label: 'Central Uganda' },
  { value: 'Eastern Region', label: 'Eastern Uganda' },
  { value: 'Northern Region', label: 'Northern Uganda' },
  { value: 'Western Region', label: 'Western Uganda' },
]

type District = Pick<DistrictRecord, 'id' | 'name' | 'region'>

function GoogleProfileForm({ name, email, tmpToken, onComplete }: {
  name: string; email: string; tmpToken: string
  onComplete: (data: LoginResponse) => Promise<void>
}) {
  const [districts, setDistricts] = useState<District[]>([])
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [district, setDistrict] = useState('')
  const [village, setVillage] = useState('')
  const [districtsLoading, setDistrictsLoading] = useState(true)
  const [districtError, setDistrictError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchAllDistricts()
      .then(allDistricts => { if (active) setDistricts(allDistricts) })
      .catch(() => {
        if (active) setDistrictError('Could not load districts. Please refresh and try again.')
      })
      .finally(() => {
        if (active) setDistrictsLoading(false)
      })
    return () => { active = false }
  }, [])

  const regionDistricts = useMemo(() => districts.filter(d => d.region === region), [districts, region])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone.trim() || !region || !district) { setError('Phone, region and district are required.'); return }
    setLoading(true)
    try {
      const { data } = await authApi.completeGoogleProfile(
        tmpToken,
        { phone: phone.trim(), region, district, village: village.trim() },
        localStorage.getItem('majo_mfa_trusted_device'),
      )
      await onComplete(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to save profile. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page-background min-h-screen flex items-center justify-center px-4 py-12" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section className="w-full max-w-md bg-white border border-[#E2E8F0] p-6 sm:p-8">
        <img src={LOGO} alt="Majo Gadgets" className="h-12 w-auto object-contain mx-auto mb-7" />
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#071A2B]">Complete your profile</h1>
          <p className="text-[13px] text-[#64748B] mt-1">Signed in as <strong>{name}</strong> ({email}). Just a few more details.</p>
        </div>
        {error && <div className="mb-5 p-3 bg-red-50 border border-red-100 text-[13px] font-semibold text-red-600">{error}</div>}
        <form onSubmit={submit} className="space-y-5">
          <Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="+256 700 000000" />
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">Region</span>
            <div className="relative">
              <select value={region} onChange={e => { setRegion(e.target.value); setDistrict('') }} className="appearance-none w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none">
                <option value="">Select region</option>
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 text-[#64748B] pointer-events-none" size={16} />
            </div>
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">District</span>
            <div className="relative">
              <select value={district} disabled={!region || districtsLoading || regionDistricts.length === 0} onChange={e => setDistrict(e.target.value)} className="appearance-none w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none disabled:opacity-50">
                <option value="">{districtsLoading ? 'Loading districts...' : region ? 'Select district' : 'Choose a region first'}</option>
                {regionDistricts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 text-[#64748B] pointer-events-none" size={16} />
            </div>
            {districtError && <p role="alert" className="mt-2 text-[12px] text-red-600">{districtError}</p>}
          </label>
          <Field label="Village / Street (optional)" type="text" value={village} onChange={setVillage} placeholder="e.g. Nakawa" required={false} />
          <button disabled={loading} className="w-full h-12 bg-[#1E3A8A] text-white text-[14px] font-bold disabled:opacity-50">
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </section>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, required = true }: { label: string; type: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean }) {
  return <label className="block"><span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">{label}</span><input required={required} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" /></label>
}

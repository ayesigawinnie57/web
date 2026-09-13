import { type FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { LOGO, BASE_URL } from '../lib/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail ?? 'Reset failed. The link may have expired.'); return }
      setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <section className="w-full max-w-md bg-white border border-[#E2E8F0] p-6 sm:p-8">
          <img src={LOGO} alt="Majo Gadgets" className="h-12 w-auto object-contain mx-auto mb-7" />

          {!token ? (
            <div className="text-center">
              <p className="text-[15px] font-bold text-[#071A2B]">Invalid reset link</p>
              <p className="text-[13px] text-[#64748B] mt-2">This link is missing a token. Please request a new one.</p>
              <Link to="/forgot-password" className="inline-block mt-6 text-[13px] font-bold text-[#1E3A8A]">Request new link</Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-[#071A2B] mb-2">Password updated!</h2>
              <p className="text-[13px] text-[#64748B]">Your password has been reset successfully.</p>
              <Link to="/login" className="inline-block mt-6 h-12 px-8 bg-[#1E3A8A] text-white text-[14px] font-bold leading-[48px]">Sign In</Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-extrabold text-[#071A2B]">Set new password</h1>
                <p className="text-[13px] text-[#64748B] mt-1">Choose a strong password for your account.</p>
              </div>
              {error && <div className="mb-5 p-3 bg-red-50 border border-red-100 text-[13px] font-semibold text-red-600">{error}</div>}
              <form onSubmit={submit} className="space-y-5">
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">New Password</span>
                  <div className="relative">
                    <input required minLength={8} type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className="w-full px-3 py-3 pr-11 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" />
                    <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-3 text-[#64748B]">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">Confirm Password</span>
                  <div className="relative">
                    <input required type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" className="w-full px-3 py-3 pr-11 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" />
                    <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-3 text-[#64748B]">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </label>
                <button disabled={loading} className="w-full h-12 bg-[#1E3A8A] text-white text-[14px] font-bold disabled:opacity-50">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </section>
    </div>
  )
}

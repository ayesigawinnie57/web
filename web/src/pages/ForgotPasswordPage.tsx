import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { LOGO, BASE_URL } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await fetch(`${BASE_URL}/api/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 min-h-[calc(100vh-320px)] flex items-center justify-center px-4 py-12">
        <section className="w-full max-w-md bg-white border border-[#E2E8F0] p-6 sm:p-8">
          <img src={LOGO} alt="Majo Gadgets" className="h-12 w-auto object-contain mx-auto mb-7" />
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-[#071A2B] mb-2">Check your email</h2>
              <p className="text-[13px] text-[#64748B]">If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.</p>
              <Link to="/login" className="inline-block mt-6 text-[13px] font-bold text-[#1E3A8A]">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-extrabold text-[#071A2B]">Forgot password?</h1>
                <p className="text-[13px] text-[#64748B] mt-1">Enter your email and we'll send you a reset link.</p>
              </div>
              {error && <div className="mb-5 p-3 bg-red-50 border border-red-100 text-[13px] font-semibold text-red-600">{error}</div>}
              <form onSubmit={submit} className="space-y-5">
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-2">Email</span>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-3 py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[13px] outline-none focus:border-[#1E3A8A]" />
                </label>
                <button disabled={loading} className="w-full h-12 bg-[#1E3A8A] text-white text-[14px] font-bold disabled:opacity-50">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-[13px] text-[#64748B] mt-6">
                Remember your password? <Link to="/login" className="font-bold text-[#1E3A8A]">Sign In</Link>
              </p>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

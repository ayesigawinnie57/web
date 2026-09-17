import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, CheckCircle2 } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'
import { BASE_URL } from '../lib/api'

const DEFAULT_SECTIONS = [
  {
    title: '1. What are cookies?',
    text: 'Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences, keep you logged in, and understand how you use the platform so we can improve your experience.',
  },
  {
    title: '2. How we use cookies',
    text: 'We use cookies to keep you signed in, remember your cart and wishlist, understand which pages and products you interact with, and improve the performance and relevance of our platform. We do not use cookies to sell your data to third parties.',
  },
  {
    title: '3. Types of cookies we use',
    text: 'Essential cookies are required for the site to function (e.g. authentication, cart). Analytics cookies help us understand usage patterns. Preference cookies remember your settings. You can disable non-essential cookies in your browser settings at any time.',
  },
  {
    title: '4. Third-party cookies',
    text: 'Some features on our platform may use third-party services (such as payment processors or analytics providers) that set their own cookies. We do not control these cookies and recommend reviewing the privacy policies of those services.',
  },
  {
    title: '5. Managing cookies',
    text: 'You can control and delete cookies through your browser settings. Disabling essential cookies may affect the functionality of the site, such as staying logged in or maintaining your cart. Most browsers allow you to block or delete cookies at any time.',
  },
  {
    title: '6. Your consent',
    text: 'By continuing to use Majo Gadgets, you consent to our use of cookies as described in this policy. You may withdraw consent at any time by clearing cookies in your browser or adjusting your browser settings.',
  },
  {
    title: '7. Updates to this policy',
    text: 'We may update this Cookie Policy from time to time. Continued use of the platform after changes are posted constitutes your acceptance of the updated policy.',
  },
  {
    title: '8. Contact us',
    text: 'If you have questions about our use of cookies, please contact us via WhatsApp at 0794448439 or through the support channels available on the website.',
  },
]

export default function CookiesPage() {
  const [content, setContent] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  useEffect(() => {
    fetch(`${BASE_URL}/api/settings/cookie-policy/`)
      .then(r => r.json())
      .then(d => {
        if (d.content) setContent(d.content)
        if (d.updated_at) setUpdatedAt(d.updated_at)
      })
      .catch(() => {})
  }, [])

  const sections = content
    ? content.split('\n\n').filter(Boolean).map((block) => {
        const lines = block.split('\n')
        return { title: lines[0], text: lines.slice(1).join(' ') }
      })
    : DEFAULT_SECTIONS

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />

      <main className="w-full max-w-none px-4 pt-[150px] pb-8 md:px-8 md:pt-[156px] md:pb-10 lg:px-12">
        <div className="max-w-6xl mx-auto">

          <section className="rounded-[28px] bg-gradient-to-r from-[#071A2B] via-[#0F2B43] to-[#1E3A8A] px-6 py-8 md:px-10 text-white shadow-[0_25px_80px_rgba(15,43,67,0.18)]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#BFDBFE]">
              <Cookie size={14} />
              Cookies
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-5xl tracking-tight">Cookie Policy</h1>
            <p className="mt-3 max-w-3xl text-[14px] md:text-[16px] text-slate-200">
              Learn how Majo Gadgets uses cookies and similar technologies to improve your experience.
            </p>
            {updatedAt && (
              <p className="mt-3 text-[12px] text-slate-400">
                Last updated: {new Date(updatedAt).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </section>

          <section className="mt-8 bg-white border border-[#E2E8F0] rounded-[28px] px-5 py-6 md:px-8 md:py-8">
            <div className="space-y-8">
              {sections.map((s, i) => (
                <div key={i} className="border-b border-[#E2E8F0] pb-6 last:border-b-0 last:pb-0">
                  <h2 className="text-[18px] md:text-[20px] font-extrabold text-[#071A2B] mb-3">{s.title}</h2>
                  <p className="text-[15px] leading-8 text-[#475569]">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
              <p className="flex items-center gap-2 text-[15px] font-bold text-[#071A2B]">
                <CheckCircle2 size={16} className="text-green-600" />
                Transparent by design
              </p>
              <p className="mt-3 text-[15px] leading-8 text-[#334155]">
                We only use cookies that help us deliver a better, faster, and more personalised experience. Your trust matters to us.
              </p>
            </div>
          </section>

          <div className="mt-8 text-center">
            <Link to="/privacy-policy" className="inline-flex items-center justify-center rounded-xl bg-[#071A2B] px-6 py-3 text-[13px] font-bold text-white transition hover:bg-[#0F2B43]">
              View Privacy Policy
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

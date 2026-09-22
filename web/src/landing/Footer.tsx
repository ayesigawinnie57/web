import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BASE_URL } from '../lib/api'

export default function Footer() {
  const [allowSelling, setAllowSelling] = useState(false)

  useEffect(() => {
    fetch(`${BASE_URL}/api/settings/platform/`)
      .then(r => r.json()).then(d => setAllowSelling(!!d.allow_selling)).catch(() => {})
  }, [])
  const openAppStore = () => {
    const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent)
    const storeUrl = isAppleDevice
      ? 'https://apps.apple.com/search?term=Majo%20Gadgets'
      : 'https://play.google.com/store/search?q=Majo%20Gadgets&c=apps'

    window.open(storeUrl, '_blank', 'noopener,noreferrer')
  }

  const footerLinks = [
    { label: 'About Us', to: '/about' },
    { label: 'Help Center', to: '/help-center' },
    { label: 'Payment', to: '/payment' },
    { label: 'Returns', to: '/returns' },
    { label: 'Contact Us', to: '/contact' },
    { label: 'Privacy Policy', to: '/privacy-policy' },
    { label: 'Cookie Policy', to: '/cookies' },
    { label: 'Terms of Service', to: '/terms' },
  ]

  return (
    <footer className="bg-[#071A2B] px-5 py-10 text-slate-200">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr_1fr] xl:gap-12">
          <div className="flex items-start justify-between gap-5">
            <div className="space-y-4">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
                Majo Gadgets
              </div>

              <p className="max-w-md text-sm leading-6 text-slate-300">
                Your one-stop destination for everything you need.
              </p>

              <div className="space-y-3 text-sm text-slate-300">
                <a href="mailto:gadgetsmajo@gmail.com" className="flex items-center gap-2 transition hover:text-white">
                  <span className="text-cyan-300">✉</span>
                  gadgetsmajo@gmail.com
                </a>
                <a href="tel:+256779122222" className="flex items-center gap-2 transition hover:text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-cyan-300" aria-hidden="true">
                    <path d="M6.6 10.8c1.7 3.3 4.5 6.1 7.8 7.8l2.6-2.6a1.2 1.2 0 0 1 1.2-.3c1.3.4 2.7.7 4.1.7a1.1 1.1 0 0 1 1.1 1.1V21a1.1 1.1 0 0 1-1.1 1.1C13.3 22.1 1.9 10.7 1.9 4.1A1.1 1.1 0 0 1 3 3h3.3a1.1 1.1 0 0 1 1.1 1.1c0 1.4.3 2.8.7 4.1.1.4 0 .9-.3 1.2L6.6 10.8Z"/>
                  </svg>
                  +256 779 122 222
                </a>
              </div>
            </div>

            <div className="min-w-[120px] pt-1 text-slate-300">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Reach us via</p>
              <div className="flex items-center gap-3">
                <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok" className="transition hover:text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M16.06 3.1c.48 1.36 1.56 2.36 3.1 2.76v2.68a7.66 7.66 0 0 1-3.1-1.18v7.86a6.15 6.15 0 1 1-6.15-6.15c.32 0 .63.03.94.09v2.68a3.47 3.47 0 1 0 2.21 3.05V3.1h3.1Z"/>
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="transition hover:text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.25-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25Z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-start gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Quick links</h3>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              {footerLinks.map(({ label, to }) => (
                <Link key={label} to={to} className="transition hover:text-white">
                  {label}
                </Link>
              ))}
              {allowSelling && (
                <Link to="/become-a-trader" className="transition hover:text-white">
                  Sell with Majo Gadgets
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-start gap-3 pt-1">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">Get the app</h3>
            <p className="text-sm leading-6 text-slate-300">Shop faster on the go with the Majo Gadgets mobile app.</p>

            <button
              type="button"
              onClick={openAppStore}
              aria-label="Download the Majo Gadgets app"
              className="inline-flex items-center justify-center transition hover:opacity-90"
            >
              <img
                src="https://res.cloudinary.com/fhklnn0f/image/upload/v1789119996/Mobile.png"
                alt="Download Majo Gadgets from the App Store or Google Play"
                className="h-20 w-auto object-contain"
              />
            </button>
          </div>
        </div>

        <div className="mt-10 flex flex-row flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-slate-300">
          <a
            href="https://wa.me/256786023858"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-white"
          >
            Built and Managed Oraka Software Tech
          </a>

          <a href="tel:+256794448439" className="transition hover:text-white">
            Call: +256 794 448 439
          </a>
        </div>

        <div className="mt-4 grid gap-2 border-t border-white/10 pt-5 text-sm text-slate-400 md:grid-cols-2">
          <p>© {new Date().getFullYear()} Majo Gadgets. All rights reserved.</p>
          <div className="md:text-right">
            <span>WhatsApp: </span>
            <a href="https://wa.me/256786023858" target="_blank" rel="noreferrer" className="font-medium text-slate-200 transition hover:text-white">
              +256 786 023 858
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

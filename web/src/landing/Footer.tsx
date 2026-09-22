import { Link } from 'react-router-dom'
import { ChevronRight, Code2, Mail, Phone } from 'lucide-react'
import { LOGO } from '../lib/api'

export default function Footer() {
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
    { label: 'Sell with Majo Gadgets', to: '/become-a-trader' },
  ]

  return (
    <footer className="bg-[#071A2B] px-5 py-12 pb-32 text-slate-200 sm:px-8 lg:py-14 lg:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-[1.25fr_1fr_1fr] md:gap-8 lg:gap-16">
          <div>
            <img src={LOGO} alt="Majo Gadgets" className="h-12 w-12 rounded-full object-cover object-center" />

            <p className="mt-5 max-w-xs text-sm leading-6 text-slate-300">
              Your one-stop destination for everything you need.
            </p>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <a href="mailto:gadgetsmajo@gmail.com" className="flex items-center gap-3 transition hover:text-white">
                <Mail className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                gadgetsmajo@gmail.com
              </a>
              <a href="tel:+256779122222" className="flex items-center gap-3 transition hover:text-white">
                <Phone className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                +256 779 122 222
              </a>
            </div>

            <div className="mt-6 flex items-center gap-4 text-slate-300">
              <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok" className="transition hover:text-cyan-300">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-3.77V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.3 0 .59.05.86.13V9.38a6.34 6.34 0 0 0-.86-.06A6.34 6.34 0 1 0 15.82 15V8.49a8.16 8.16 0 0 0 4.77 1.52V6.56a4.82 4.82 0 0 1-1-.21v.34Z" />
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="transition hover:text-cyan-300">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.25-3.25a1.25 1.25 0 1 1-1.25 1.25Z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">QUICK LINKS</h2>
            <nav aria-label="Footer navigation" className="mt-5 flex flex-col items-start gap-2.5 text-sm text-slate-300">
              {footerLinks.map(({ label, to }) => (
                <Link key={label} to={to} className="group flex w-fit items-center gap-1.5 transition hover:text-cyan-200">
                  {label}
                  <ChevronRight className="h-4 w-4 shrink-0 text-cyan-300 opacity-60 transition-transform group-hover:translate-x-1 group-hover:opacity-100" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">GET THE APP</h2>
            <p className="mt-5 max-w-xs text-sm leading-6 text-slate-300">Shop faster on the go with the Majo Gadgets mobile app.</p>
            <button
              type="button"
              onClick={openAppStore}
              aria-label="Download the Majo Gadgets app"
              className="mt-1 inline-flex w-fit max-w-full transition hover:opacity-90 sm:mt-3"
            >
              <img
                src="https://res.cloudinary.com/fhklnn0f/image/upload/v1789119996/Mobile.png"
                alt="Download the Majo Gadgets app"
                className="h-20 max-w-full w-auto object-contain"
              />
            </button>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Majo Gadgets. All rights reserved.</p>
          <p className="flex w-full min-w-0 items-start gap-2 leading-6 md:w-auto md:justify-end md:text-right">
            <Code2 className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
            <span className="min-w-0 max-w-full break-all">Built and Managed by Oraka Software Tech <strong>|| 0794448439</strong></span>
          </p>
        </div>
      </div>
    </footer>
  )
}

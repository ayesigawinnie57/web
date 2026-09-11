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

  return (
    <footer className="bg-[#071A2B] px-5 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10 pb-8 border-b border-white/10">
          <div className="text-center md:text-left">
            <p className="text-[13px] text-[#94A3B8] max-w-[260px] mx-auto md:mx-0 mb-5">
              Your one-stop destination for everything you need.
            </p>
            <div className="hidden md:flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2">
              {['About Us', 'Help Center', 'Returns', 'Contact Us', 'Privacy Policy', 'Terms of Service'].map(item => (
                <Link key={item} to="/" className="text-[13px] text-[#94A3B8] hover:text-white transition">{item}</Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <button
              type="button"
              onClick={openAppStore}
              aria-label="Download the Majo Gadgets app"
              className="block hover:opacity-85 transition-opacity"
            >
              <img
                src="https://res.cloudinary.com/fhklnn0f/image/upload/v1789119996/Mobile.png"
                alt="Download Majo Gadgets from the App Store or Google Play"
                className="h-24 sm:h-28 w-auto object-contain"
              />
            </button>
            <div className="flex md:hidden flex-wrap justify-center gap-x-5 gap-y-2 mt-5 max-w-[520px]">
              {['About Us', 'Help Center', 'Returns', 'Contact Us', 'Privacy Policy', 'Terms of Service'].map(item => (
                <Link key={item} to="/" className="text-[13px] text-[#94A3B8] hover:text-white transition">{item}</Link>
              ))}
            </div>
          </div>
        </div>
        {allowSelling && (
          <Link to="/register" className="text-[13px] text-[#94A3B8] hover:text-white transition text-center md:text-left mt-4 block">Sell with Majo Gadgets</Link>
        )}
        <p className="text-[12px] text-[#64748B] text-center md:text-left pt-6">© {new Date().getFullYear()} Majo Gadgets. All rights reserved.</p>
      </div>
    </footer>
  )
}

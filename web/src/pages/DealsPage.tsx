import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Flame, Timer } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'
import { productsApi, toFlashSale, type FlashSale } from '../lib/api'

function Countdown({ endsAt }: { endsAt: Date }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt.getTime() - Date.now()))

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, endsAt.getTime() - Date.now())), 1000)
    return () => window.clearInterval(timer)
  }, [endsAt])

  const seconds = Math.floor(remaining / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return <span>{hours}h {String(minutes).padStart(2, '0')}m {String(secs).padStart(2, '0')}s left</span>
}

export default function DealsPage() {
  const [sales, setSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    productsApi.flashSales()
      .then(({ data }) => {
        const raw = Array.isArray(data) ? data : (data as any).results ?? []
        setSales(raw.map(toFlashSale))
        setError(false)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>Deals &amp; Flash Sales – Majo Gadgets</title>
        <meta name="description" content="Grab limited-time deals and flash sales on Majo Gadgets. Save big on electronics and accessories while stock lasts." />
        <link rel="canonical" href="https://www.majogadgets.com/deals" />
      </Helmet>
      <Navbar />
      <main className="pt-14 lg:pt-16">
        <section className="bg-[#071A2B] px-4 py-12 sm:py-16">
          <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
            <Flame className="text-orange-400" size={34} fill="currentColor" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300 mt-4">Limited-time offers</p>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mt-2">Deals worth grabbing</h1>
            <p className="max-w-md text-[13px] sm:text-[15px] text-[#CBD5E1] mt-4">Save more on selected products while stock lasts.</p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-9">
          {loading ? (
            <div className="py-20 text-center text-[13px] text-[#64748B]">Loading deals...</div>
          ) : error ? (
            <div className="py-20 text-center"><p className="text-[15px] font-bold text-[#071A2B]">Deals could not be loaded</p><p className="text-[13px] text-[#64748B] mt-2">Please try again in a moment.</p></div>
          ) : sales.length === 0 ? (
            <div className="py-20 text-center"><p className="text-[15px] font-bold text-[#071A2B]">No active deals right now</p><Link to="/shop" className="inline-block mt-4 text-[13px] font-bold text-[#1E3A8A]">Browse all products</Link></div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="text-xl font-extrabold text-[#071A2B]">Active deals</h2><p className="text-[12px] text-[#64748B] mt-1">{sales.length} offer{sales.length === 1 ? '' : 's'} available now</p></div><Timer className="text-orange-500" size={22} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sales.map(sale => (
                  <Link key={sale.id} to={`/shop/${sale.product.slug}`} className="bg-white border border-[#E2E8F0] p-3 flex gap-4 hover:shadow-md transition-shadow">
                    <div className="w-28 h-28 shrink-0 bg-[#F8FAFC] overflow-hidden">{sale.product.image ? <img src={sale.product.image} alt={sale.product.name} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}</div>
                    <div className="min-w-0 flex flex-col justify-center"><p className="text-[14px] font-extrabold text-[#071A2B] line-clamp-2">{sale.product.name}</p><div className="flex items-baseline gap-2 mt-2"><span className="text-[16px] font-extrabold text-[#EF4444]">UGX {sale.flashPrice.toLocaleString()}</span><span className="text-[11px] text-[#94A3B8] line-through">UGX {sale.product.price.toLocaleString()}</span></div><p className="text-[11px] font-bold text-orange-600 mt-2">-{sale.discountPct}% off</p><p className="text-[11px] text-[#64748B] mt-1"><Countdown endsAt={sale.endsAt} /></p><p className="text-[10px] text-[#64748B] mt-1">{sale.stockLeft} left</p></div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, ShoppingCart, Timer } from 'lucide-react'
import { cartApi, productsApi, toFlashSale, type FlashSale } from '../lib/api'
import { Link as RouterLink } from 'react-router-dom'

function useCountdown(endsAt: Date) {
  const calc = () => Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000))
  const [remaining, setRemaining] = useState(calc)

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(calc), 1000)
    return () => window.clearInterval(id)
  }, [endsAt])

  const secs = Math.max(0, remaining)
  const days = Math.floor(secs / 86400)
  const hours = Math.floor((secs % 86400) / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const seconds = secs % 60

  let label = '0m 00s'
  if (secs >= 86400) label = `${days}d ${hours}h ${minutes}m`
  else if (secs >= 3600) label = `${hours}h ${String(minutes).padStart(2, '0')}m`
  else label = `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`

  return { label, expired: secs === 0, urgent: secs < 3600 }
}

function FlashCard({ sale }: { sale: FlashSale }) {
  const { label, expired, urgent } = useCountdown(sale.endsAt)
  const { product } = sale
  const stockPercent = sale.stockLimit > 0 ? Math.max(0, Math.min(100, (sale.stockLeft / sale.stockLimit) * 100)) : 0
  const critical = stockPercent <= 20

  const addToCart = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    await cartApi.add(product, 1)
  }

  return (
    <RouterLink
      to={`/shop/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-[#F8FAFC]">
        {product.image
          ? <img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center text-4xl"><span aria-hidden="true">📦</span></div>
        }
        <div className="absolute left-2 top-2 rounded-md bg-[#EF4444] px-1.5 py-1">
          <span className="text-[9px] font-extrabold text-white">-{sale.discountPct}%</span>
        </div>
        {critical && !expired && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-[#F97316] px-1.5 py-1 text-[9px] font-bold text-white">
            <Flame size={10} fill="currentColor" />
            <span>HOT</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <p className="line-clamp-2 text-[11px] font-bold leading-[1.35] text-[#071A2B]">{product.name}</p>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-extrabold text-[#EF4444]">UGX {sale.flashPrice.toLocaleString()}</span>
          <span className="text-[9px] text-[#94A3B8] line-through">UGX {product.price.toLocaleString()}</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#64748B]">
          <Timer size={11} className={urgent ? 'text-[#F97316]' : 'text-[#64748B]'} />
          {expired ? <span className="text-[#EF4444]">Expired</span> : <span className={urgent ? 'text-[#F97316]' : 'text-[#64748B]'}>{label}</span>}
        </div>

        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              className={`h-full rounded-full ${critical ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}
              style={{ width: `${stockPercent}%` }}
            />
          </div>
          <p className="mt-1 text-[9px] font-medium text-[#64748B]">{sale.stockLeft} <span>left</span></p>
        </div>

        {critical && !expired && (
          <p className="text-[10px] font-bold text-[#EF4444]"><span aria-hidden="true">🔥</span> <span>Only {sale.stockLeft} left!</span></p>
        )}

        <button
          type="button"
          onClick={addToCart}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F97316] px-2.5 py-2 text-[10px] font-bold text-white transition hover:bg-[#EA580C]"
        >
          <ShoppingCart size={12} />
          <span>Add to Cart</span>
        </button>
      </div>
    </RouterLink>
  )
}

export default function FlashDeals({ products: _ }: { products: unknown[] }) {
  const [sales, setSales] = useState<FlashSale[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    productsApi.flashSales().then(({ data }) => {
      const raw = Array.isArray(data) ? data : (data as any).results ?? []
      setSales(raw.map(toFlashSale))
    }).catch(() => undefined)
  }, [])

  if (!sales.length) return null

  const visibleSales = showAll ? sales : sales.slice(0, 6)

  return (
    <div className="border-y border-[#FDBA74] bg-[#FFEDD5] px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[22px]" aria-hidden="true">🔥</span>
              <p className="text-[22px] font-extrabold text-[#071A2B]">Flash Deals</p>
              <span className="rounded bg-[#EF4444] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.18em] text-white">LIVE</span>
            </div>
            <p className="mt-1 text-[12px] text-[#64748B]">Limited stock · prices drop every hour</p>
          </div>
          <Link to="/deals" className="text-[13px] font-bold text-[#1E3A8A]">See All →</Link>
        </div>

        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-5">
          {visibleSales.map(sale => <FlashCard key={sale.id} sale={sale} />)}
        </div>

        {sales.length > 6 && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="rounded-xl border border-[#FDBA74] bg-[#FFF0DC] px-4 py-2 text-[12px] font-bold text-[#F97316]"
            >
              <span>{showAll ? 'Show Less ↑' : `View All ${sales.length} Flash Sales ↓`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

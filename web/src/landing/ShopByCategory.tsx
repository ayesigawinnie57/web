import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { productsApi, type ApiCategory } from '../lib/api'
import { trackCategoryVisit } from '../lib/behaviour'

export default function ShopByCategory() {
  const [categories, setCategories] = useState<ApiCategory[]>([])

  useEffect(() => {
    productsApi.categories().then(({ data }) => {
      const raw = Array.isArray(data) ? data : (data as any).results ?? []
      setCategories(raw)
    }).catch(() => undefined)
  }, [])

  if (!categories.length) return null

  return (
    <section className="bg-[#F8FAFC] px-4 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-[22px] font-extrabold text-[#071A2B]">Shop by Category</h2>
            <p className="mt-0.5 text-[12px] text-[#64748B]">Browse our wide range of product categories</p>
          </div>
          <Link to="/categories" className="text-[13px] font-bold text-[#1E3A8A] hover:underline">
            View All →
          </Link>
        </div>

        {/* Scrollable row */}
        <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/shop?category=${cat.slug}`}
              onClick={() => trackCategoryVisit(cat.slug)}
              className="group relative shrink-0 w-[calc((100%-48px)/3)] sm:w-[calc((100%-48px)/4)] lg:w-[calc((100%-64px)/5)] h-52 overflow-hidden rounded-3xl shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Background */}
              {cat.image
                ? <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-contain transition duration-500 group-hover:scale-110" />
                : <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center">
                    <ShoppingBag size={40} className="text-white/40" strokeWidth={1.5} />
                  </div>
              }

              {/* Gradient overlay — stronger at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition duration-300 group-hover:from-black/95" />

              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-white/10 to-transparent" />

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-4">
                <span className="block text-[13px] font-extrabold text-white leading-snug text-center tracking-wide line-clamp-2" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
                  {cat.name}
                </span>
                <span className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-bold text-[#F97316] uppercase tracking-widest" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                  Shop now
                  <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>

              {/* Top-right badge glow ring */}
              <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-white/40 ring-2 ring-white/20 group-hover:bg-white/70 transition duration-300" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

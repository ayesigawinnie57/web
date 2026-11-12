import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { getCategoryUrl, productsApi, type ApiCategory } from '../lib/api'
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
          <Link to="/categories" className="rounded-full border border-[#DBEAFE] bg-white px-3.5 py-2 text-[12px] font-bold text-[#1E3A8A] transition hover:border-[#1E3A8A] hover:bg-[#EFF6FF]">
            View All →
          </Link>
        </div>

        {/* Scrollable row */}
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-none pb-3 sm:gap-4">
          {categories.filter(cat => cat.parent_id === null).map((cat) => (
            <Link
              key={cat.slug}
              to={getCategoryUrl(categories, cat)}
              onClick={() => trackCategoryVisit(cat.slug)}
              className="group relative h-48 w-[156px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#DCE5F0] bg-[#E8EEF7] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-white hover:shadow-xl sm:h-56 sm:w-[190px] sm:rounded-3xl lg:h-60 lg:w-[210px]"
            >
              {/* Background */}
              {cat.image
                ? <img src={cat.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105" />
                : <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#12344A] via-[#1E3A8A] to-[#4F7FE8]">
                    <ShoppingBag size={42} className="text-white/50 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.4} />
                  </div>
              }

              {/* Gradient overlay — stronger at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#071A2B]/95 via-[#071A2B]/25 to-transparent transition duration-300 group-hover:from-[#071A2B]/90" />

              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

              {/* Label */}
              <div className="absolute inset-x-0 bottom-0 px-3 pb-3.5 sm:px-4 sm:pb-4">
                <span className="block text-left text-[13px] font-extrabold leading-snug tracking-wide text-white line-clamp-2 sm:text-[15px]" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
                  {cat.name}
                </span>
                <span className="mt-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#FDBA74] sm:text-[10px]" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                  Shop now
                  <svg className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

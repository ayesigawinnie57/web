import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../lib/api'
import ProductCard from '../components/ProductCard'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Recommended({ products, featuredIds }: { products: Product[]; featuredIds: Set<number> }) {
  const picks = useMemo(() => {
    let browsed: string[] = []
    try { browsed = JSON.parse(localStorage.getItem('majo_browsed_cats') ?? '[]') } catch { /* ignore */ }

    // Exclude products already shown in Featured
    const pool = products.filter(p => !featuredIds.has(p.id))

    if (!browsed.length) return shuffle(pool).slice(0, 12)

    const primary = pool.filter(p => p.category === browsed[0])
    const secondary = pool.filter(p => browsed.slice(1).includes(p.category))
    const rest = pool.filter(p => !browsed.includes(p.category))

    // Interleave: 1 primary, 1 secondary, repeat, then fill with rest
    const interleaved: Product[] = []
    const sp = shuffle(primary)
    const ss = shuffle(secondary)
    const sr = shuffle(rest)
    const max = Math.max(sp.length, ss.length)
    for (let i = 0; i < max && interleaved.length < 12; i++) {
      if (sp[i]) interleaved.push(sp[i])
      if (ss[i] && interleaved.length < 12) interleaved.push(ss[i])
    }
    for (const p of sr) {
      if (interleaved.length >= 12) break
      interleaved.push(p)
    }
    return interleaved.slice(0, 12)
  }, [products, featuredIds])

  if (!picks.length) return null

  return (
    <div className="bg-white px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[20px] font-extrabold text-[#071A2B]">Recommended for You</p>
            <p className="text-[12px] text-[#64748B] mt-0.5">Based on your browsing</p>
          </div>
          <Link to="/shop" className="text-[13px] font-semibold text-[#1E3A8A]">See All →</Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {picks.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import Navbar from './Navbar'
import Hero from './Hero'
import Products from './Products'
import FlashDeals from './FlashDeals'
import Recommended from './Recommended'
import Footer from './Footer'
import { productsApi, toProduct, type Product } from '../lib/api'

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    productsApi.list('page_size=12').then(({ data }) => {
      const raw: any[] = Array.isArray(data) ? data : (data as any).results ?? []
      setProducts(raw.map(toProduct))
    }).catch(() => undefined).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <div className="pt-[106px] lg:pt-[106px] pb-16 lg:pb-0">
        <Hero />
        {loading ? <ProductsSkeleton /> : <Products products={products} />}
        <FlashDeals products={[]} />
        {!loading && <Recommended products={products} featuredIds={new Set(products.slice(0, 12).map(p => p.id))} />}
      </div>
      <Footer />
    </div>
  )
}

function ProductsSkeleton() {
  return (
    <div className="bg-[#F8FAFC] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="h-5 w-40 bg-[#E2E8F0] rounded animate-pulse" />
            <div className="h-3 w-28 bg-[#E2E8F0] rounded animate-pulse mt-1.5" />
          </div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <div className="aspect-square bg-[#E2E8F0] animate-pulse" />
              <div className="p-[7px] space-y-1.5">
                <div className="h-3 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-[#E2E8F0] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

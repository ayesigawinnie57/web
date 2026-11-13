import { Link } from 'react-router-dom'
import type { Product } from '../lib/api'
import ProductCard from '../components/ProductCard'
import SponsoredProductsSection from '../components/SponsoredProductsSection'

export default function Products({ products }: { products: Product[] }) {
  const slice = products.slice(0, 12)

  return (
    <div className="bg-[#F8FAFC] px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <SponsoredProductsSection limit={6} excludeProductIds={slice.map(product => product.id)} />
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[22px] font-extrabold tracking-tight text-[#071A2B]">Featured Products</p>
            <p className="text-[12px] text-[#64748B] mt-0.5">Handpicked just for you</p>
          </div>
          <Link to="/shop" className="rounded-full border border-[#CBD5E1] bg-white px-4 py-2 text-[12px] font-bold text-[#1E3A8A] transition hover:border-[#1E3A8A] hover:bg-[#EFF6FF]">See all products →</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-3">
          {slice.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  )
}

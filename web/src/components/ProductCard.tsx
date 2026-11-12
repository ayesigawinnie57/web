import { Link } from 'react-router-dom'
import type { Product } from '../lib/api'
import { trackProductClick } from '../lib/behaviour'
import { cloudinaryImageUrl } from '../lib/api'

export default function ProductCard({ product }: { product: Product }) {
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null

  return (
    <Link
      to={`/shop/${product.slug}`}
      onClick={() => trackProductClick(product.id, product.category)}
      className="group overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-lg"
    >
      <div className="relative bg-[#F8FAFC] aspect-square overflow-hidden">
        {product.image
          ? <img
              src={cloudinaryImageUrl(product.image, 400) ?? product.image}
              srcSet={`${cloudinaryImageUrl(product.image, 320) ?? product.image} 320w, ${cloudinaryImageUrl(product.image, 400) ?? product.image} 400w, ${cloudinaryImageUrl(product.image, 640) ?? product.image} 640w`}
              sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 50vw"
              alt={product.name}
              loading="lazy"
              width={400}
              height={400}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
        }
        {/* hover overlay */}
        <div className="absolute inset-0 bg-[#071A2B]/28 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#071A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>
        {discount && (
          <div className="absolute left-2 top-2 rounded-md bg-[#EF4444] px-1.5 py-1">
            <span className="text-[9px] font-extrabold text-white">-{discount}%</span>
          </div>
        )}
      </div>
      <div className="p-2.5 sm:p-3">
        <p className="mb-1.5 truncate text-[11px] font-bold leading-4 text-[#071A2B] sm:text-[12px]">{product.name}</p>
        <div className="flex items-center flex-wrap gap-1">
          <span className="text-[11px] font-extrabold text-[#1E3A8A] sm:text-[12px]">UGX {product.price.toLocaleString()}</span>
          {product.originalPrice && (
            <span className="text-[9px] text-[#94A3B8] line-through">UGX {product.originalPrice.toLocaleString()}</span>
          )}
        </div>
        {product.rating > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            <span className="text-[12px] text-yellow-400">★</span>
            <span className="text-[10px] font-semibold text-[#64748B]">{product.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

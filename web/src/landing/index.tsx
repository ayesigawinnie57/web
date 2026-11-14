import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from './Navbar'
import Hero from './Hero'
import Products from './Products'
import PromoBanners from './PromoBanners'
import FlashDeals from './FlashDeals'
import ShopByCategory from './ShopByCategory'
import Recommended from './Recommended'
import Footer from './Footer'
import { productsApi, toProduct, watchPageResume, type Product } from '../lib/api'

export default function LandingPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([])
  const [nextProductsPage, setNextProductsPage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const handleFlashSaleProducts = useCallback((items: Product[]) => {
    setFlashSaleProducts(items)
  }, [])

  const flashSaleProductIds = useMemo(() => new Set(flashSaleProducts.map(product => product.id)), [flashSaleProducts])
  const flashSaleCatalogIds = useMemo(() => new Set(
    flashSaleProducts.flatMap(product => product.catalogProductId === null ? [] : [product.catalogProductId]),
  ), [flashSaleProducts])
  const featuredProducts = useMemo(
    () => products.filter(product =>
      !flashSaleProductIds.has(product.id)
      && (product.catalogProductId === null || !flashSaleCatalogIds.has(product.catalogProductId)),
    ).slice(0, 12),
    [products, flashSaleProductIds, flashSaleCatalogIds],
  )
  const excludedProductIds = useMemo(
    () => new Set([...featuredProducts, ...flashSaleProducts].map(product => product.id)),
    [featuredProducts, flashSaleProducts],
  )
  const excludedCatalogIds = useMemo(
    () => new Set([...featuredProducts, ...flashSaleProducts].flatMap(
      product => product.catalogProductId === null ? [] : [product.catalogProductId],
    )),
    [featuredProducts, flashSaleProducts],
  )

  useEffect(() => {
    let active = true
    const loadProducts = () => {
      productsApi.list('page_size=24').then(({ data }) => {
        const raw: any[] = Array.isArray(data) ? data : (data as any).results ?? []
        if (active) {
          setNextProductsPage(Array.isArray(data) ? null : (data as any).next ?? null)
          setProducts(raw.map(toProduct))
        }
      }).catch(() => undefined).finally(() => {
        if (active) setLoading(false)
      })
    }
    const stopWatching = watchPageResume(loadProducts)
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(loadProducts, { timeout: 1500 })
      return () => {
        active = false
        stopWatching()
        window.cancelIdleCallback(idleId)
      }
    }
    const timeoutId = window.setTimeout(loadProducts, 250)
    return () => {
      active = false
      stopWatching()
      window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <div className="pb-20 pt-[112px] lg:pb-0 lg:pt-[128px]">
        <Hero />
        <ShopByCategory />
        <FlashDeals onProductsLoaded={handleFlashSaleProducts} />
        <PromoBanners />
        {loading ? <ProductsSkeleton /> : <Products products={featuredProducts} />}
        {!loading && (
          <Recommended
            products={products}
            nextPage={nextProductsPage}
            featuredIds={excludedProductIds}
            featuredCatalogIds={excludedCatalogIds}
          />
        )}
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-3">
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

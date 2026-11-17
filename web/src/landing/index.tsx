import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import Navbar from './Navbar'
import Hero from './Hero'
import Products from './Products'
import CategoryProductSections from './CategoryProductSections'
import PromoBanners from './PromoBanners'
import FlashDeals from './FlashDeals'
import ShopByCategory from './ShopByCategory'
import Recommended from './Recommended'
import Footer from './Footer'
import { LOGO, productsApi, toProduct, watchPageResume, type Product } from '../lib/api'

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
      <Helmet>
        <title>Majo Market | Online Marketplace in Uganda | Shop Quality Products</title>
        <meta name="description" content="Discover quality products from trusted sellers on Majo Market. Shop electronics, fashion, home essentials, tools, accessories and more at great prices." />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://www.majogadgets.com/" />
        <meta property="og:title" content="Majo Market | Shop Quality Products Online in Uganda" />
        <meta property="og:description" content="Discover quality products from trusted sellers on Majo Market. Shop electronics, fashion, home essentials, tools, accessories and more." />
        <meta property="og:url" content="https://www.majogadgets.com/" />
        <meta property="og:image" content={LOGO} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Majo Market | Shop Quality Products Online in Uganda" />
        <meta name="twitter:description" content="Discover quality products from trusted sellers on Majo Market. Shop electronics, fashion, home essentials, tools, accessories and more." />
        <meta name="twitter:image" content={LOGO} />
      </Helmet>
      <Navbar />
      <div className="pb-20 pt-[112px] lg:pb-0 lg:pt-[128px]">
        <Hero />
        <ShopByCategory />
        <FlashDeals onProductsLoaded={handleFlashSaleProducts} />
        <PromoBanners />
        {loading ? <ProductsSkeleton /> : <Products products={featuredProducts} />}
        <CategoryProductSections />
        {!loading && (
          <Recommended
            products={products}
            nextPage={nextProductsPage}
            featuredIds={excludedProductIds}
            featuredCatalogIds={excludedCatalogIds}
          />
        )}
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="marketplace-intro">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7">
            <h2 id="marketplace-intro" className="text-xl font-extrabold text-[#071A2B]">Shop Online with Majo Market</h2>
            <p className="mt-3 text-sm leading-6 text-[#475569]">
              Discover a wide selection of products from trusted sellers on Majo Market, a growing online marketplace in Uganda.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#475569]">
              Browse electronics, gadgets, fashion, shoes, home essentials, tools, accessories and many other products from different sellers in one convenient place.
            </p>
            <p className="mt-3 text-sm leading-6 text-[#475569]">
              Majo Market gives shoppers more choice by allowing them to discover different products, prices, stock availability and seller offers. Customers should be able to compare available offers and view useful seller information before purchasing.
            </p>
            <p className="mt-4 text-sm font-bold text-[#071A2B]">Majo Market — Quality Products, Great Value.</p>
          </div>
        </section>
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

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronDown, Filter, RotateCcw } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import ProductCard from '../components/ProductCard'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'
import { getCategoryPath, productsApi, toProduct, watchPageResume, type ApiCategory, type Product } from '../lib/api'

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [related, setRelated] = useState<Product[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [totalProductsCount, setTotalProductsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const saleOnly = searchParams.get('sale') === 'true'
  const topBought = searchParams.get('top_bought') === 'true'
  const brand = searchParams.get('brand') ?? ''
  const priceMin = searchParams.get('price_min') ?? ''
  const priceMax = searchParams.get('price_max') ?? ''
  const availableOnly = searchParams.get('available') === 'true'
  const minRating = searchParams.get('min_rating') ?? ''
  const seller = searchParams.get('seller') ?? ''
  const ordering = searchParams.get('ordering') ?? ''

  useEffect(() => {
    setLoading(true)
    setRelated([])
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    if (category) params.set('category', category)
    if (topBought) params.set('top_bought', 'true')
    if (brand) params.set('brand', brand)
    if (priceMin) params.set('price_min', priceMin)
    if (priceMax) params.set('price_max', priceMax)
    if (availableOnly) params.set('available', 'true')
    if (minRating) params.set('min_rating', minRating)
    if (seller) params.set('seller', seller)
    if (ordering) params.set('ordering', ordering)

    let active = true
    const loadProducts = () => {
      Promise.all([
        productsApi.list(params.toString()),
        productsApi.categories(),
      ]).then(async ([productResponse, categoryResponse]) => {
        const raw = Array.isArray(productResponse.data) ? productResponse.data : (productResponse.data as any).results ?? []
        let available = raw.map(toProduct)
        if (saleOnly) available = available.filter((p: Product) => p.originalPrice && p.originalPrice > p.price)

        const rawCategories = Array.isArray(categoryResponse.data) ? categoryResponse.data : (categoryResponse.data as any).results ?? []
        if (active) {
          setCategories(rawCategories)
          setProducts(available)
          setTotalProductsCount(saleOnly || Array.isArray(productResponse.data)
            ? available.length
            : (productResponse.data as any).count ?? available.length)
          setRelated([])
        }

        if (category && available.length === 0) {
          const { data } = await productsApi.list('')
          const all = Array.isArray(data) ? data : (data as any).results ?? []
          const mixed = all.map(toProduct).filter((p: Product) => p.category !== category)
          if (active) setRelated(mixed.slice(0, 12))
        }

        if (active) setError(false)
      }).catch(() => {
        if (active) setError(true)
      }).finally(() => {
        if (active) setLoading(false)
      })
    }
    loadProducts()
    const stopWatching = watchPageResume(loadProducts)
    return () => {
      active = false
      stopWatching()
    }
  }, [query, category, saleOnly, topBought, brand, priceMin, priceMax, availableOnly, minRating, seller, ordering])

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const selectedCategory = categories.find(c => c.slug === category)
  const categoryPath = selectedCategory ? getCategoryPath(categories, selectedCategory) : []
  const categoryName = categoryPath.map(item => item.name).join(' / ')
  const heading = topBought ? 'Top Bought Products' : saleOnly ? 'Deals' : categoryName || (query ? `Results for "${query}"` : 'Shop all products')
  const activeAttributeFilters = selectedCategory?.attributes.filter(attribute => searchParams.get(`attr_${attribute.key}`)) ?? []
  const activeFilterCount = [
    category,
    saleOnly,
    brand,
    priceMin,
    priceMax,
    availableOnly,
    minRating,
    seller,
    ordering,
    ...activeAttributeFilters.map(attribute => attribute.key),
  ].filter(Boolean).length

  const clearFilters = () => {
    const next = new URLSearchParams()
    if (query) next.set('q', query)
    setSearchParams(next)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>{heading} – Majo Gadgets</title>
        <meta name="description" content={`Shop ${heading.toLowerCase()} on Majo Gadgets. Great prices, fast delivery across Uganda.`} />
        <link rel="canonical" href="https://www.majogadgets.com/shop" />
      </Helmet>
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-[112px] lg:px-6 lg:pb-12 lg:pt-[128px]">
        <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#071A2B] via-[#12344A] to-[#1E3A8A] px-5 py-6 text-white shadow-lg shadow-[#071A2B]/10 sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.04]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">Majo Gadgets Marketplace</p>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{heading}</h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-5 text-white/75">
                Discover quality products from trusted stores, all in one place.
              </p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xl font-extrabold tabular-nums">{loading ? '—' : totalProductsCount.toLocaleString()}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">products available</p>
            </div>
          </div>
        </header>

        <section aria-label="Product filters" className="mb-7 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#1E3A8A]">
                <Filter size={17} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#071A2B]">Find your product</h2>
                <p className="text-[11px] text-[#64748B]">Choose a category or refine your results</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 !rounded-lg px-2.5 py-2 text-[11px] font-semibold text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#071A2B]"
                >
                  <RotateCcw size={13} /> Clear filters
                </button>
              )}
              <button
                type="button"
                aria-expanded={showAdvancedFilters}
                onClick={() => setShowAdvancedFilters(value => !value)}
                className="inline-flex items-center gap-2 !rounded-xl border border-[#CBD5E1] px-3 py-2 text-[12px] font-bold text-[#071A2B] transition hover:border-[#1E3A8A] hover:bg-[#F8FAFC]"
              >
                More filters
                {activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1E3A8A] px-1 text-[10px] text-white">{activeFilterCount}</span>}
                <ChevronDown size={14} className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <select
              aria-label="Department filter"
              value={categoryPath[0]?.slug ?? ''}
              onChange={event => updateFilter('category', event.target.value)}
              className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#071A2B] outline-none transition focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All departments</option>
              {categories.filter(item => item.parent_id === null).map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <select
              aria-label="Category filter"
              value={categoryPath[1]?.slug ?? ''}
              onChange={event => updateFilter('category', event.target.value || categoryPath[0]?.slug || '')}
              disabled={!categoryPath[0]}
              className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#071A2B] outline-none transition focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50 disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
            >
              <option value="">All in department</option>
              {categories.filter(item => item.parent_id === categoryPath[0]?.id).map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <select
              aria-label="Subcategory filter"
              value={categoryPath[2]?.slug ?? ''}
              onChange={event => updateFilter('category', event.target.value || categoryPath[1]?.slug || '')}
              disabled={!categoryPath[1]}
              className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#071A2B] outline-none transition focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50 disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
            >
              <option value="">All in category</option>
              {categories.filter(item => item.parent_id === categoryPath[1]?.id).map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <select aria-label="Sort products" value={ordering} onChange={event => updateFilter('ordering', event.target.value)} className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#071A2B] outline-none transition focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50">
              <option value="">Newest first</option><option value="price">Price: low to high</option><option value="-price">Price: high to low</option><option value="-rating">Top rated</option>
            </select>
          </div>

          {showAdvancedFilters && (
            <div className="mt-4 border-t border-[#E2E8F0] pt-4">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <select value={saleOnly ? 'sale' : ''} onChange={event => updateFilter('sale', event.target.value ? 'true' : '')} className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#071A2B] outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50">
                  <option value="">All product types</option>
                  <option value="sale">On sale</option>
                </select>
                <input aria-label="Brand filter" value={brand} onChange={event => updateFilter('brand', event.target.value)} placeholder="Brand" className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50" />
                <input aria-label="Minimum price" type="number" min="0" value={priceMin} onChange={event => updateFilter('price_min', event.target.value)} placeholder="Minimum price (UGX)" className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50" />
                <input aria-label="Maximum price" type="number" min="0" value={priceMax} onChange={event => updateFilter('price_max', event.target.value)} placeholder="Maximum price (UGX)" className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50" />
                <select aria-label="Minimum rating filter" value={minRating} onChange={event => updateFilter('min_rating', event.target.value)} className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50">
                  <option value="">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option>
                </select>
                <input aria-label="Trader or store filter" value={seller} onChange={event => updateFilter('seller', event.target.value)} placeholder="Trader or store" className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50" />
                <label className="flex h-11 items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[12px] font-medium text-[#334155]">
                  <input type="checkbox" checked={availableOnly} onChange={event => updateFilter('available', event.target.checked ? 'true' : '')} className="h-4 w-4 accent-[#1E3A8A]" />
                  In stock only
                </label>
                {selectedCategory?.attributes.filter(attribute => attribute.is_filterable).map(attribute => (
                  attribute.choices.length ? (
                    <select
                      key={attribute.key}
                      aria-label={attribute.name}
                      value={searchParams.get(`attr_${attribute.key}`) ?? ''}
                      onChange={event => updateFilter(`attr_${attribute.key}`, event.target.value)}
                      className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="">Any {attribute.name}</option>
                      {attribute.choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
                    </select>
                  ) : (
                    <input
                      key={attribute.key}
                      aria-label={attribute.name}
                      value={searchParams.get(`attr_${attribute.key}`) ?? ''}
                      onChange={event => updateFilter(`attr_${attribute.key}`, event.target.value)}
                      placeholder={attribute.name}
                      className="h-11 min-w-0 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[12px] outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-50"
                    />
                  )
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#071A2B]">{query ? 'Search results' : categoryName ? 'Products in this category' : 'Browse products'}</h2>
            {!loading && <p className="mt-0.5 text-[12px] text-[#64748B]">{totalProductsCount.toLocaleString()} products</p>}
          </div>
        </div>

        {error ? (
          <div className="py-20 text-center">
            <p className="text-[15px] font-bold text-[#071A2B]">Products could not be loaded</p>
            <p className="text-[13px] text-[#64748B] mt-2">Please try again in a moment.</p>
          </div>
        ) : loading ? (
          <div className="py-20 text-center text-[13px] text-[#64748B]">Loading products...</div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div>
            <div className="py-12 text-center">
              <p className="text-[15px] font-bold text-[#071A2B]">
                No products in {categoryName || 'this category'} yet
              </p>
              <p className="text-[13px] text-[#64748B] mt-1">Check back soon or explore related products below.</p>
              <Link to="/shop" className="inline-block mt-4 text-[13px] font-bold text-[#1E3A8A]">Browse all products</Link>
            </div>

            {related.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A] mb-1">You might also like</p>
                <h2 className="text-xl font-extrabold text-[#071A2B] mb-5">Related Products</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {related.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

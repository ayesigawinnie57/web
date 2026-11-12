import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>{heading} – Majo Gadgets</title>
        <meta name="description" content={`Shop ${heading.toLowerCase()} on Majo Gadgets. Great prices, fast delivery across Uganda.`} />
        <link rel="canonical" href="https://www.majogadgets.com/shop" />
      </Helmet>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Majo Gadgets</p>
            <h1 className="text-3xl font-extrabold text-[#071A2B] mt-1">{heading}</h1>
            {!loading && products.length > 0 && (
              <p className="text-[13px] text-[#64748B] mt-2">{products.length} product{products.length === 1 ? '' : 's'} available</p>
            )}
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto lg:grid-cols-4">
            <select
              aria-label="Department filter"
              value={categoryPath[0]?.slug ?? ''}
              onChange={event => updateFilter('category', event.target.value)}
              className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none"
            >
              <option value="">All departments</option>
              {categories.filter(item => item.parent_id === null).map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <select
              aria-label="Category filter"
              value={categoryPath[1]?.slug ?? ''}
              onChange={event => updateFilter('category', event.target.value || categoryPath[0]?.slug || '')}
              disabled={!categoryPath[0]}
              className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none disabled:bg-[#F1F5F9]"
            >
              <option value="">All in department</option>
              {categories.filter(item => item.parent_id === categoryPath[0]?.id).map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <select
              aria-label="Subcategory filter"
              value={categoryPath[2]?.slug ?? ''}
              onChange={event => updateFilter('category', event.target.value || categoryPath[1]?.slug || '')}
              disabled={!categoryPath[1]}
              className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none disabled:bg-[#F1F5F9]"
            >
              <option value="">All in category</option>
              {categories.filter(item => item.parent_id === categoryPath[1]?.id).map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <select value={saleOnly ? 'sale' : ''} onChange={event => updateFilter('sale', event.target.value ? 'true' : '')} className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none">
              <option value="">All products</option>
              <option value="sale">On sale</option>
            </select>
            <input aria-label="Brand filter" value={brand} onChange={event => updateFilter('brand', event.target.value)} placeholder="Brand" className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] outline-none" />
            <input aria-label="Minimum price" type="number" min="0" value={priceMin} onChange={event => updateFilter('price_min', event.target.value)} placeholder="Min price" className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] outline-none" />
            <input aria-label="Maximum price" type="number" min="0" value={priceMax} onChange={event => updateFilter('price_max', event.target.value)} placeholder="Max price" className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] outline-none" />
            <select aria-label="Minimum rating filter" value={minRating} onChange={event => updateFilter('min_rating', event.target.value)} className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] outline-none">
              <option value="">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option>
            </select>
            <input aria-label="Trader or store filter" value={seller} onChange={event => updateFilter('seller', event.target.value)} placeholder="Trader or store" className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] outline-none" />
            <select aria-label="Sort products" value={ordering} onChange={event => updateFilter('ordering', event.target.value)} className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] outline-none">
              <option value="">Newest first</option><option value="price">Price: low to high</option><option value="-price">Price: high to low</option><option value="-rating">Top rated</option>
            </select>
            <label className="flex h-10 items-center gap-2 border border-[#E2E8F0] bg-white px-3 text-[12px] text-[#334155]">
              <input type="checkbox" checked={availableOnly} onChange={event => updateFilter('available', event.target.checked ? 'true' : '')} />
              In stock
            </label>
            {selectedCategory?.attributes.filter(attribute => attribute.is_filterable).map(attribute => (
              attribute.choices.length ? (
                <select
                  key={attribute.key}
                  aria-label={attribute.name}
                  value={searchParams.get(`attr_${attribute.key}`) ?? ''}
                  onChange={event => updateFilter(`attr_${attribute.key}`, event.target.value)}
                  className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] outline-none"
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
                  className="h-10 min-w-0 px-3 bg-white border border-[#E2E8F0] text-[13px] outline-none"
                />
              )
            ))}
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
                No products in {categoryName ?? 'this category'} yet
              </p>
              <p className="text-[13px] text-[#64748B] mt-1">Check back soon or explore related products below.</p>
              <Link to="/shop" className="inline-block mt-4 text-[13px] font-bold text-[#1E3A8A]">Browse all products</Link>
            </div>

            {related.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A] mb-1">You might also like</p>
                <h2 className="text-xl font-extrabold text-[#071A2B] mb-5">Related Products</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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

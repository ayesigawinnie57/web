import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'
import { productsApi, toProduct, type ApiCategory, type Product } from '../lib/api'

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

  useEffect(() => {
    setLoading(true)
    setRelated([])
    const params = new URLSearchParams()
    if (query) params.set('search', query)
    if (category) params.set('category', category)

    Promise.all([
      productsApi.list(params.toString()),
      productsApi.categories(),
    ]).then(async ([productResponse, categoryResponse]) => {
      const raw = Array.isArray(productResponse.data) ? productResponse.data : (productResponse.data as any).results ?? []
      let available = raw.map(toProduct)
      if (saleOnly) available = available.filter((p: Product) => p.originalPrice && p.originalPrice > p.price)

      const rawCategories = Array.isArray(categoryResponse.data) ? categoryResponse.data : (categoryResponse.data as any).results ?? []
      setCategories(rawCategories)
      setProducts(available)

      // If filtering by category and no products found, load related from other categories
      if (category && available.length === 0) {
        const { data } = await productsApi.list('')
        const all = Array.isArray(data) ? data : (data as any).results ?? []
        const mixed = all.map(toProduct).filter((p: Product) => p.category !== category)
        setRelated(mixed.slice(0, 12))
      }

      setError(false)
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [query, category, saleOnly])

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const categoryName = categories.find(c => c.slug === category)?.name
  const heading = saleOnly ? 'Deals' : categoryName ?? (query ? `Results for "${query}"` : 'Shop all products')

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
          <div className="flex items-center gap-3">
            <select value={category} onChange={e => updateFilter('category', e.target.value)} className="h-10 px-3 bg-white border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none">
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <select value={saleOnly ? 'sale' : ''} onChange={e => updateFilter('sale', e.target.value ? 'true' : '')} className="h-10 px-3 bg-white border border-[#E2E8F0] text-[13px] text-[#071A2B] outline-none">
              <option value="">All products</option>
              <option value="sale">On sale</option>
            </select>
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

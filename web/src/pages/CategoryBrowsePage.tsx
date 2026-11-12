import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ChevronRight, Grid2X2 } from 'lucide-react'
import Footer from '../landing/Footer'
import Navbar from '../landing/Navbar'
import ProductCard from '../components/ProductCard'
import {
  getCategoryPath,
  getCategoryUrl,
  productsApi,
  toProduct,
  type ApiCategory,
  type Product,
} from '../lib/api'

export default function CategoryBrowsePage({ categoryId }: { categoryId: number }) {
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [category, setCategory] = useState<ApiCategory | null>(null)
  const [children, setChildren] = useState<ApiCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productCount, setProductCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    productsApi.categories()
      .then(async categoryResponse => {
        const allCategories = Array.isArray(categoryResponse.data)
          ? categoryResponse.data
          : (categoryResponse.data as any).results ?? []
        const selected = allCategories.find((item: ApiCategory) => item.id === categoryId) ?? null
        if (!selected) throw new Error('Category not found')
        const productResponse = await productsApi.byCategory(selected.slug)
        const rawProducts = Array.isArray(productResponse.data)
          ? productResponse.data
          : (productResponse.data as any).results ?? []
        const productPage = productResponse.data as any
        if (active) {
          setCategories(allCategories)
          setCategory(selected)
          setChildren(allCategories.filter((item: ApiCategory) => item.parent_id === selected.id))
          setProducts(rawProducts.map(toProduct))
          setProductCount(Array.isArray(productResponse.data) ? rawProducts.length : productPage.count ?? rawProducts.length)
          setPage(1)
          setHasMore(!Array.isArray(productResponse.data) && Boolean(productPage.next))
          setError(false)
        }
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [categoryId])

  const path = category ? getCategoryPath(categories, category) : []
  const canonicalUrl = `https://www.majogadgets.com${category ? getCategoryUrl(categories, category) : '/categories'}`
  const loadMore = async () => {
    if (!category || loadingMore || !hasMore) return
    setLoadingMore(true)
    setLoadMoreError(false)
    try {
      const nextPage = page + 1
      const response = await productsApi.byCategory(category.slug, nextPage)
      const rawProducts = Array.isArray(response.data) ? response.data : (response.data as any).results ?? []
      setProducts(current => [...current, ...rawProducts.map(toProduct)])
      setPage(nextPage)
      setHasMore(!Array.isArray(response.data) && Boolean((response.data as any).next))
    } catch {
      setLoadMoreError(true)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>{category ? `${category.name} – Majo Gadgets` : 'Category – Majo Gadgets'}</title>
        <meta name="description" content={category?.description || `Shop ${category?.name ?? 'products'} on Majo Gadgets.`} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 pt-14 lg:pt-16">
        <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-[12px] text-[#64748B]">
          <Link to="/" className="hover:text-[#1E3A8A]">Home</Link>
          <ChevronRight size={14} />
          <Link to="/categories" className="hover:text-[#1E3A8A]">Categories</Link>
          {path.map((item, index) => (
            <span key={item.id} className="inline-flex items-center gap-1">
              <ChevronRight size={14} />
              {index === path.length - 1
                ? <span className="font-semibold text-[#071A2B]">{item.name}</span>
                : <Link to={getCategoryUrl(categories, item)} className="hover:text-[#1E3A8A]">{item.name}</Link>}
            </span>
          ))}
        </nav>

        {loading ? (
          <div className="py-20 text-center text-[13px] text-[#64748B]">Loading category...</div>
        ) : error || !category ? (
          <div className="py-20 text-center">
            <h1 className="text-xl font-bold text-[#071A2B]">Category could not be loaded</h1>
            <Link to="/categories" className="mt-3 inline-block text-[13px] font-bold text-[#1E3A8A]">Browse all departments</Link>
          </div>
        ) : (
          <>
            <header className="mb-7 rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Marketplace category</p>
              <h1 className="mt-1 text-3xl font-extrabold text-[#071A2B]">{category.name}</h1>
              {category.description && <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#64748B]">{category.description}</p>}
              <p className="mt-3 text-[12px] text-[#64748B]">{productCount} product{productCount === 1 ? '' : 's'}</p>
            </header>

            {children.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 text-lg font-extrabold text-[#071A2B]">Browse {category.name}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {children.map(child => (
                    <Link key={child.id} to={getCategoryUrl(categories, child)} className="group rounded-xl border border-[#E2E8F0] bg-white p-4 hover:border-[#1E3A8A]">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1E3A8A]">
                        {child.image ? <img src={child.image} alt="" className="h-full w-full rounded-lg object-cover" /> : <Grid2X2 size={20} />}
                      </div>
                      <h3 className="text-[13px] font-bold text-[#071A2B] group-hover:text-[#1E3A8A]">{child.name}</h3>
                      <p className="mt-1 text-[11px] text-[#64748B]">{child.product_count} products</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-4 text-lg font-extrabold text-[#071A2B]">
                {children.length ? 'Products in this department' : `Products in ${category.name}`}
              </h2>
              {products.length ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {products.map(product => <ProductCard key={product.id} product={product} />)}
                  </div>
                  {hasMore && (
                    <div className="mt-8 text-center">
                      {loadMoreError && <p role="alert" className="mb-2 text-[12px] text-red-600">Could not load more products. Please try again.</p>}
                      <button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-lg bg-[#071A2B] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60">
                        {loadingMore ? 'Loading...' : 'Load more products'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-10 text-center text-[13px] text-[#64748B]">No products in this category yet.</p>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

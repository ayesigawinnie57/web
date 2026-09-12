import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Grid2X2, Home, ShoppingBag, Sparkles, Trophy } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'
import { productsApi, type ApiCategory, type ApiProduct } from '../lib/api'

type Category = ApiCategory & { count: number }
const icons = [Grid2X2, ShoppingBag, Sparkles, BookOpen, Home, Trophy]
const colors = ['#1E3A8A', '#E11D48', '#D97706', '#7C3AED', '#0F766E', '#15803D']
const backgrounds = ['#EFF6FF', '#FFF1F2', '#FFFBEB', '#F5F3FF', '#F0FDFA', '#F0FDF4']

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([productsApi.categories(), productsApi.list()]).then(([categoryResponse, productResponse]) => {
      const rawCategories = Array.isArray(categoryResponse.data) ? categoryResponse.data : (categoryResponse.data as any).results ?? []
      const rawProducts: ApiProduct[] = Array.isArray(productResponse.data) ? productResponse.data : (productResponse.data as any).results ?? []
      const counts = rawProducts.reduce<Record<string, number>>((result, product) => {
        const slug = product.category?.slug
        if (slug) result[slug] = (result[slug] ?? 0) + 1
        return result
      }, {})
      setCategories(rawCategories.map((category: ApiCategory) => ({ ...category, count: counts[category.slug] ?? 0 })))
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Explore Majo Gadgets</p><h1 className="text-3xl font-extrabold text-[#071A2B] mt-1">Categories</h1><p className="text-[13px] text-[#64748B] mt-2">Find products by category.</p></div>
        {loading ? <div className="py-20 text-center text-[13px] text-[#64748B]">Loading categories...</div> : error ? <div className="py-20 text-center"><p className="font-bold text-[#071A2B]">Could not load categories</p><p className="text-[13px] text-[#64748B] mt-2">Please try again in a moment.</p></div> : categories.length === 0 ? <div className="py-20 text-center text-[13px] text-[#64748B]">No categories yet.</div> : <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">{categories.map((category, index) => { const Icon = icons[index % icons.length]; return <Link key={category.id} to={`/shop?category=${category.slug}`} className="group bg-white border border-[#E2E8F0] hover:border-[#1E3A8A] transition-colors overflow-hidden"><div className="aspect-[1.4] flex items-center justify-center overflow-hidden" style={{ backgroundColor: backgrounds[index % backgrounds.length] }}>{category.image ? <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <Icon size={42} color={colors[index % colors.length]} strokeWidth={1.7} />}</div><div className="p-4"><h2 className="text-[15px] font-extrabold text-[#071A2B] truncate">{category.name}</h2><p className="text-[12px] text-[#64748B] mt-1">{category.count} item{category.count === 1 ? '' : 's'}</p></div></Link> })}</div>}
      </main>
      <Footer />
    </div>
  )
}

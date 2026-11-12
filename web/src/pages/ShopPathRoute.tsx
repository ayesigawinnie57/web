import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { productsApi, type ApiCategory } from '../lib/api'
import ProductPage from './ProductPage'
import CategoryBrowsePage from './CategoryBrowsePage'

export default function ShopPathRoute() {
  const { slug, department, category, subcategory } = useParams()
  const segments = [department, category, subcategory].filter((value): value is string => Boolean(value))
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    productsApi.categories()
      .then(({ data }) => {
        const all = Array.isArray(data) ? data : (data as any).results ?? []
        if (active) setCategories(all)
      })
      .catch(() => { if (active) setFailed(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] pt-24 text-center text-sm text-[#64748B]">Loading...</div>
  if (failed) return <div className="min-h-screen bg-[#F8FAFC] pt-24 text-center text-sm text-[#64748B]">Could not load this page.</div>

  if (slug) {
    const departmentCategory = categories.find(item => item.slug === slug && item.parent_id === null)
    if (departmentCategory) return <CategoryBrowsePage categoryId={departmentCategory.id} />
    return <ProductPage />
  }

  let parentId: number | null = null
  let selected: ApiCategory | undefined
  for (const segment of segments) {
    selected = categories.find(item => item.slug === segment && item.parent_id === parentId)
    if (!selected) break
    parentId = selected.id
  }

  if (selected && segments.length) return <CategoryBrowsePage categoryId={selected.id} />

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 pt-24 text-center">
      <h1 className="text-xl font-bold text-[#071A2B]">Category not found</h1>
      <Link to="/categories" className="mt-3 inline-block text-sm font-bold text-[#1E3A8A]">Browse categories</Link>
    </div>
  )
}

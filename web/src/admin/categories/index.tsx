import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Grid2X2, Search, X } from 'lucide-react'
import { adminProductsApi, getCategoryPath, type ApiCategory } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

export default function AdminCategories() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    adminProductsApi.categories()
      .then(({ data }) => setCategories(Array.isArray(data) ? data : (data as any).results ?? []))
      .catch(err => setError(parseError(err, 'Failed to load categories.')))
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Deactivate "${name}"? Existing products and category history will be preserved.`)) return
    try {
      await adminProductsApi.deleteCategory(id)
      setCategories(prev => prev.map(category => category.id === id ? { ...category, is_active: false } : category))
    } catch (err) {
      setError(parseError(err, 'Failed to delete category.'))
    }
  }

  const query = search.trim().toLocaleLowerCase()
  const visibleCategories = categories.filter(category => {
    if (!query) return true
    const path = getCategoryPath(categories, category)
    return path.some(item =>
      item.name.toLocaleLowerCase().includes(query)
      || item.slug.toLocaleLowerCase().includes(query),
    )
  })

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-[#071A2B]">Categories ({categories.length})</h1>
          <p className="mt-1 text-[12px] text-[#64748B]">Manage your marketplace departments and category hierarchy.</p>
        </div>
        <button
          onClick={() => navigate('/admin/categories/add')}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-4 py-2.5 text-[13px] font-bold text-white hover:opacity-90"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <div className="mb-5 flex min-w-0 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 shadow-sm sm:max-w-2xl">
        <Search size={16} className="shrink-0 text-[#94A3B8]" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search category, department, or slug..."
          aria-label="Search categories"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#071A2B] outline-none placeholder:text-[#94A3B8]"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Clear category search" className="shrink-0 rounded-md p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#071A2B]">
            <X size={15} />
          </button>
        )}
      </div>
      {query && (
        <p className="mb-4 text-[11px] font-semibold text-[#64748B]" role="status">
          Showing {visibleCategories.length} of {categories.length} categories
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : categories.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#94A3B8]">
          <Grid2X2 size={40} />
          <p className="text-[14px] font-semibold">No categories yet</p>
        </div>
      ) : visibleCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#CBD5E1] bg-white py-16 text-center">
          <Search size={30} className="mb-3 text-[#94A3B8]" />
          <p className="text-[14px] font-bold text-[#334155]">No matching categories</p>
          <p className="mt-1 text-[12px] text-[#64748B]">Try another name, department, or slug.</p>
          <button type="button" onClick={() => setSearch('')} className="mt-4 text-[12px] font-bold text-[#1E3A8A] hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {visibleCategories.map(item => {
            const path = getCategoryPath(categories, item)
            return (
              <article key={item.id} className="flex min-w-0 gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
                {item.image
                  ? <img src={item.image} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-[#F8FAFC] object-cover sm:h-24 sm:w-24" />
                  : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#F8FAFC] sm:h-24 sm:w-24"><Grid2X2 size={26} color="#CBD5E1" /></div>
                }
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-[14px] font-bold text-[#071A2B]">{item.name}</h2>
                      <p className="mt-0.5 truncate text-[11px] text-[#64748B]" title={path.map(category => category.name).join(' / ')}>
                        {path.length > 1 ? path.slice(0, -1).map(category => category.name).join(' / ') : 'Top-level department'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[10px] text-[#94A3B8]" title={item.slug}>{item.slug}</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <p className="text-[11px] font-semibold text-[#64748B]">
                      {item.product_count} products <span className="mx-1 text-[#CBD5E1]">·</span> Order {item.position}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/categories/${item.id}`)}
                        aria-label={`Edit ${item.name}`}
                        title={`Edit ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366f118] hover:opacity-80"
                      >
                        <Pencil size={13} color="#6366f1" />
                      </button>
                      <button
                        type="button"
                        onClick={() => item.is_active && handleDelete(item.id, item.name)}
                        disabled={!item.is_active}
                        aria-label={`Deactivate ${item.name}`}
                        title={item.is_active ? `Deactivate ${item.name}` : 'Already inactive'}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ef444418] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={13} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

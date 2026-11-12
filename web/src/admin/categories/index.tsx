import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Grid2X2 } from 'lucide-react'
import { adminProductsApi, type ApiCategory } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

export default function AdminCategories() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-[#071A2B]">Categories ({categories.length})</h1>
        <button
          onClick={() => navigate('/admin/categories/add')}
          className="flex items-center gap-2 bg-[#22C55E] text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>
      ) : categories.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#94A3B8]">
          <Grid2X2 size={40} />
          <p className="text-[14px] font-semibold">No categories yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {categories.map(item => (
            <div key={item.id} className="bg-white border border-[#E2E8F0] rounded-xl p-3">
              {item.image
                ? <img src={item.image} alt={item.name} className="w-full h-28 rounded-lg object-cover mb-2" />
                : <div className="w-full h-28 rounded-lg bg-[#F8FAFC] flex items-center justify-center mb-2"><Grid2X2 size={24} color="#CBD5E1" /></div>
              }
              <p className="text-[13px] font-bold text-[#071A2B]">{item.name}</p>
              <p className="text-[11px] text-[#64748B]">{item.parent_id ? `Parent: ${categories.find(category => category.id === item.parent_id)?.name ?? 'Unknown'}` : 'Department'}</p>
              <p className="mb-2 text-[11px] text-[#94A3B8]">{item.slug} · {item.product_count} products · Order {item.position} · {item.is_active ? 'Active' : 'Inactive'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/admin/categories/${item.id}`)}
                  className="flex-1 h-8 rounded-lg bg-[#6366f118] flex items-center justify-center hover:opacity-80"
                >
                  <Pencil size={13} color="#6366f1" />
                </button>
                <button
                  onClick={() => item.is_active && handleDelete(item.id, item.name)}
                  disabled={!item.is_active}
                  className="flex-1 h-8 rounded-lg bg-[#ef444418] flex items-center justify-center hover:opacity-80"
                >
                  <Trash2 size={13} color="#ef4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

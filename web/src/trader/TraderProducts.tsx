import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Package, ArrowLeft, ImagePlus, X } from 'lucide-react'
import { tradersApi, productsApi, type ApiTraderProduct, type ApiCategory } from '../lib/api'
import RichTextEditor from '../components/RichTextEditor'

const fmt = (n: string | number) => `UGX ${Number(n).toLocaleString()}`

type View = 'list' | 'add' | 'edit'

type Form = {
  name: string
  short_description: string
  long_description: string
  price: string
  original_price: string
  delivery_fee: string
  stock: string
  category_id: string
  is_active: boolean
  is_featured: boolean
  is_new_deal: boolean
}

const EMPTY: Form = {
  name: '', short_description: '', long_description: '',
  price: '', original_price: '', delivery_fee: '', stock: '',
  category_id: '', is_active: true, is_featured: false, is_new_deal: false,
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-[13px] font-semibold text-[#071A2B]">{label}</span>
    </label>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#071A2B] mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onWheel={type === 'number' ? e => (e.target as HTMLInputElement).blur() : undefined}
        placeholder={placeholder}
        className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
      />
    </div>
  )
}

export default function TraderProducts() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const [products, setProducts] = useState<ApiTraderProduct[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [editing, setEditing] = useState<ApiTraderProduct | null>(null)

  const [form, setForm] = useState<Form>(EMPTY)
  const set = (k: keyof Form) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([tradersApi.products(traderUuid!), productsApi.categories()])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data)
        const cats = Array.isArray(catRes.data) ? catRes.data : (catRes.data as any).results ?? []
        setCategories(cats)
      })
      .finally(() => setLoading(false))
  }, [traderUuid])

  const openAdd = () => {
    const firstCat = categories[0]
    setForm({ ...EMPTY, category_id: firstCat ? String(firstCat.id) : '' })
    setImages([]); setPreviews([]); setExistingImage(null)
    setError(''); setEditing(null); setView('add')
  }

  const openEdit = (p: ApiTraderProduct) => {
    setForm({
      name: p.name,
      short_description: p.short_description ?? '',
      long_description: p.long_description ?? '',
      price: p.price,
      original_price: p.original_price ?? '',
      delivery_fee: p.delivery_fee ?? '',
      stock: String(p.stock),
      category_id: p.category_id ? String(p.category_id) : '',
      is_active: p.is_active,
      is_featured: p.is_featured,
      is_new_deal: p.is_new_deal,
    })
    setImages([]); setPreviews([])
    setExistingImage(p.image_url || null)
    setError(''); setEditing(p); setView('edit')
  }

  const handleFilesAdd = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    setImages(prev => [...prev, ...arr])
    setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))])
  }

  const removePreview = (i: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleFileEdit = (files: FileList | null) => {
    if (!files?.[0]) return
    setImages([files[0]])
    setPreviews([URL.createObjectURL(files[0])])
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { setError('Name and price are required.'); return }
    setSaving(true); setError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('price', form.price)
      if (form.original_price) fd.append('original_price', form.original_price)
      if (form.delivery_fee) fd.append('delivery_fee', form.delivery_fee)
      fd.append('stock', form.stock || '0')
      if (form.short_description) fd.append('short_description', form.short_description)
      if (form.long_description) fd.append('long_description', form.long_description)
      if (form.category_id) fd.append('category_id', form.category_id)
      fd.append('is_active', String(form.is_active))
      fd.append('is_featured', String(form.is_featured))
      fd.append('is_new_deal', String(form.is_new_deal))
      if (images[0]) fd.append('image', images[0])

      if (view === 'add') {
        const r = await tradersApi.createProduct(traderUuid!, fd)
        setProducts(p => [r.data, ...p])
      } else {
        const r = await tradersApi.updateProduct(traderUuid!, editing!.uuid, fd)
        setProducts(p => p.map(x => x.uuid === r.data.uuid ? r.data : x))
      }
      setView('list')
    } catch { setError('Failed to save product.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (uuid: string) => {
    setDeleting(uuid)
    try {
      await tradersApi.deleteProduct(traderUuid!, uuid)
      setProducts(p => p.filter(x => x.uuid !== uuid))
    } finally { setDeleting(null) }
  }

  // ── Add / Edit view ────────────────────────────────────────────────────────
  if (view === 'add' || view === 'edit') {
    const isEdit = view === 'edit'
    const previewSrc = previews[0] ?? existingImage

    return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="p-1 hover:opacity-70">
            <ArrowLeft size={20} color="#071A2B" />
          </button>
          <h1 className="text-xl font-extrabold text-[#071A2B]">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-[13px] text-red-500 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="ml-3 shrink-0"><X size={14} /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">

            {isEdit ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-48 rounded-xl border border-dashed border-[#E2E8F0] bg-white flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-[#22C55E]"
                >
                  {previewSrc
                    ? <img src={previewSrc} className="w-full h-full object-cover" />
                    : <><ImagePlus size={28} color="#94A3B8" /><span className="text-[13px] text-[#94A3B8] font-semibold">Click to change image</span></>
                  }
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileEdit(e.target.files)} />
              </>
            ) : (
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Images</label>
                <div className="flex gap-3 flex-wrap">
                  {previews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} className="w-20 h-20 rounded-lg object-cover" />
                      <button type="button" onClick={() => removePreview(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                        <X size={10} color="#fff" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-lg border border-dashed border-[#E2E8F0] bg-white flex flex-col items-center justify-center gap-1 hover:border-[#22C55E]"
                  >
                    <ImagePlus size={20} color="#94A3B8" />
                    <span className="text-[10px] text-[#94A3B8] font-semibold">Add</span>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFilesAdd(e.target.files)} />
                </div>
              </div>
            )}

            <div className="flex gap-4 flex-wrap">
              <Toggle label="Featured" value={form.is_featured} onChange={v => set('is_featured')(v)} />
              <Toggle label="New Deal" value={form.is_new_deal} onChange={v => set('is_new_deal')(v)} />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Category</label>
              {categories.length === 0 && <p className="text-[12px] text-[#94A3B8] mb-2">Loading categories...</p>}
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => set('category_id')(String(cat.id))}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold capitalize transition-colors ${
                      form.category_id === String(cat.id)
                        ? 'bg-[#22C55E] border-[#22C55E] text-white'
                        : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#22C55E]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right columns */}
          <div className="lg:col-span-2 space-y-4">
            <Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Wireless Earbuds" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (UGX) *" value={form.price} onChange={set('price')} placeholder="e.g. 29000" type="number" />
              <Field label="Original Price (UGX)" value={form.original_price} onChange={set('original_price')} placeholder="e.g. 59000" type="number" />
              <Field label="Stock" value={form.stock} onChange={set('stock')} placeholder="e.g. 50" type="number" />
              <Field label="Delivery Fee (UGX)" value={form.delivery_fee} onChange={set('delivery_fee')} placeholder="e.g. 5000" type="number" />
            </div>
            <Field label="Short Description" value={form.short_description} onChange={set('short_description')} placeholder="Brief summary" />
            <div>
              <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Long Description</label>
              <RichTextEditor
                value={form.long_description}
                onChange={v => set('long_description')(v)}
                placeholder="Full product details..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold border border-[#E2E8F0] text-[#64748B] hover:border-[#071A2B] hover:text-[#071A2B] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-[#22C55E] text-white px-6 py-2.5 rounded-lg text-[13px] font-bold disabled:opacity-60 hover:opacity-90"
              >
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Product'}
              </button>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Package size={20} color="#071A2B" />
          <h1 className="text-[20px] font-extrabold text-[#071A2B]">My Products</h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#071A2B] text-white text-[13px] font-bold rounded-xl hover:opacity-80">
          <Plus size={14} /> Add Product
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} color="#CBD5E1" className="mx-auto mb-3" />
          <p className="text-[14px] text-[#64748B]">No products yet. Add your first product.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.uuid} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              {p.image_url
                ? <img src={p.image_url} className="w-full h-40 object-cover" />
                : <div className="w-full h-40 bg-[#F8FAFC] flex items-center justify-center"><Package size={32} color="#CBD5E1" /></div>
              }
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[14px] font-extrabold text-[#071A2B] leading-tight">{p.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
                <p className="text-[13px] font-bold text-[#22C55E] mb-1">{fmt(p.price)}</p>
                {p.category_name && <p className="text-[11px] text-[#94A3B8] mb-0.5">{p.category_name}</p>}
                <p className="text-[11px] text-[#94A3B8]">Stock: {p.stock}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1 py-2 border border-[#E2E8F0] rounded-lg text-[12px] font-bold text-[#071A2B] hover:bg-[#F8FAFC]">
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.uuid)}
                    disabled={deleting === p.uuid}
                    className="flex items-center justify-center gap-1 px-3 py-2 border border-red-100 rounded-lg text-[12px] font-bold text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

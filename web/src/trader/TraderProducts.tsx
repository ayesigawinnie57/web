import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Package, ArrowLeft, ImagePlus, X } from 'lucide-react'
import { tradersApi, type ApiTraderProduct } from '../lib/api'

const fmt = (n: string | number) => `UGX ${Number(n).toLocaleString()}`

type View = 'list' | 'add' | 'edit'

type Form = {
  name: string
  description: string
  price: string
  stock: string
  is_active: boolean
}

const EMPTY: Form = { name: '', description: '', price: '', stock: '', is_active: true }

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
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [editing, setEditing] = useState<ApiTraderProduct | null>(null)

  const [form, setForm] = useState<Form>(EMPTY)
  const set = (k: keyof Form) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  // image state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    tradersApi.products(traderUuid!).then(r => setProducts(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [traderUuid])

  const openAdd = () => {
    setForm(EMPTY)
    setImageFile(null)
    setImagePreview(null)
    setExistingImage(null)
    setError('')
    setEditing(null)
    setView('add')
  }

  const openEdit = (p: ApiTraderProduct) => {
    setForm({ name: p.name, description: p.description, price: p.price, stock: String(p.stock), is_active: p.is_active })
    setImageFile(null)
    setImagePreview(null)
    setExistingImage(p.image_url || null)
    setError('')
    setEditing(p)
    setView('edit')
  }

  const handleFile = (files: FileList | null) => {
    if (!files?.[0]) return
    setImageFile(files[0])
    setImagePreview(URL.createObjectURL(files[0]))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setExistingImage(null)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) { setError('Name and price are required.'); return }
    setSaving(true); setError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('price', form.price)
      fd.append('stock', form.stock || '0')
      fd.append('description', form.description)
      fd.append('is_active', String(form.is_active))
      if (imageFile) fd.append('image', imageFile)

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
    const previewSrc = imagePreview ?? existingImage
    const isEdit = view === 'edit'

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

          {/* Left column: image + active toggle */}
          <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
            {isEdit ? (
              // Edit: single large image picker (same as admin edit)
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-48 rounded-xl border border-dashed border-[#E2E8F0] bg-white flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-[#22C55E]"
                >
                  {previewSrc
                    ? <img src={previewSrc} className="w-full h-full object-cover" />
                    : <><ImagePlus size={28} color="#94A3B8" /><span className="text-[13px] text-[#94A3B8] font-semibold">Click to add image</span></>
                  }
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />
              </>
            ) : (
              // Add: thumbnail grid (same as admin add)
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Image</label>
                <div className="flex gap-3 flex-wrap">
                  {previewSrc && (
                    <div className="relative">
                      <img src={previewSrc} className="w-20 h-20 rounded-lg object-cover" />
                      <button type="button" onClick={removeImage} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                        <X size={10} color="#fff" />
                      </button>
                    </div>
                  )}
                  {!previewSrc && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-20 h-20 rounded-lg border border-dashed border-[#E2E8F0] bg-white flex flex-col items-center justify-center gap-1 hover:border-[#22C55E]"
                    >
                      <ImagePlus size={20} color="#94A3B8" />
                      <span className="text-[10px] text-[#94A3B8] font-semibold">Add</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />
                </div>
              </div>
            )}

            <Toggle label="Active (visible to customers)" value={form.is_active} onChange={v => set('is_active')(v)} />
          </div>

          {/* Right columns: fields */}
          <div className="lg:col-span-2 space-y-4">
            <Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Wireless Earbuds" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (UGX) *" value={form.price} onChange={set('price')} placeholder="e.g. 29000" type="number" />
              <Field label="Stock" value={form.stock} onChange={set('stock')} placeholder="e.g. 50" type="number" />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description')(e.target.value)}
                rows={4}
                placeholder="Describe your product..."
                className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E] resize-none"
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

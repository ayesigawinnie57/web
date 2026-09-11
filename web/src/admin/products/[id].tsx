import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus } from 'lucide-react'
import { adminProductsApi, type ApiCategory } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'
import RichTextEditor from '../../components/RichTextEditor'

type Form = { name: string; price: string; originalPrice: string; stock: string; categoryId: string; shortDescription: string; longDescription: string }

const FIELD_ORDER = ['name', 'price', 'originalPrice', 'stock', 'shortDescription']

function navigateField(current: string, dir: 'up' | 'down') {
  const idx = FIELD_ORDER.indexOf(current)
  const next = dir === 'down' ? idx + 1 : idx - 1
  if (next < 0 || next >= FIELD_ORDER.length) return
  const el = document.querySelector<HTMLInputElement>(`[data-field="${FIELD_ORDER[next]}"]`)
  el?.focus()
}

export default function EditProduct() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>({ name: '', price: '', originalPrice: '', stock: '', categoryId: '', shortDescription: '', longDescription: '' })
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [initialForm, setInitialForm] = useState<Form>({ name: '', price: '', originalPrice: '', stock: '', categoryId: '', shortDescription: '', longDescription: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof Form) => (val: string) => setForm(f => ({ ...f, [key]: val }))

  useEffect(() => {
    Promise.all([adminProductsApi.get(Number(id)), adminProductsApi.categories()])
      .then(([{ data: p }, { data: catsData }]) => {
        const cats = Array.isArray(catsData) ? catsData : (catsData as any).results ?? []
        setCategories(cats)
        setExistingImage(p.image)
        const loaded = { name: p.name, price: p.price, originalPrice: p.original_price ?? '', stock: String(p.stock), categoryId: String(p.category?.id ?? ''), shortDescription: p.short_description ?? '', longDescription: p.long_description ?? '' }
        setForm(loaded)
        setInitialForm(loaded)
      })
      .catch(err => setError(parseError(err, 'Failed to load product.')))
      .finally(() => setLoading(false))
  }, [id])

  const handleFile = (files: FileList | null) => {
    if (!files?.[0]) return
    setNewImage(files[0])
    setPreview(URL.createObjectURL(files[0]))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.price.trim()) { setError('Name and price are required.'); return }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('price', form.price)
      fd.append('category_id', form.categoryId)
      if (form.originalPrice) fd.append('original_price', form.originalPrice)
      if (form.stock) fd.append('stock', form.stock)
      if (form.shortDescription) fd.append('short_description', form.shortDescription)
      if (form.longDescription) fd.append('long_description', form.longDescription)
      if (newImage) fd.append('image', newImage)
      await adminProductsApi.update(Number(id), fd)
      navigate('/admin/products')
    } catch (err) {
      setError(parseError(err, 'Failed to update product.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>

  const previewSrc = preview ?? existingImage

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/products')} className="p-1 hover:opacity-70"><ArrowLeft size={20} color="#071A2B" /></button>
        <h1 className="text-xl font-extrabold text-[#071A2B]">Edit Product</h1>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: image + category */}
          <div className="space-y-4 lg:sticky lg:top-0 lg:self-start">
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />

            <div>
              <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => set('categoryId')(String(cat.id))}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-semibold capitalize transition-colors ${
                      form.categoryId === String(cat.id)
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

          {/* Right columns: all fields */}
          <div className="lg:col-span-2 space-y-4">
            <Field label="Product Name *" value={form.name} onChange={set('name')} fieldKey="name" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (UGX) *" value={form.price} onChange={set('price')} type="number" fieldKey="price" />
              <Field label="Original Price (UGX)" value={form.originalPrice} onChange={set('originalPrice')} type="number" fieldKey="originalPrice" />
              <Field label="Stock" value={form.stock} onChange={set('stock')} type="number" fieldKey="stock" />
            </div>
            <Field label="Short Description" value={form.shortDescription} onChange={set('shortDescription')} fieldKey="shortDescription" />
            <div>
              <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Long Description</label>
              <RichTextEditor
                value={form.longDescription}
                onChange={v => set('longDescription')(v)}
                placeholder="Full product details..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {(() => {
                const isDirty = newImage !== null || (Object.keys(form) as (keyof Form)[]).some(k => form[k] !== initialForm[k])
                return (
                  <>
                    <button type="button" onClick={() => navigate('/admin/products')} className="px-6 py-2.5 rounded-lg text-[13px] font-bold border border-[#E2E8F0] text-[#64748B] hover:border-[#071A2B] hover:text-[#071A2B] transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving || !isDirty} className="bg-[#071A2B] text-white px-6 py-2.5 rounded-lg text-[13px] font-bold disabled:opacity-60 hover:opacity-90">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )
              })()}
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', fieldKey }: { label: string; value: string; onChange: (v: string) => void; type?: string; fieldKey?: string }) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!fieldKey) return
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateField(fieldKey, 'down') }
    if (e.key === 'ArrowUp') { e.preventDefault(); navigateField(fieldKey, 'up') }
  }
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#071A2B] mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onWheel={type === 'number' ? e => (e.target as HTMLInputElement).blur() : undefined}
        onKeyDown={handleKeyDown}
        data-field={fieldKey}
        className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
      />
    </div>
  )
}

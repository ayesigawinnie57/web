import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import { adminProductsApi, type ApiCategory } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'
import RichTextEditor from '../../components/RichTextEditor'

type Form = {
  name: string; price: string; originalPrice: string; stock: string
  categoryId: string; shortDescription: string; longDescription: string
  deliveryFee: string; isFeatured: boolean; isNewDeal: boolean
}

const EMPTY: Form = {
  name: '', price: '', originalPrice: '', stock: '', categoryId: '',
  shortDescription: '', longDescription: '', deliveryFee: '', isFeatured: false, isNewDeal: false,
}

export default function AddProduct() {
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(EMPTY)
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof Form) => (val: string | boolean) => setForm(f => ({ ...f, [key]: val }))

  useEffect(() => {
    adminProductsApi.categories()
      .then(({ data }) => {
        const cats = Array.isArray(data) ? data : (data as any).results ?? []
        setCategories(cats)
        if (cats.length) setForm(f => ({ ...f, categoryId: String(cats[0].id) }))
      })
      .catch(err => setError(parseError(err, 'Failed to load categories.')))
  }, [])

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files)
    setImages(prev => [...prev, ...arr])
    setPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (i: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.price.trim() || !form.categoryId) {
      setError('Name, price and category are required.')
      return
    }
    setLoading(true)
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
      if (form.deliveryFee) fd.append('delivery_fee', form.deliveryFee)
      fd.append('is_featured', String(form.isFeatured))
      fd.append('is_new_deal', String(form.isNewDeal))
      if (images[0]) fd.append('image', images[0])
      for (const img of images) fd.append('images', img)
      await adminProductsApi.create(fd)
      navigate('/admin/products')
    } catch (err) {
      setError(parseError(err, 'Failed to add product.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/products')} className="p-1 hover:opacity-70"><ArrowLeft size={20} color="#071A2B" /></button>
        <h1 className="text-xl font-extrabold text-[#071A2B]">Add Product</h1>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Images</label>
          <div className="flex gap-3 flex-wrap">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} className="w-20 h-20 rounded-lg object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
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
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </div>
        </div>

        <Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Wireless Earbuds" />
        <Field label="Price (UGX) *" value={form.price} onChange={set('price')} placeholder="e.g. 29000" type="number" />
        <Field label="Original Price (UGX)" value={form.originalPrice} onChange={set('originalPrice')} placeholder="e.g. 59000" type="number" />
        <Field label="Stock" value={form.stock} onChange={set('stock')} placeholder="e.g. 50" type="number" />
        <Field label="Delivery Fee (UGX)" value={form.deliveryFee} onChange={set('deliveryFee')} placeholder="e.g. 5000" type="number" />
        <Field label="Short Description" value={form.shortDescription} onChange={set('shortDescription')} placeholder="Brief summary" />
        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Long Description</label>
          <RichTextEditor
            value={form.longDescription}
            onChange={v => set('longDescription')(v)}
            placeholder="Full product details..."
          />
        </div>

        <div className="flex gap-4">
          <Toggle label="Featured" value={form.isFeatured} onChange={v => set('isFeatured')(v)} />
          <Toggle label="New Deal" value={form.isNewDeal} onChange={v => set('isNewDeal')(v)} />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Category *</label>
          {categories.length === 0 && !error && (
            <p className="text-[12px] text-[#94A3B8] mb-2">Loading categories...</p>
          )}
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

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#22C55E] text-white px-6 py-2.5 rounded-lg text-[13px] font-bold disabled:opacity-60 hover:opacity-90"
          >
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
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
        placeholder={placeholder}
        className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
      />
    </div>
  )
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

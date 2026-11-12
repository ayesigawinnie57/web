import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus } from 'lucide-react'
import axios from 'axios'
import { adminProductsApi, type ApiCategory } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'
import RichTextEditor from '../../components/RichTextEditor'
import ProductVariantEditor, { type ProductVariantDraft } from '../../components/ProductVariantEditor'
import CategoryCascadeSelect from '../../components/CategoryCascadeSelect'

type Form = { name: string; price: string; originalPrice: string; stock: string; deliveryFee: string; categoryId: string; shortDescription: string; longDescription: string; isFeatured: boolean; isNewDeal: boolean; isActive: boolean }

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
  const [form, setForm] = useState<Form>({ name: '', price: '', originalPrice: '', stock: '', deliveryFee: '', categoryId: '', shortDescription: '', longDescription: '', isFeatured: false, isNewDeal: false, isActive: true })
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [variants, setVariants] = useState<ProductVariantDraft[]>([])
  const initialVariants = useRef('')
  const [initialForm, setInitialForm] = useState<Form>({ name: '', price: '', originalPrice: '', stock: '', deliveryFee: '', categoryId: '', shortDescription: '', longDescription: '', isFeatured: false, isNewDeal: false, isActive: true })
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
        const loaded = { name: p.name, price: p.listed_price ?? p.price, originalPrice: p.original_listed_price ?? p.original_price ?? '', stock: String(p.stock), deliveryFee: p.delivery_fee ?? '0', categoryId: String(p.category?.id ?? ''), shortDescription: p.short_description ?? '', longDescription: p.long_description ?? '', isFeatured: p.is_featured, isNewDeal: p.is_new_deal ?? false, isActive: p.is_active }
        setForm(loaded)
        setInitialForm(loaded)
        const loadedVariants = (p.variants ?? []).map(variant => ({
          sku: variant.sku,
          options: variant.options,
          price: variant.listed_price,
          compare_at_price: variant.compare_at_listed_price ?? '',
          stock: String(variant.stock),
          weight: variant.weight ?? '',
          is_active: variant.is_active,
          image_url: variant.image_url,
          image_file: null,
        }))
        setVariants(loadedVariants)
        initialVariants.current = JSON.stringify(loadedVariants.map(({ image_file, ...variant }) => variant))
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
      fd.append('delivery_fee', form.deliveryFee || '0')
      fd.append('is_featured', form.isFeatured ? 'true' : 'false')
      fd.append('is_new_deal', form.isNewDeal ? 'true' : 'false')
      fd.append('is_active', form.isActive ? 'true' : 'false')
      fd.append('original_price', form.originalPrice)
      fd.append('stock', form.stock)
      fd.append('short_description', form.shortDescription)
      fd.append('long_description', form.longDescription)
      if (newImage) fd.append('image', newImage)
      const variantSnapshot = variants.map(({ image_file, ...variant }) => variant)
      const variantsDirty = variants.some(variant => variant.image_file !== null)
        || JSON.stringify(variantSnapshot) !== initialVariants.current
      if (variantsDirty) {
        fd.append('variants', JSON.stringify(variants.map(variant => ({
          sku: variant.sku.trim(),
          options: variant.options,
          price: Number(variant.price),
          compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
          stock: Number(variant.stock || 0),
          weight: variant.weight ? Number(variant.weight) : null,
          is_active: variant.is_active,
        }))))
        variants.forEach((variant, index) => {
          if (variant.image_file) fd.append(`variant_image_${index}`, variant.image_file)
        })
      }
      await adminProductsApi.update(Number(id), fd)
      navigate('/admin/products')
    } catch (err) {
      const requestId = axios.isAxiosError(err)
        ? err.response?.headers?.['x-railway-request-id']
        : undefined
      const message = parseError(err, 'Failed to update product.')
      setError(typeof requestId === 'string' ? `${message} Request ID: ${requestId}` : message)
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
              <CategoryCascadeSelect categories={categories} selectedId={form.categoryId} onChange={value => set('categoryId')(value)} allowEmpty />
            </div>
          </div>

          {/* Right columns: all fields */}
          <div className="lg:col-span-2 space-y-4">
            <Field label="Product Name *" value={form.name} onChange={set('name')} fieldKey="name" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Listed Price (UGX) *" value={form.price} onChange={set('price')} type="number" fieldKey="price" />
              <Field label="Original Price (UGX)" value={form.originalPrice} onChange={set('originalPrice')} type="number" fieldKey="originalPrice" />
              <Field label="Stock" value={form.stock} onChange={set('stock')} type="number" fieldKey="stock" />
              <Field label="Delivery Fee (UGX)" value={form.deliveryFee} onChange={set('deliveryFee')} type="number" />
            </div>
            <div className="flex flex-wrap gap-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#071A2B]">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                Active
              </label>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#071A2B]">
                <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} />
                Featured
              </label>
              <label className="flex items-center gap-2 text-[13px] font-semibold text-[#071A2B]">
                <input type="checkbox" checked={form.isNewDeal} onChange={e => setForm(f => ({ ...f, isNewDeal: e.target.checked }))} />
                New deal
              </label>
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
            <ProductVariantEditor
              variants={variants}
              onChange={setVariants}
              basePrice={form.price}
              baseOriginalPrice={form.originalPrice}
            />

            <div className="flex justify-end gap-3 pt-2">
              {(() => {
                const variantSnapshot = variants.map(({ image_file, ...variant }) => variant)
                const variantsDirty = variants.some(variant => variant.image_file !== null)
                  || JSON.stringify(variantSnapshot) !== initialVariants.current
                const isDirty = newImage !== null || variantsDirty || (Object.keys(form) as (keyof Form)[]).some(k => form[k] !== initialForm[k])
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

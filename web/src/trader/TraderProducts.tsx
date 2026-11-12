import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Package, ArrowLeft, ImagePlus, X, Search } from 'lucide-react'
import axios from 'axios'
import { adminProductsApi, tradersApi, productsApi, type ApiTraderProduct, type ApiCategory } from '../lib/api'
import ProductVariantEditor, { type ProductVariantDraft } from '../components/ProductVariantEditor'
import CategoryCascadeSelect from '../components/CategoryCascadeSelect'
import RichTextEditor from '../components/RichTextEditor'

const fmt = (n: string | number) => `UGX ${Number(n).toLocaleString()}`

const getRequestId = (cause: unknown) => {
  if (!axios.isAxiosError(cause)) return undefined
  const requestId = cause.response?.headers?.['x-railway-request-id']
  return typeof requestId === 'string' ? requestId : undefined
}

const getLoadError = (cause: unknown, resource: string) => {
  const detail = axios.isAxiosError(cause) && cause.response?.data?.detail
  const status = axios.isAxiosError(cause) ? cause.response?.status : undefined
  const message = typeof detail === 'string'
    ? detail
    : status
      ? `Failed to load ${resource} (server returned ${status}).`
      : `Failed to load ${resource}.`
  const requestId = getRequestId(cause)
  return requestId ? `${message} Request ID: ${requestId}` : message
}

type View = 'list' | 'add' | 'edit'

type Form = {
  name: string
  brand: string
  condition: 'new' | 'used' | 'refurbished'
  tags: string
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
  name: '', brand: '', condition: 'new', tags: '', short_description: '', long_description: '',
  price: '', original_price: '', delivery_fee: '', stock: '',
  category_id: '', is_active: true, is_featured: false, is_new_deal: false,
}

type VariantDraft = ProductVariantDraft

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
  const [productsLoadFailed, setProductsLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [view, setView] = useState<View>('list')
  const [editing, setEditing] = useState<ApiTraderProduct | null>(null)

  const [form, setForm] = useState<Form>(EMPTY)
  const set = (k: keyof Form) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }))
  const [specifications, setSpecifications] = useState<Record<string, unknown>>({})
  const [variantValues, setVariantValues] = useState<Record<string, string[]>>({})
  const [variantValueDrafts, setVariantValueDrafts] = useState<Record<string, string>>({})
  const [variants, setVariants] = useState<VariantDraft[]>([])

  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const selectedCategory = categories.find(category => String(category.id) === form.category_id)
  const variantAttributes = selectedCategory?.attributes.filter(attribute => attribute.is_variant) ?? []

  const addCategoryVariant = (attributeKey: string) => {
    const value = variantValueDrafts[attributeKey]?.trim()
    if (!value) return
    const existingValues = variantValues[attributeKey] ?? []
    if (existingValues.some(existing => existing.toLowerCase() === value.toLowerCase())) {
      setError(`"${value}" is already added for this option.`)
      return
    }

    const nextValues = { ...variantValues, [attributeKey]: [...existingValues, value] }
    let combinations: Record<string, string>[] = [{}]
    for (const attribute of variantAttributes) {
      const values = nextValues[attribute.key] ?? []
      if (!values.length) {
        setVariantValues(nextValues)
        setVariantValueDrafts(current => ({ ...current, [attributeKey]: '' }))
        setError(`Added "${value}". Add a value for ${attribute.name} to create variants.`)
        return
      }
      combinations = combinations.flatMap(combination =>
        values.map(optionValue => ({ ...combination, [attribute.key]: optionValue })),
      )
    }

    const optionKey = (options: Record<string, string | number | boolean>) =>
      JSON.stringify(Object.entries(options).sort(([left], [right]) => left.localeCompare(right)))
    if (combinations.length > 100) {
      setError('A product cannot have more than 100 variants. Remove variants or option values first.')
      return
    }
    setVariantValues(nextValues)
    setVariantValueDrafts(current => ({ ...current, [attributeKey]: '' }))
    const sourceUseCount = new Map<number, number>()
    const nextVariants = combinations.map(options => {
      const exactIndex = variants.findIndex(variant => optionKey(variant.options) === optionKey(options))
      if (exactIndex >= 0) {
        sourceUseCount.set(exactIndex, (sourceUseCount.get(exactIndex) ?? 0) + 1)
        return variants[exactIndex]
      }
      const sourceIndex = variants.findIndex(variant => Object.entries(variant.options).every(([key, optionValue]) =>
        key === attributeKey || String(options[key]) === String(optionValue),
      ))
      const source = sourceIndex >= 0 ? variants[sourceIndex] : null
      if (sourceIndex >= 0) sourceUseCount.set(sourceIndex, (sourceUseCount.get(sourceIndex) ?? 0) + 1)
      const isFirstCombinationForSource = sourceIndex >= 0 && sourceUseCount.get(sourceIndex) === 1
      const sourceHasMatchingColor = source && Object.entries(source.options).some(([key, optionValue]) =>
        (key.toLowerCase().includes('color') || key.toLowerCase().includes('colour'))
        && String(options[key]) === String(optionValue),
      )
      return {
        sku: isFirstCombinationForSource ? source!.sku : '',
        options,
        price: source?.price ?? form.price,
        compare_at_price: source?.compare_at_price ?? form.original_price,
        stock: isFirstCombinationForSource ? source!.stock : '0',
        weight: source?.weight ?? '',
        is_active: source?.is_active ?? true,
        image_url: sourceHasMatchingColor ? source?.image_url ?? null : null,
        image_file: sourceHasMatchingColor ? source?.image_file ?? null : null,
      }
    })
    if (!nextVariants.some(variant => !variants.some(existing => optionKey(existing.options) === optionKey(variant.options)))) {
      setError(`The ${attributeKey} combinations already exist.`)
      return
    }
    setVariants(nextVariants)
    setError('')
  }

  const updateSpecification = (key: string, value: unknown) =>
    setSpecifications(current => ({ ...current, [key]: value }))

  const changeCategory = (categoryId: string) => {
    set('category_id')(categoryId)
    setSpecifications({})
    setVariantValues({})
    setVariantValueDrafts({})
    setVariants([])
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setProductsLoadFailed(false)

    if (!traderUuid) {
      setProductsLoadFailed(true)
      setError('Trader account could not be identified.')
      setLoading(false)
      return () => { active = false }
    }

    Promise.allSettled([tradersApi.products(traderUuid), productsApi.categories()])
      .then(([productsResult, categoriesResult]) => {
        if (!active) return

        const loadErrors: string[] = []
        if (productsResult.status === 'fulfilled' && Array.isArray(productsResult.value.data)) {
          setProducts(productsResult.value.data)
        } else {
          setProductsLoadFailed(true)
          loadErrors.push(productsResult.status === 'rejected'
            ? getLoadError(productsResult.reason, 'products')
            : 'The products service returned an unexpected response.')
        }

        if (categoriesResult.status === 'fulfilled') {
          const categoryData = categoriesResult.value.data
          const cats = Array.isArray(categoryData) ? categoryData : (categoryData as any).results ?? []
          setCategories(cats)
        } else {
          loadErrors.push(getLoadError(categoriesResult.reason, 'categories'))
        }

        setError(loadErrors.join(' '))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [traderUuid, reloadKey])

  const openAdd = () => {
    setForm(EMPTY)
    setSpecifications({})
    setVariantValues({})
    setVariantValueDrafts({})
    setVariants([])
    setImages([]); setPreviews([]); setExistingImage(null)
    setError(''); setEditing(null); setView('add')
  }

  const openEdit = (p: ApiTraderProduct) => {
    setForm({
      name: p.name,
      brand: p.brand ?? '',
      condition: p.condition ?? 'new',
      tags: (p.tags ?? []).join(', '),
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
    setSpecifications(p.specifications ?? {})
    setVariantValues({})
    setVariantValueDrafts({})
    setVariants((p.variant_list ?? []).map(variant => ({
      sku: variant.sku,
      options: variant.options,
      price: variant.listed_price,
      compare_at_price: variant.compare_at_listed_price ?? '',
      stock: String(variant.stock),
      weight: variant.weight ?? '',
      is_active: variant.is_active,
      image_url: variant.image_url,
      image_file: null,
    })))
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

  const handleSave = async (submitForReview: boolean) => {
    if (!form.name.trim() || !form.price) { setError('Name and price are required.'); return }
    const variantPayload = variants.map((variant) => {
      return {
        sku: variant.sku.trim(),
        options: variant.options,
        price: Number(variant.price),
        compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
        stock: Number(variant.stock || 0),
        weight: variant.weight ? Number(variant.weight) : null,
        is_active: variant.is_active,
      }
    })
    if (variantPayload.some(variant => !Number.isFinite(variant.price) || variant.price <= 0)) {
      setError('Every variant needs a price greater than zero.')
      return
    }
    setSaving(true); setError('')
    try {
      const fd = new FormData()
      variants.forEach((variant, index) => {
        if (variant.image_file) fd.append(`variant_image_${index}`, variant.image_file)
      })
      fd.append('name', form.name.trim())
      fd.append('price', variants.length ? String(Math.min(...variantPayload.map(variant => variant.price))) : form.price)
      if (form.original_price) fd.append('original_price', form.original_price)
      fd.append('delivery_fee', form.delivery_fee || '0')
      fd.append('stock', variants.length ? String(variantPayload.reduce((total, variant) => total + variant.stock, 0)) : form.stock || '0')
      fd.append('brand', form.brand.trim())
      fd.append('condition', form.condition)
      fd.append('tags', JSON.stringify(form.tags.split(',').map(tag => tag.trim()).filter(Boolean)))
      fd.append('specifications', JSON.stringify(specifications))
      fd.append('variants', JSON.stringify(variantPayload))
      fd.append('submit_for_review', String(submitForReview))
      fd.append('short_description', form.short_description)
      fd.append('long_description', form.long_description)
      fd.append('category_id', form.category_id)
      fd.append('is_active', form.is_active ? 'true' : 'false')
      fd.append('is_featured', form.is_featured ? 'true' : 'false')
      fd.append('is_new_deal', form.is_new_deal ? 'true' : 'false')
      if (images[0]) fd.append('image', images[0])

      if (view === 'add') {
        const r = await tradersApi.createProduct(traderUuid!, fd)
        setProducts(p => [r.data, ...p])
      } else if (editing!.public_product_id !== null) {
        await adminProductsApi.update(editing!.public_product_id, fd)
        const { data } = await tradersApi.products(traderUuid!)
        setProducts(data)
      } else {
        const r = await tradersApi.updateProduct(traderUuid!, editing!.uuid, fd)
        setProducts(p => p.map(x => x.uuid === r.data.uuid ? r.data : x))
      }
      setView('list')
    } catch (cause) {
      try {
        const { data } = await tradersApi.products(traderUuid!)
        setProducts(data)
        setView('list')
      } catch {
        setError('Saving failed and the product list could not be refreshed.')
        return
      }

      const detail = axios.isAxiosError(cause) && cause.response?.data?.detail
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined
      const message = typeof detail === 'string' ? detail : status ? `Failed to save product (server returned ${status}).` : 'Failed to save product.'
      const requestId = getRequestId(cause)
      setError(requestId ? `${message} Request ID: ${requestId}` : message)
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (uuid: string) => {
    setDeleting(uuid)
    setError('')
    try {
      await tradersApi.deleteProduct(traderUuid!, uuid)
      setProducts(p => p.filter(x => x.uuid !== uuid))
    } catch (cause) {
      try {
        const { data } = await tradersApi.products(traderUuid!)
        setProducts(data)
      } catch {
        setError('Delete failed and the product list could not be refreshed.')
        return
      }

      const detail = axios.isAxiosError(cause) && cause.response?.data?.detail
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined
      const message = typeof detail === 'string' ? detail : status ? `Failed to delete product (server returned ${status}).` : 'Failed to delete product.'
      const requestId = getRequestId(cause)
      setError(requestId ? `${message} Request ID: ${requestId}` : message)
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
              <Toggle label="Active" value={form.is_active} onChange={v => set('is_active')(v)} />
              <Toggle label="Featured" value={form.is_featured} onChange={v => set('is_featured')(v)} />
              <Toggle label="New Deal" value={form.is_new_deal} onChange={v => set('is_new_deal')(v)} />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Category</label>
              <CategoryCascadeSelect categories={categories} selectedId={form.category_id} onChange={changeCategory} />
              <p className="mt-1.5 text-[11px] text-[#64748B]">Choose a department, then narrow it to a category or subcategory.</p>
            </div>
          </div>

          {/* Right columns */}
          <div className="lg:col-span-2 space-y-4">
            <Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Wireless Earbuds" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Brand" value={form.brand} onChange={set('brand')} placeholder="e.g. Apple" />
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Condition</label>
                <select value={form.condition} onChange={event => set('condition')(event.target.value as Form['condition'])} className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px]">
                  <option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option>
                </select>
              </div>
              <Field label="Tags (comma separated)" value={form.tags} onChange={set('tags')} placeholder="e.g. electronics, repair" />
            </div>
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

            {!!selectedCategory?.attributes.filter(attribute => !attribute.is_variant).length && (
              <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-4">
                <div>
                  <h2 className="text-[14px] font-extrabold text-[#071A2B]">Product specifications</h2>
                  <p className="text-[11px] text-[#64748B] mt-1">Fields are configured for {selectedCategory.name}.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {selectedCategory.attributes.filter(attribute => !attribute.is_variant).map(attribute => {
                    const value = specifications[attribute.key]
                    const inputClass = 'w-full px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[12px]'
                    return (
                      <div key={attribute.key}>
                        <label className="block text-[12px] font-bold text-[#071A2B] mb-1.5">{attribute.name}{attribute.is_required ? ' *' : ''}</label>
                        {attribute.input_type === 'boolean' ? (
                          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={Boolean(value)} onChange={event => updateSpecification(attribute.key, event.target.checked)} /> Yes</label>
                        ) : attribute.input_type === 'dropdown' ? (
                          <select className={inputClass} value={String(value ?? '')} onChange={event => updateSpecification(attribute.key, event.target.value)}>
                            <option value="">Select...</option>{attribute.choices.map(choice => <option key={choice}>{choice}</option>)}
                          </select>
                        ) : (
                          <input
                            type={attribute.input_type === 'number' ? 'number' : 'text'}
                            className={inputClass}
                            value={Array.isArray(value) ? value.join(', ') : String(value ?? '')}
                            placeholder={attribute.input_type === 'multi_select' ? 'Separate values with commas' : ''}
                            onChange={event => updateSpecification(
                              attribute.key,
                              attribute.input_type === 'number' ? (event.target.value ? Number(event.target.value) : '') :
                                attribute.input_type === 'multi_select' ? event.target.value.split(',').map(item => item.trim()).filter(Boolean) :
                                  event.target.value,
                            )}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {variantAttributes.length > 0 && (
              <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-4">
                <div>
                  <h2 className="text-[14px] font-extrabold text-[#071A2B]">Category option values</h2>
                  <p className="text-[11px] text-[#64748B] mt-1">Add option values, then generate editable product combinations.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {variantAttributes.map(attribute => (
                    <div key={attribute.key} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <label className="mb-1.5 block text-[12px] font-bold text-[#071A2B]">{attribute.name}{attribute.is_required ? ' *' : ''} value</label>
                      <p className="mb-2 text-[11px] leading-4 text-[#64748B]">Enter one {attribute.name.toLowerCase()} choice at a time.</p>
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[12px] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                          value={variantValueDrafts[attribute.key] ?? ''}
                          onChange={event => setVariantValueDrafts(current => ({ ...current, [attribute.key]: event.target.value }))}
                          placeholder={attribute.key.toLowerCase().includes('size') ? 'e.g. S, M, L, 42' : `e.g. ${attribute.name}`}
                          aria-label={`${attribute.name} variant value`}
                        />
                        <button
                          type="button"
                          onClick={() => addCategoryVariant(attribute.key)}
                          disabled={!variantValueDrafts[attribute.key]?.trim()}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-[11px] font-bold text-[#334155] hover:border-[#071A2B] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus size={13} /> Add value
                        </button>
                      </div>
                      {(variantValues[attribute.key]?.length ?? 0) > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1 border-t border-[#E2E8F0] pt-2">
                          {variantValues[attribute.key].map(value => (
                            <span key={value} className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">{value}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#64748B]">For products with multiple options, add at least one value for each option to create combinations.</p>
              </section>
            )}

            <ProductVariantEditor
              variants={variants}
              onChange={setVariants}
              basePrice={form.price}
              baseOriginalPrice={form.original_price}
            />

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
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold border border-[#E2E8F0] text-[#071A2B] disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="bg-[#22C55E] text-white px-6 py-2.5 rounded-lg text-[13px] font-bold disabled:opacity-60 hover:opacity-90"
              >
                {saving ? 'Saving...' : isEdit ? 'Submit Changes' : 'Submit for Review'}
              </button>
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-[#071A2B]">Products ({products.length})</h1>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#22C55E] text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:opacity-90">
          <Plus size={16} /> Add
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          {error}
          <button
            onClick={() => setReloadKey(key => key + 1)}
            disabled={loading}
            className="shrink-0 font-bold underline disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg px-3 h-10 mb-5">
        <Search size={14} className="text-[#94A3B8] shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 text-[13px] text-[#071A2B] placeholder-[#94A3B8] outline-none bg-transparent"
        />
        {search && <button onClick={() => setSearch('')}><X size={13} className="text-[#94A3B8]" /></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Package size={40} color="#CBD5E1" className="mx-auto mb-3" />
          <p className="text-[14px] text-[#64748B]">
            {productsLoadFailed
              ? 'Products could not be loaded. Retry the request above.'
              : search
                ? 'No products match your search.'
                : 'No products yet. Add your first product.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(p => (
            <div key={p.uuid} className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3">
              {p.image_url
                ? <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                : <div className="w-14 h-14 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0"><Package size={20} color="#CBD5E1" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#071A2B] truncate">{p.name}</p>
                <p className="text-[13px] font-bold text-[#22C55E]">{fmt(p.price)}</p>
                <p className="text-[11px] text-[#64748B]">{p.category_name ?? '—'} · Stock: {p.stock}</p>
                <p className="text-[10px] font-bold text-[#475569] mt-1 capitalize">{p.review_status.replace('_', ' ')}</p>
                {p.review_note && <p className="text-[10px] text-amber-700 mt-0.5">Admin note: {p.review_note}</p>}
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Updated {new Date(p.updated_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-[#F1F5F9] text-[#94A3B8]'}`}>
                {p.is_active ? 'Active' : 'Hidden'}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEdit(p)}
                  className="w-8 h-8 rounded-lg bg-[#6366f118] flex items-center justify-center hover:opacity-80"
                >
                  <Pencil size={14} color="#6366f1" />
                </button>
                <button
                  onClick={() => handleDelete(p.uuid)}
                  disabled={deleting === p.uuid}
                  className="w-8 h-8 rounded-lg bg-[#ef444418] flex items-center justify-center hover:opacity-80 disabled:opacity-50"
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

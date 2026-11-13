import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, ImagePlus, Layers3, Pencil, Save, Trash2 } from 'lucide-react'
import { adminProductsApi, getCategoryPath, type ApiCategory, type ApiCategoryAttribute } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

export default function EditCategory() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [position, setPosition] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [existingImage, setExistingImage] = useState<string | null>(null)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [parentId, setParentId] = useState('')
  const [attributes, setAttributes] = useState<ApiCategoryAttribute[]>([])
  const [attributeName, setAttributeName] = useState('')
  const [attributeType, setAttributeType] = useState<ApiCategoryAttribute['input_type']>('text')
  const [attributeChoices, setAttributeChoices] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    adminProductsApi.categories().then(({ data }) => {
      const cats = Array.isArray(data) ? data : (data as any).results ?? []
      setCategories(cats)
      const cat = cats.find((c: any) => c.id === Number(id))
      if (cat) {
        setName(cat.name)
        setSlug(cat.slug)
        setDescription(cat.description ?? '')
        setPosition(String(cat.position ?? 0))
        setIsActive(cat.is_active ?? true)
        setExistingImage(cat.image)
        setParentId(cat.parent_id ? String(cat.parent_id) : '')
        setAttributes(cat.attributes ?? [])
      }
    }).catch(err => setError(parseError(err, 'Failed to load category.'))).finally(() => setLoading(false))
  }, [id])

  const handleFile = (files: FileList | null) => {
    if (!files?.[0]) return
    setNewImage(files[0])
    setPreview(URL.createObjectURL(files[0]))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) { setError('Name and slug are required.'); return }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('slug', slug.trim())
      fd.append('description', description.trim())
      fd.append('parent_id', parentId)
      fd.append('position', position)
      fd.append('is_active', String(isActive))
      fd.append('attributes', JSON.stringify(attributes))
      if (newImage) fd.append('image', newImage)
      await adminProductsApi.updateCategory(Number(id), fd)
      navigate('/admin/categories')
    } catch (err) {
      const d = (err as any)?.response?.data
      setError(d?.slug?.[0] ?? d?.name?.[0] ?? parseError(err, 'Failed to update category.'))
    } finally {
      setSaving(false)
    }
  }

  const addAttribute = () => {
    const newName = attributeName.trim()
    if (!newName) return
    const key = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (attributes.some(attribute => attribute.key === key)) {
      setError('An attribute with that name already exists.')
      return
    }
    const choices = attributeChoices.split(',').map(choice => choice.trim()).filter(Boolean)
    if (['dropdown', 'multi_select'].includes(attributeType) && choices.length === 0) {
      setError('Add at least one choice for this attribute.')
      return
    }
    setAttributes(current => [...current, {
      id: 0, name: newName, key, input_type: attributeType, choices,
      is_required: false, is_variant: false, is_filterable: false, position: current.length,
    }])
    setAttributeName('')
    setAttributeChoices('')
    setError('')
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" /></div>

  const previewSrc = preview ?? existingImage
  const currentCategory = categories.find(category => category.id === Number(id))
  const currentPath = currentCategory ? getCategoryPath(categories, currentCategory) : []

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button type="button" onClick={() => navigate('/admin/categories')} aria-label="Back to categories" className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]">
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold text-[#64748B]">
                Categories{currentPath.length > 1 ? ` / ${currentPath.slice(0, -1).map(category => category.name).join(' / ')}` : ''}
              </p>
              <h1 className="truncate text-xl font-extrabold text-[#071A2B] sm:text-2xl">Edit Category</h1>
              <p className="mt-1 text-[12px] text-[#64748B]">Update category details, visibility, and product attributes.</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 pl-12 sm:pl-0">
            <button type="button" onClick={() => navigate('/admin/categories')} className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-[12px] font-bold text-[#475569] hover:bg-[#F8FAFC]">Cancel</button>
            <button type="submit" form="edit-category-form" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#071A2B] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#12304A] disabled:cursor-not-allowed disabled:opacity-60">
              <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {error && <div className="mb-5"><ErrorBanner message={error} onDismiss={() => setError('')} /></div>}

        <form id="edit-category-form" onSubmit={handleSave} className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.8fr)]">
            <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="border-b border-[#F1F5F9] px-4 py-4 sm:px-5">
                <h2 className="text-[14px] font-extrabold text-[#071A2B]">Category image</h2>
                <p className="mt-1 text-[11px] text-[#64748B]">Use a clear image to help shoppers recognize this category.</p>
              </div>
              <div className="p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] transition-colors hover:border-[#22C55E]"
                >
                  {previewSrc
                    ? <img src={previewSrc} alt={name ? `${name} category` : 'Category preview'} className="h-full w-full object-cover" />
                    : <span className="flex flex-col items-center gap-2 text-[#94A3B8]"><ImagePlus size={30} /><span className="text-[12px] font-semibold">Choose a category image</span></span>
                  }
                  {previewSrc && <span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-[#071A2B]/75 py-3 text-[12px] font-bold text-white transition-transform group-hover:translate-y-0"><Pencil size={14} /> Change image</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => handleFile(event.target.files)} />
                <p className="mt-2 text-[10px] text-[#94A3B8]">Click the image area to upload or replace.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="border-b border-[#F1F5F9] px-4 py-4 sm:px-5">
                <h2 className="text-[14px] font-extrabold text-[#071A2B]">Basic information</h2>
                <p className="mt-1 text-[11px] text-[#64748B]">Names and descriptions shown throughout the marketplace.</p>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-[12px] font-bold text-[#334155]">Category name <span className="text-red-500">*</span></span>
                  <input value={name} onChange={event => setName(event.target.value)} required className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#DCFCE7]" />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-[12px] font-bold text-[#334155]">URL slug <span className="text-red-500">*</span></span>
                  <input value={slug} onChange={event => setSlug(event.target.value)} required className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] text-[#475569] outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#DCFCE7]" />
                </label>
                <label className="block min-w-0 sm:col-span-2">
                  <span className="mb-1.5 block text-[12px] font-bold text-[#334155]">Description</span>
                  <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} placeholder="Optional description for shoppers" className="w-full resize-y rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#DCFCE7]" />
                </label>
                <label className="block min-w-0 sm:col-span-2">
                  <span className="mb-1.5 block text-[12px] font-bold text-[#334155]">Parent category</span>
                  <select value={parentId} onChange={event => setParentId(event.target.value)} className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#DCFCE7]">
                    <option value="">Top-level category</option>
                    {categories.filter(category => category.id !== Number(id)).map(category => (
                      <option key={category.id} value={category.id}>
                        {getCategoryPath(categories, category).map((part, index) => `${index ? '— '.repeat(index) : ''}${part.name}`).join(' / ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-[12px] font-bold text-[#334155]">Display order</span>
                  <input type="number" min="0" value={position} onChange={event => setPosition(event.target.value)} className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#DCFCE7]" />
                </label>
                <label className="flex min-h-10 items-center gap-3 self-end rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[12px] font-semibold text-[#334155]">
                  <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} className="h-4 w-4 accent-[#22C55E]" />
                  <span className="min-w-0 flex-1">Active in marketplace</span>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{isActive ? 'ON' : 'OFF'}</span>
                </label>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#F1F5F9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]"><Layers3 size={17} /></span>
                <div>
                  <h2 className="text-[14px] font-extrabold text-[#071A2B]">Category attributes</h2>
                  <p className="mt-1 text-[11px] text-[#64748B]">Configure product specifications, selectable variants, and catalog filters.</p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold text-[#475569]">{attributes.length} attributes</span>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {attributes.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8 text-center">
                  <p className="text-[12px] font-semibold text-[#475569]">No attributes configured</p>
                  <p className="mt-1 text-[11px] text-[#94A3B8]">Add an attribute below to collect details from product listings.</p>
                </div>
              )}
              <div className="grid gap-3 lg:grid-cols-2">
                {attributes.map((attribute, index) => (
                  <article key={attribute.key} className="min-w-0 rounded-xl border border-[#E2E8F0] bg-[#FBFCFE] p-3 sm:p-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[13px] font-bold text-[#071A2B]">{attribute.name}</h3>
                        <p className="mt-0.5 text-[10px] font-medium capitalize text-[#64748B]">{attribute.input_type.replace('_', ' ')}{attribute.key ? ` · ${attribute.key}` : ''}</p>
                      </div>
                      <button type="button" onClick={() => setAttributes(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${attribute.name}`} title={`Remove ${attribute.name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {attribute.choices.length > 0 && (
                      <div className="mt-3 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto rounded-lg bg-white p-2">
                        {attribute.choices.map(choice => <span key={choice} className="max-w-full break-words rounded-full bg-[#F1F5F9] px-2 py-1 text-[10px] font-medium text-[#475569]">{choice}</span>)}
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E2E8F0] pt-3 sm:grid-cols-3">
                      {([
                        ['is_required', 'Required'],
                        ['is_variant', 'Variant option'],
                        ['is_filterable', 'Shop filter'],
                      ] as const).map(([field, label]) => (
                        <label key={field} className="flex min-w-0 items-center gap-2 text-[10px] font-semibold text-[#475569]">
                          <input type="checkbox" checked={attribute[field]} onChange={event => setAttributes(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.checked } : item))} className="h-3.5 w-3.5 shrink-0 accent-[#4F46E5]" />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3 sm:p-4">
                <h3 className="mb-3 text-[12px] font-bold text-[#334155]">Add an attribute</h3>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)_minmax(0,1.5fr)_auto]">
                  <input value={attributeName} onChange={event => setAttributeName(event.target.value)} placeholder="Name (e.g. Material)" aria-label="New attribute name" className="min-w-0 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[12px] outline-none focus:border-[#4F46E5]" />
                  <select value={attributeType} onChange={event => setAttributeType(event.target.value as ApiCategoryAttribute['input_type'])} aria-label="New attribute type" className="min-w-0 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[12px] outline-none focus:border-[#4F46E5]">
                    {['text', 'number', 'dropdown', 'multi_select', 'boolean', 'measurement', 'color', 'size'].map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
                  </select>
                  {['dropdown', 'multi_select', 'text', 'size', 'color'].includes(attributeType) ? (
                    <input value={attributeChoices} onChange={event => setAttributeChoices(event.target.value)} placeholder="Choices separated by commas (optional for text)" aria-label="New attribute choices" className="min-w-0 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-[12px] outline-none focus:border-[#4F46E5]" />
                  ) : <div className="hidden xl:block" />}
                  <button type="button" onClick={addAttribute} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C7D2FE] bg-white px-3 py-2.5 text-[11px] font-bold text-[#4338CA] hover:bg-[#EEF2FF]">
                    <Check size={14} /> Add attribute
                  </button>
                </div>
                {['dropdown', 'multi_select'].includes(attributeType) && <p className="mt-2 text-[10px] text-[#64748B]">Dropdown and multi-select attributes require at least one choice.</p>}
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => navigate('/admin/categories')} className="rounded-lg border border-[#E2E8F0] bg-white px-5 py-2.5 text-[12px] font-bold text-[#475569] hover:bg-[#F8FAFC]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#071A2B] px-5 py-2.5 text-[12px] font-bold text-white hover:bg-[#12304A] disabled:cursor-not-allowed disabled:opacity-60">
              <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

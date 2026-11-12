import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus } from 'lucide-react'
import { adminProductsApi, type ApiCategory, type ApiCategoryAttribute } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

export default function AddCategory() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [parentId, setParentId] = useState('')
  const [position, setPosition] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [attributes, setAttributes] = useState<ApiCategoryAttribute[]>([])
  const [attributeName, setAttributeName] = useState('')
  const [attributeType, setAttributeType] = useState<ApiCategoryAttribute['input_type']>('text')
  const [attributeChoices, setAttributeChoices] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    adminProductsApi.categories().then(({ data }) => {
      setCategories(Array.isArray(data) ? data : (data as any).results ?? [])
    }).catch(err => setError(parseError(err, 'Failed to load categories.')))
  }, [])

  const handleNameChange = (val: string) => {
    setName(val)
    setSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  const handleFile = (files: FileList | null) => {
    if (!files?.[0]) return
    setImage(files[0])
    setPreview(URL.createObjectURL(files[0]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) { setError('Name is required.'); return }
    setLoading(true)
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
      if (image) fd.append('image', image)
      await adminProductsApi.createCategory(fd)
      navigate('/admin/categories')
    } catch (err) {
      const d = (err as any)?.response?.data
      setError(d?.slug?.[0] ?? d?.name?.[0] ?? parseError(err, 'Failed to add category.'))
    } finally {
      setLoading(false)
    }
  }

  const addAttribute = () => {
    const name = attributeName.trim()
    if (!name) return
    const key = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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
      id: 0, name, key, input_type: attributeType, choices,
      is_required: false, is_variant: false, is_filterable: false, position: current.length,
    }])
    setAttributeName('')
    setAttributeChoices('')
    setError('')
  }

  return (
    <div className="p-8 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/categories')} className="p-1 hover:opacity-70"><ArrowLeft size={20} color="#071A2B" /></button>
        <h1 className="text-xl font-extrabold text-[#071A2B]">Add Category</h1>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full h-40 rounded-xl border border-dashed border-[#E2E8F0] bg-white flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-[#22C55E]"
        >
          {preview
            ? <img src={preview} className="w-full h-full object-cover" />
            : <><ImagePlus size={28} color="#94A3B8" /><span className="text-[13px] text-[#94A3B8] font-semibold">Tap to pick image</span></>
          }
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Category Name *</label>
          <input
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. Electronics"
            className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Slug (auto-generated)</label>
          <input
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="e.g. electronics"
            className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#64748B] outline-none focus:border-[#22C55E]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Description</label>
          <textarea value={description} onChange={event => setDescription(event.target.value)} rows={3} placeholder="Optional description for shoppers" className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px]" />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Parent category</label>
          <select value={parentId} onChange={event => setParentId(event.target.value)} className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px]">
            <option value="">Top-level category</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 items-end gap-3">
          <div>
            <label className="mb-2 block text-[13px] font-bold text-[#071A2B]">Display order</label>
            <input type="number" min="0" value={position} onChange={event => setPosition(event.target.value)} className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-3 text-[13px]" />
          </div>
          <label className="flex items-center gap-2 pb-3 text-[13px] font-semibold text-[#071A2B]">
            <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} />
            Active in marketplace
          </label>
        </div>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-3">
          <div>
            <h2 className="text-[14px] font-extrabold text-[#071A2B]">Category attributes</h2>
            <p className="text-[11px] text-[#64748B] mt-1">Attributes let traders add category-specific product details without code changes.</p>
          </div>
          {attributes.map((attribute, index) => (
            <div key={attribute.key} className="flex items-center justify-between gap-3 border-t border-[#F1F5F9] pt-3">
              <div>
                <p className="text-[12px] font-bold text-[#071A2B]">{attribute.name}</p>
                <p className="text-[10px] text-[#64748B]">{attribute.input_type}{attribute.choices.length ? ` · ${attribute.choices.join(', ')}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px]">
                <label><input type="checkbox" checked={attribute.is_required} onChange={event => setAttributes(current => current.map((item, i) => i === index ? { ...item, is_required: event.target.checked } : item))} /> Required</label>
                <label><input type="checkbox" checked={attribute.is_variant} onChange={event => setAttributes(current => current.map((item, i) => i === index ? { ...item, is_variant: event.target.checked } : item))} /> Variant</label>
                <label><input type="checkbox" checked={attribute.is_filterable} onChange={event => setAttributes(current => current.map((item, i) => i === index ? { ...item, is_filterable: event.target.checked } : item))} /> Filter</label>
                <button type="button" onClick={() => setAttributes(current => current.filter((_, i) => i !== index))} className="font-bold text-red-600">Remove</button>
              </div>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={attributeName} onChange={event => setAttributeName(event.target.value)} placeholder="Attribute name (e.g. Color)" className="min-w-0 px-3 py-2 border border-[#E2E8F0] rounded-lg text-[12px]" />
            <select value={attributeType} onChange={event => setAttributeType(event.target.value as ApiCategoryAttribute['input_type'])} className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-[12px]">
              {['text', 'number', 'dropdown', 'multi_select', 'boolean', 'measurement', 'color', 'size'].map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
            </select>
            {['dropdown', 'multi_select'].includes(attributeType) && <input value={attributeChoices} onChange={event => setAttributeChoices(event.target.value)} placeholder="Choices separated by commas" className="sm:col-span-2 px-3 py-2 border border-[#E2E8F0] rounded-lg text-[12px]" />}
          </div>
          <button type="button" onClick={addAttribute} className="text-[12px] font-bold text-[#1E3A8A]">+ Add Attribute</button>
        </section>

        <button type="submit" disabled={loading} className="w-full bg-[#22C55E] text-white py-3 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:opacity-90">
          {loading ? 'Saving...' : 'Save Category'}
        </button>
      </form>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus } from 'lucide-react'
import { adminProductsApi, type ApiCategory, type ApiCategoryAttribute } from '../../lib/api'
import ErrorBanner, { parseError } from '../ErrorBanner'

export default function EditCategory() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
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
      fd.append('parent_id', parentId)
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

  return (
    <div className="p-8 max-w-md">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/categories')} className="p-1 hover:opacity-70"><ArrowLeft size={20} color="#071A2B" /></button>
        <h1 className="text-xl font-extrabold text-[#071A2B]">Edit Category</h1>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      <form onSubmit={handleSave} className="space-y-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full h-40 rounded-xl border border-dashed border-[#E2E8F0] bg-white flex flex-col items-center justify-center gap-2 overflow-hidden hover:border-[#22C55E]"
        >
          {previewSrc
            ? <img src={previewSrc} className="w-full h-full object-cover" />
            : <><ImagePlus size={28} color="#94A3B8" /><span className="text-[13px] text-[#94A3B8] font-semibold">Click to change image</span></>
          }
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Category Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E]" />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Slug</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#64748B] outline-none focus:border-[#22C55E]" />
        </div>

        <div>
          <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Parent category</label>
          <select value={parentId} onChange={event => setParentId(event.target.value)} className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px]">
            <option value="">Top-level category</option>
            {categories.filter(category => category.id !== Number(id)).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-3">
          <div>
            <h2 className="text-[14px] font-extrabold text-[#071A2B]">Category attributes</h2>
            <p className="text-[11px] text-[#64748B] mt-1">Configure specifications, selectable variants, and catalog filters.</p>
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

        <button type="submit" disabled={saving} className="w-full bg-[#071A2B] text-white py-3 rounded-xl text-[14px] font-bold disabled:opacity-60 hover:opacity-90">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}

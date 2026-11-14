import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Package, ArrowLeft, ImagePlus, X, Search } from 'lucide-react'
import axios from 'axios'
import {
  tradersApi, productsApi, cloudinaryUrl,
  type ApiTraderProduct, type ApiCategory, type ApiCatalogProduct, type ApiCatalogVariant, type ApiCatalogRequest,
} from '../lib/api'
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

const getApiErrorDetails = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(getApiErrorDetails)
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([field, detail]) =>
      getApiErrorDetails(detail).map(message => field === 'detail' || field === 'non_field_errors'
        ? message
        : `${field}: ${message}`),
    )
  }
  return []
}

type View = 'list' | 'add' | 'edit'

type Form = {
  name: string
  brand: string
  condition: 'new' | 'used' | 'refurbished'
  availability: 'in_stock' | 'preorder' | 'made_to_order' | 'unavailable'
  warranty: string
  delivery_options: string
  package_details: string
  trader_sku: string
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
  name: '', brand: '', condition: 'new', availability: 'in_stock', warranty: '',
  delivery_options: '', package_details: '', trader_sku: '', tags: '', short_description: '', long_description: '',
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

function Field({ label, value, onChange, placeholder, type = 'text', maxLength, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxLength?: number; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#071A2B] mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        maxLength={maxLength}
        disabled={disabled}
        onWheel={type === 'number' ? e => (e.target as HTMLInputElement).blur() : undefined}
        placeholder={placeholder}
        className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px] text-[#071A2B] outline-none focus:border-[#22C55E] disabled:bg-[#F8FAFC] disabled:text-[#64748B]"
      />
    </div>
  )
}

function CatalogResultImage({ references, name }: { references: string[]; name: string }) {
  const [failedUrls, setFailedUrls] = useState<string[]>([])
  const imageUrls = references
    .map(reference => cloudinaryUrl(reference))
    .filter((url): url is string => Boolean(url))
  const imageUrl = imageUrls.find(url => !failedUrls.includes(url))

  return (
    <div className="flex aspect-square h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F1F5F9]">
      {imageUrl
        ? <img
          src={imageUrl}
          alt={name}
          loading="eager"
          onError={() => setFailedUrls(current => [...current, imageUrl])}
          className="h-full w-full object-contain"
        />
        : <Package size={28} className="text-[#94A3B8]" />}
    </div>
  )
}

export default function TraderProducts() {
  const { traderUuid } = useParams<{ traderUuid: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const isCatalogRequestPage = location.pathname.endsWith('/products/request')
  const [products, setProducts] = useState<ApiTraderProduct[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [productsLoadFailed, setProductsLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [view, setView] = useState<View>(isCatalogRequestPage ? 'add' : 'list')
  const [editing, setEditing] = useState<ApiTraderProduct | null>(null)
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<ApiCatalogProduct | null>(null)
  const [approvedVariantOptions, setApprovedVariantOptions] = useState<Array<{
    options: ApiCatalogVariant['options']
    image_url: string | null
  }> | null>(null)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogMatches, setCatalogMatches] = useState<ApiCatalogProduct[]>([])
  const [catalogSearchLoading, setCatalogSearchLoading] = useState(false)
  const [catalogSearchError, setCatalogSearchError] = useState('')
  const [catalogBrowseProducts, setCatalogBrowseProducts] = useState<ApiCatalogProduct[]>([])
  const [catalogBrowsePage, setCatalogBrowsePage] = useState(1)
  const [catalogBrowseHasMore, setCatalogBrowseHasMore] = useState(false)
  const [catalogBrowseLoading, setCatalogBrowseLoading] = useState(false)
  const [catalogBrowseError, setCatalogBrowseError] = useState('')
  const [selectedCatalogImages, setSelectedCatalogImages] = useState<string[]>([])
  const [catalogRequestForm, setCatalogRequestForm] = useState(() => ({
    name: (location.state as { requestProductName?: string } | null)?.requestProductName ?? '',
    brand: '', model: '', product_type: '', barcode: '', gtin: '', mpn: '', category_id: '',
  }))
  const [catalogRequestMessage, setCatalogRequestMessage] = useState('')
  const [catalogRequestSaving, setCatalogRequestSaving] = useState(false)
  const [catalogRequestImages, setCatalogRequestImages] = useState<Array<{ file: File; preview: string }>>([])
  const [catalogRequestSpecificationsText, setCatalogRequestSpecificationsText] = useState('{}')
  const [myCatalogRequests, setMyCatalogRequests] = useState<ApiCatalogRequest[]>([])
  const [myCatalogRequestsLoading, setMyCatalogRequestsLoading] = useState(false)
  const [catalogRequestMatches, setCatalogRequestMatches] = useState<Array<Pick<ApiCatalogProduct, 'id' | 'name' | 'brand' | 'model' | 'product_type' | 'category_id' | 'category_name' | 'image_references'>>>([])

  const [form, setForm] = useState<Form>(EMPTY)
  const set = (k: keyof Form) => (v: string | boolean) => setForm(f => ({ ...f, [k]: v }))
  const [specifications, setSpecifications] = useState<Record<string, unknown>>({})
  const [specificationValueDrafts, setSpecificationValueDrafts] = useState<Record<string, string>>({})
  const [variants, setVariants] = useState<VariantDraft[]>([])
  const requestCategory = categories.find(category => String(category.id) === catalogRequestForm.category_id)

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

  const updateSpecification = (key: string, value: unknown) =>
    setSpecifications(current => ({ ...current, [key]: value }))

  useEffect(() => {
    if (view !== 'add' || selectedCatalogProduct || isCatalogRequestPage) return
    const query = catalogQuery.trim()
    if (query.length < 2) {
      setCatalogMatches([])
      setCatalogSearchError('')
      setCatalogSearchLoading(false)
      return
    }

    let active = true
    const timeout = window.setTimeout(() => {
      setCatalogSearchLoading(true)
      setCatalogSearchError('')
      productsApi.searchCatalog(query)
        .then(({ data }) => { if (active) setCatalogMatches(data) })
        .catch(cause => {
          if (!active) return
          setCatalogMatches([])
          setCatalogSearchError(getLoadError(cause, 'catalog products'))
        })
        .finally(() => { if (active) setCatalogSearchLoading(false) })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [view, catalogQuery, selectedCatalogProduct, isCatalogRequestPage])

  useEffect(() => {
    if (view !== 'list' || isCatalogRequestPage) return
    let active = true
    setCatalogBrowseLoading(true)
    setCatalogBrowseError('')
    productsApi.browseCatalog()
      .then(({ data }) => {
        if (!active) return
        setCatalogBrowseProducts(data.results)
        setCatalogBrowsePage(1)
        setCatalogBrowseHasMore(Boolean(data.next))
      })
      .catch(cause => {
        if (active) setCatalogBrowseError(getLoadError(cause, 'shared catalog products'))
      })
      .finally(() => { if (active) setCatalogBrowseLoading(false) })
    return () => { active = false }
  }, [view, isCatalogRequestPage, reloadKey])

  const loadMoreCatalogProducts = async () => {
    const nextPage = catalogBrowsePage + 1
    setCatalogBrowseLoading(true)
    setCatalogBrowseError('')
    try {
      const { data } = await productsApi.browseCatalog(nextPage)
      setCatalogBrowseProducts(current => [...current, ...data.results])
      setCatalogBrowsePage(nextPage)
      setCatalogBrowseHasMore(Boolean(data.next))
    } catch (cause) {
      setCatalogBrowseError(getLoadError(cause, 'shared catalog products'))
    } finally {
      setCatalogBrowseLoading(false)
    }
  }

  useEffect(() => {
    if (view !== 'add' || selectedCatalogProduct || isCatalogRequestPage) return
    let active = true
    productsApi.myCatalogRequests()
      .then(({ data }) => { if (active) setMyCatalogRequests(data) })
      .catch(cause => { if (active) setCatalogRequestMessage(getLoadError(cause, 'your product requests')) })
      .finally(() => { if (active) setMyCatalogRequestsLoading(false) })
    return () => { active = false }
  }, [view, selectedCatalogProduct, isCatalogRequestPage])

  const changeCategory = (categoryId: string) => {
    set('category_id')(categoryId)
    setSpecifications({})
    setSpecificationValueDrafts({})
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
    catalogRequestImages.forEach(image => URL.revokeObjectURL(image.preview))
    setForm(EMPTY)
    setSelectedCatalogProduct(null)
    setApprovedVariantOptions(null)
    setCatalogQuery('')
    setCatalogMatches([])
    setCatalogSearchError('')
    setSelectedCatalogImages([])
    setCatalogRequestForm({ name: '', brand: '', model: '', product_type: '', barcode: '', gtin: '', mpn: '', category_id: '' })
    setCatalogRequestMessage('')
    setCatalogRequestMatches([])
    setCatalogRequestImages([])
    setMyCatalogRequestsLoading(true)
    setCatalogRequestSpecificationsText('{}')
    setMyCatalogRequests([])
    setSpecifications({})
    setSpecificationValueDrafts({})
    setVariants([])
    setImages([]); setPreviews([]); setExistingImage(null)
    setError(''); setEditing(null); setView('add')
  }

  const openEdit = (p: ApiTraderProduct) => {
    setSelectedCatalogProduct(null)
    setApprovedVariantOptions(p.catalog_product
      ? p.catalog_product.variants.map(variant => ({
        options: variant.options,
        image_url: variant.image_references[0] ? cloudinaryUrl(variant.image_references[0]) : null,
      }))
      : null)
    setSelectedCatalogImages([])
    setForm({
      name: p.name,
      brand: p.brand ?? '',
      condition: p.condition ?? 'new',
      availability: p.availability ?? 'in_stock',
      warranty: p.warranty ?? '',
      delivery_options: (p.delivery_options ?? []).join(', '),
      package_details: p.package_details ?? '',
      trader_sku: p.trader_sku ?? '',
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
    setSpecificationValueDrafts({})
    const existingVariants = p.variant_list ?? []
    setVariants(existingVariants.map(variant => ({
      sku: variant.sku,
      options: variant.options,
      price: variant.listed_price,
      compare_at_price: variant.compare_at_listed_price ?? '',
      stock: String(variant.stock),
      weight: variant.weight ?? '',
      is_active: variant.is_active,
      image_url: variant.image_url,
      image_file: null,
      sold_quantity: variant.sold_quantity,
      has_inventory_item: variant.has_inventory_item,
    })))
    setImages([]); setPreviews([])
    setExistingImage(p.image_url || null)
    setError(''); setEditing(p); setView('edit')
  }

  const selectCatalogProduct = (product: ApiCatalogProduct) => {
    setSelectedCatalogProduct(product)
    setApprovedVariantOptions(product.variants.map(variant => ({
      options: variant.options,
      image_url: variant.image_references[0] ? cloudinaryUrl(variant.image_references[0]) : null,
    })))
    setSelectedCatalogImages(product.image_references ?? [])
    setForm({
      ...EMPTY,
      name: product.name,
      brand: product.brand,
      tags: (product.tags ?? []).join(', '),
      short_description: product.short_description ?? '',
      long_description: product.long_description ?? '',
      category_id: product.category_id ? String(product.category_id) : '',
    })
    setSpecifications(product.specifications ?? {})
    setSpecificationValueDrafts({})
    setVariants([])
    setImages([])
    setPreviews([])
    setExistingImage(product.image_references?.[0] ? cloudinaryUrl(product.image_references[0]) : null)
    setCatalogRequestMessage('')
    setCatalogRequestMatches([])
    setError('')
  }

  const sellApprovedCatalogRequest = (request: ApiCatalogRequest) => {
    const product: ApiCatalogProduct = {
      id: request.id,
      name: request.name,
      brand: request.brand,
      model: request.model,
      product_type: request.product_type,
      category_id: request.category_id,
      category_name: request.category_name,
      short_description: request.short_description,
      long_description: request.long_description,
      tags: request.tags ?? [],
      specifications: request.specifications ?? {},
      attributes: request.attributes ?? {},
      identifiers: request.identifiers ?? {},
      variant_options: request.variant_options ?? [],
      variants: request.variants ?? [],
      image_references: request.image_references ?? [],
    }
    selectCatalogProduct(product)
    const offer = request.request_offer_details
    setForm({
      ...EMPTY,
      name: request.name,
      brand: request.brand,
      condition: offer.condition,
      availability: offer.availability,
      warranty: offer.warranty ?? '',
      delivery_options: (offer.delivery_options ?? []).join(', '),
      package_details: offer.package_details ?? '',
      trader_sku: offer.trader_sku ?? '',
      tags: (request.tags ?? []).join(', '),
      short_description: request.short_description ?? '',
      long_description: request.long_description ?? '',
      price: offer.price,
      original_price: offer.original_price ?? '',
      delivery_fee: offer.delivery_fee ?? '0',
      stock: String(offer.stock ?? 0),
      category_id: request.category_id ? String(request.category_id) : '',
      is_active: true,
      is_featured: false,
      is_new_deal: false,
    })
    setSpecifications(request.specifications ?? {})
    setVariants(offer.variants.map(variant => {
      const catalogVariant = request.variants.find(item =>
        JSON.stringify(Object.entries(item.options).sort()) === JSON.stringify(Object.entries(variant.options).sort()),
      )
      const imageReference = catalogVariant?.image_references[0]
      return {
        sku: variant.sku,
        options: variant.options,
        price: variant.price,
        compare_at_price: variant.compare_at_price ?? '',
        stock: String(variant.stock),
        weight: variant.weight ?? '',
        is_active: variant.is_active,
        image_url: imageReference ? cloudinaryUrl(imageReference) : null,
        image_file: null,
      }
    }))
    setView('add')
  }

  const submitCatalogProductRequest = async () => {
    if (!catalogRequestForm.name.trim()) {
      setCatalogRequestMessage('Enter the official product name first.')
      return
    }
    if (!form.price || Number(form.price) <= 0) {
      setCatalogRequestMessage('Enter a product price greater than zero.')
      return
    }
    if (!catalogRequestImages.length) {
      setCatalogRequestMessage('Add at least one product image for the admin to review.')
      return
    }
    if (catalogRequestImages.length + variants.filter(variant => variant.image_file).length > 12) {
      setCatalogRequestMessage('A request can include up to 12 images, including variant photos.')
      return
    }
    let requestSpecifications: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(catalogRequestSpecificationsText)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Specifications must be a JSON object.')
      requestSpecifications = parsed as Record<string, unknown>
    } catch {
      setCatalogRequestMessage('Specifications must be a valid JSON object.')
      return
    }
    setCatalogRequestMessage('')
    setCatalogRequestMatches([])
    setCatalogRequestSaving(true)
    try {
      const requestImages = catalogRequestImages.map(image => image.file)
      const variantImageIndexes = variants.map(variant => {
        if (!variant.image_file) return null
        const index = requestImages.length
        requestImages.push(variant.image_file)
        return index
      })
      const fd = new FormData()
      fd.append('name', catalogRequestForm.name.trim())
      fd.append('brand', catalogRequestForm.brand.trim())
      fd.append('model', catalogRequestForm.model.trim())
      fd.append('product_type', catalogRequestForm.product_type.trim())
      fd.append('identifiers', JSON.stringify({
        barcode: catalogRequestForm.barcode.trim(),
        gtin: catalogRequestForm.gtin.trim(),
        mpn: catalogRequestForm.mpn.trim(),
      }))
      if (catalogRequestForm.category_id) fd.append('category_id', catalogRequestForm.category_id)
      fd.append('short_description', form.short_description.slice(0, 300))
      fd.append('long_description', form.long_description)
      fd.append('tags', JSON.stringify(form.tags.split(',').map(tag => tag.trim()).filter(Boolean)))
      fd.append('specifications', JSON.stringify(requestSpecifications))
      fd.append('variant_options', JSON.stringify(variants.map(variant => variant.options)))
      fd.append('offer_details', JSON.stringify({
        price: form.price,
        original_price: form.original_price || null,
        delivery_fee: form.delivery_fee || '0',
        stock: Number(form.stock || 0),
        trader_sku: form.trader_sku.trim(),
        condition: form.condition,
        availability: form.availability,
        warranty: form.warranty.trim(),
        delivery_options: form.delivery_options.split(',').map(option => option.trim()).filter(Boolean),
        package_details: form.package_details,
        variants: variants.map(variant => ({
          sku: variant.sku.trim(),
          options: variant.options,
          price: variant.price || form.price,
          compare_at_price: variant.compare_at_price || null,
          stock: Number(variant.stock || 0),
          weight: variant.weight || null,
          is_active: variant.is_active,
        })),
        variant_image_indexes: variantImageIndexes,
      }))
      requestImages.forEach((image, index) => fd.append(`images[${index}]`, image))
      const { data } = await productsApi.requestCatalogProduct(fd)
      setCatalogRequestMessage(data.detail)
      try {
        const requests = await productsApi.myCatalogRequests()
        setMyCatalogRequests(requests.data)
      } catch (cause) {
        setCatalogRequestMessage(`${data.detail} ${getLoadError(cause, 'your product request list')}`)
      }
    } catch (cause) {
      const payload = axios.isAxiosError(cause) ? cause.response?.data : undefined
      if (axios.isAxiosError(cause) && cause.response?.status === 409 && payload && typeof payload === 'object') {
        const data = payload as { detail?: string; matches?: typeof catalogRequestMatches }
        setCatalogRequestMatches(data.matches ?? [])
        setCatalogRequestMessage(data.detail ?? 'Similar products need review.')
      } else {
        setCatalogRequestMessage(getApiErrorDetails(payload).join(' ') || 'Failed to submit the product request.')
      }
    } finally {
      setCatalogRequestSaving(false)
    }
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
    const requiredSpecifications = selectedCategory?.attributes.filter(attribute =>
      attribute.is_required && !attribute.is_variant,
    ) ?? []
    const missingSpecification = requiredSpecifications.find(attribute => {
      const value = specifications[attribute.key]
      return value === undefined || value === null || value === ''
        || (Array.isArray(value) && value.length === 0)
    })
    if (missingSpecification) {
      setError(`${missingSpecification.name} is required for ${selectedCategory?.name ?? 'this category'}.`)
      return
    }

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
    const requiredVariantAttributes = selectedCategory?.attributes.filter(attribute =>
      attribute.is_required && attribute.is_variant,
    ) ?? []
    const missingVariantAttribute = requiredVariantAttributes.find(attribute =>
      !variantPayload.length || variantPayload.some(variant => {
        const value = variant.options[attribute.key]
        return value === undefined || value === null || String(value).trim() === ''
      }),
    )
    if (missingVariantAttribute) {
      setError(`Every variant needs a value for ${missingVariantAttribute.name}.`)
      return
    }
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
      fd.append('trader_sku', form.trader_sku.trim())
      fd.append('brand', form.brand.trim())
      fd.append('condition', form.condition)
      fd.append('availability', form.availability)
      fd.append('warranty', form.warranty.trim())
      fd.append('delivery_options', JSON.stringify(form.delivery_options.split(',').map(option => option.trim()).filter(Boolean)))
      fd.append('package_details', form.package_details)
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
      if (selectedCatalogProduct && view === 'add') {
        fd.append('catalog_product_id', String(selectedCatalogProduct.id))
        fd.append('catalog_image_references', JSON.stringify(selectedCatalogImages))
      }
      if (images[0]) fd.append('image', images[0])

      if (view === 'add') {
        const r = await tradersApi.createProduct(traderUuid!, fd)
        setProducts(p => [r.data, ...p])
      } else {
        const r = await tradersApi.updateProduct(traderUuid!, editing!.uuid, fd)
        setProducts(p => p.map(x => x.uuid === r.data.uuid ? r.data : x))
      }
      setView('list')
    } catch (cause) {
      const responseData = axios.isAxiosError(cause) ? cause.response?.data : undefined
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined
      const details = getApiErrorDetails(responseData)
      const message = details.length
        ? details.join(' ')
        : status
          ? `Failed to save product (server returned ${status}).`
          : 'Failed to save product.'
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

  if (view === 'add' && !selectedCatalogProduct) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (isCatalogRequestPage) {
                setView('add')
                navigate(`/trader/${traderUuid}/products`)
              } else {
                setView('list')
              }
            }}
            className="p-1 hover:opacity-70"
            aria-label={isCatalogRequestPage ? 'Back to product search' : 'Back to products'}
          >
            <ArrowLeft size={20} color="#071A2B" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#071A2B]">
              {isCatalogRequestPage ? 'Request a product' : 'Find a product to sell'}
            </h1>
            <p className="text-[13px] text-[#64748B] mt-1">
              {isCatalogRequestPage
                ? 'Submit the product and your proposed offer for admin review.'
                : 'Choose a shared catalog product first. Its official details and images cannot be edited here.'}
            </p>
          </div>
        </div>

        {!isCatalogRequestPage && <div className="relative mb-5">
          <Search size={18} className="absolute left-3 top-3.5 text-[#94A3B8]" />
          <input
            autoFocus
            value={catalogQuery}
            onChange={event => {
              const query = event.target.value
              setCatalogQuery(query)
              setCatalogMatches([])
              setCatalogSearchError('')
              setCatalogSearchLoading(query.trim().length >= 2)
            }}
            placeholder="Search product name, brand, model, barcode or GTIN"
            className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-10 pr-11 text-[14px] outline-none focus:border-[#22C55E]"
          />
          {catalogQuery && (
            <button
              type="button"
              onClick={() => {
                setCatalogQuery('')
                setCatalogMatches([])
                setCatalogSearchError('')
                setCatalogSearchLoading(false)
              }}
              aria-label="Clear product search"
              className="absolute right-3 top-3 rounded-full p-1 text-[#94A3B8] hover:bg-[#F1F5F9]"
            >
              <X size={15} />
            </button>
          )}
        </div>}

        {!isCatalogRequestPage && catalogSearchLoading && <p className="mb-4 text-[13px] text-[#64748B]">Searching the shared catalog…</p>}
        {!isCatalogRequestPage && catalogSearchError && <p role="alert" className="mb-4 text-[13px] text-red-600">{catalogSearchError}</p>}

        {!isCatalogRequestPage && <div className="grid gap-3" aria-live="polite">
          {catalogMatches.map(product => {
            return (
              <article key={product.id} className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <CatalogResultImage references={product.image_references ?? []} name={product.name} />
                <div className="min-w-0">
                  <h2 className="font-bold text-[#071A2B]">{product.name}</h2>
                  <p className="mt-1 text-[12px] text-[#64748B]">
                    {[product.brand, product.model, product.category_name].filter(Boolean).join(' · ')}
                  </p>
                  {product.short_description && <p className="mt-1 text-[12px] text-[#475569] line-clamp-2">{product.short_description}</p>}
                  {Object.entries(product.specifications).slice(0, 3).map(([key, value]) => (
                    <span key={key} className="mr-2 mt-1 inline-block text-[11px] text-[#64748B]">{key}: {String(value)}</span>
                  ))}
                  <button
                    type="button"
                    onClick={() => selectCatalogProduct(product)}
                    className="mt-3 rounded-lg bg-[#22C55E] px-4 py-2.5 text-[12px] font-bold text-white"
                  >
                    Sell this product
                  </button>
                </div>
              </article>
            )
          })}
        </div>}

        {!isCatalogRequestPage && catalogQuery.trim().length >= 2 && !catalogSearchLoading && !catalogSearchError && catalogMatches.length === 0 && (
          <p className="mt-4 rounded-xl bg-[#F8FAFC] p-4 text-[13px] text-[#64748B]">
            No approved catalog products match “{catalogQuery.trim()}”. You can request it below.
          </p>
        )}

        {!isCatalogRequestPage && <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#071A2B]">Product not found?</h2>
              <p className="mt-1 text-[12px] text-[#64748B]">Submit a new product request for admin review.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const requestProductName = catalogQuery.trim()
                setCatalogRequestForm(current => ({
                  ...current,
                  name: requestProductName || current.name,
                }))
                setCatalogRequestMessage('')
                setCatalogRequestMatches([])
                setView('add')
                navigate(`/trader/${traderUuid}/products/request`, {
                  state: { requestProductName },
                })
              }}
              className="rounded-lg bg-[#22C55E] px-4 py-2.5 text-[12px] font-bold text-white"
            >
              Request Product
            </button>
          </div>
        </section>
        }

        {isCatalogRequestPage && <section className="mt-2 rounded-xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-[#071A2B]">Product request details</h2>
              <p className="mt-1 text-[12px] text-[#64748B]">Your request is separate from your listed products and will be reviewed by an administrator.</p>
            </div>
          </div>

          <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(190px,240px)_minmax(0,1fr)]">
              <div className="lg:col-start-2 lg:row-start-1">
                <h3 className="mb-3 text-[12px] font-extrabold uppercase tracking-wide text-[#475569]">Product identity</h3>
                <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Official product name *" value={catalogRequestForm.name} onChange={name => setCatalogRequestForm(current => ({ ...current, name }))} placeholder="e.g. ANENG M118A Digital Multimeter" />
              <Field label="Brand" value={catalogRequestForm.brand} onChange={brand => setCatalogRequestForm(current => ({ ...current, brand }))} />
              <Field label="Model / manufacturer part number" value={catalogRequestForm.model} onChange={model => setCatalogRequestForm(current => ({ ...current, model }))} />
              <Field label="Product type" value={catalogRequestForm.product_type} onChange={product_type => setCatalogRequestForm(current => ({ ...current, product_type }))} />
              <Field label="Barcode" value={catalogRequestForm.barcode} onChange={barcode => setCatalogRequestForm(current => ({ ...current, barcode }))} />
              <Field label="GTIN" value={catalogRequestForm.gtin} onChange={gtin => setCatalogRequestForm(current => ({ ...current, gtin }))} />
              <Field label="Manufacturer part number" value={catalogRequestForm.mpn} onChange={mpn => setCatalogRequestForm(current => ({ ...current, mpn }))} />
              <div>
                <label className="mb-2 block text-[13px] font-bold text-[#071A2B]">Category</label>
                <CategoryCascadeSelect
                  categories={categories}
                  selectedId={catalogRequestForm.category_id}
                  onChange={category_id => setCatalogRequestForm(current => ({ ...current, category_id }))}
                />
              </div>
                </div>
              </div>

              <div className="lg:col-start-2 lg:row-start-2">
                <h3 className="mb-3 text-[12px] font-extrabold uppercase tracking-wide text-[#475569]">Your proposed offer</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Price (UGX) *" value={form.price} onChange={set('price')} type="number" placeholder="0" />
                  <Field label="Original price (UGX)" value={form.original_price} onChange={set('original_price')} type="number" placeholder="Optional" />
                  <Field label="Stock" value={form.stock} onChange={set('stock')} type="number" placeholder="0" />
                  <Field label="Delivery fee (UGX)" value={form.delivery_fee} onChange={set('delivery_fee')} type="number" placeholder="0" />
                  <Field label="Trader SKU" value={form.trader_sku} onChange={set('trader_sku')} placeholder="Optional" />
                  <Field label="Warranty" value={form.warranty} onChange={set('warranty')} placeholder="e.g. 12 months" />
                  <Field label="Delivery options (comma separated)" value={form.delivery_options} onChange={set('delivery_options')} placeholder="Pickup, Courier" />
                  <Field label="Package details" value={form.package_details} onChange={set('package_details')} placeholder="What is included?" />
                  <div>
                    <label className="mb-2 block text-[13px] font-bold text-[#071A2B]">Condition</label>
                    <select value={form.condition} onChange={event => set('condition')(event.target.value as Form['condition'])} className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-3 text-[13px]">
                      <option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[13px] font-bold text-[#071A2B]">Availability</label>
                    <select value={form.availability} onChange={event => set('availability')(event.target.value as Form['availability'])} className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-3 text-[13px]">
                      <option value="in_stock">In stock</option><option value="preorder">Pre-order</option><option value="made_to_order">Made to order</option><option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                  <Field label="Tags (comma separated)" value={form.tags} onChange={set('tags')} placeholder="e.g. tools, digital" />
                  <label className="block text-[13px] font-bold text-[#071A2B] sm:col-span-2">
                    Short description <span className="font-normal text-[#94A3B8]">(max 300 characters)</span>
                    <textarea maxLength={300} value={form.short_description} onChange={event => set('short_description')(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-[#E2E8F0] px-3 py-3 text-[13px] font-normal" />
                  </label>
                  <label className="block text-[13px] font-bold text-[#071A2B] sm:col-span-2">
                    Full product details
                    <textarea value={form.long_description} onChange={event => set('long_description')(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-[#E2E8F0] px-3 py-3 text-[13px] font-normal" />
                  </label>
                  <label className="block text-[13px] font-bold text-[#071A2B] sm:col-span-2">
                    Specifications (JSON)
                    <textarea
                      value={catalogRequestSpecificationsText}
                      onChange={event => setCatalogRequestSpecificationsText(event.target.value)}
                      className="mt-2 min-h-24 w-full rounded-xl border border-[#E2E8F0] px-3 py-3 font-mono text-[11px] font-normal"
                    />
                  </label>
                </div>
              </div>

              <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2">
                <h3 className="mb-3 text-[12px] font-extrabold uppercase tracking-wide text-[#475569]">Product and variant images</h3>
                <div className="flex flex-wrap items-start gap-3">
                  {catalogRequestImages.map((image, index) => (
                    <div key={`${image.preview}-${index}`} className={`relative ${index === 0 ? 'w-full' : ''}`}>
                      <img
                        src={image.preview}
                        alt={index === 0 ? 'Main product image preview' : `Product image ${index + 1} preview`}
                        className={`${index === 0 ? 'aspect-square w-full max-w-[240px]' : 'h-16 w-16'} rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] object-cover`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(image.preview)
                          setCatalogRequestImages(current => current.filter((_, itemIndex) => itemIndex !== index))
                        }}
                        className="absolute -right-2 -top-2 rounded-full bg-[#071A2B] p-1 text-white"
                        aria-label={`Remove product image ${index + 1}`}
                      ><X size={12} /></button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] text-[10px] font-bold text-[#64748B]">
                    <ImagePlus size={20} /> Add image
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={event => {
                        const selected = Array.from(event.target.files ?? []).map(file => ({
                          file,
                          preview: URL.createObjectURL(file),
                        }))
                        setCatalogRequestImages(current => {
                          const added = selected.slice(0, Math.max(0, 12 - current.length))
                          selected.slice(added.length).forEach(image => URL.revokeObjectURL(image.preview))
                          return [...current, ...added]
                        })
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
                <p className="mt-2 max-w-[240px] text-[11px] text-[#64748B]">The first image is the main product photo. Add up to 12 images, including variant photos.</p>
              </div>

              <div className="lg:col-span-2">
                <h3 className="mb-1 text-[12px] font-extrabold uppercase tracking-wide text-[#475569]">Variants</h3>
                <p className="mb-2 text-[11px] text-[#64748B]">Add variant options, per-variant prices and stock, and an optional image for each variant.</p>
                <ProductVariantEditor
                  variants={variants}
                  onChange={setVariants}
                  basePrice={form.price}
                  baseOriginalPrice={form.original_price}
                  optionAttributes={requestCategory?.attributes.filter(attribute => attribute.is_variant) ?? []}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-[#F1F5F9] pt-4 lg:col-span-2">
                <button
                  type="button"
                  disabled={catalogRequestSaving}
                  onClick={submitCatalogProductRequest}
                  className="rounded-lg bg-[#071A2B] px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50"
                >
                  {catalogRequestSaving ? 'Submitting…' : 'Submit complete product request'}
                </button>
                {catalogRequestMessage && <p role="status" className="text-[12px] text-[#475569]">{catalogRequestMessage}</p>}
              </div>

              {catalogRequestMatches.length > 0 && (
                <div className="sm:col-span-2 rounded-lg bg-amber-50 p-4">
                  <p className="text-[12px] font-bold text-amber-900">Possible existing catalog products:</p>
                  {catalogRequestMatches.map(product => (
                    <div key={product.id} className="mt-2 flex items-center justify-between gap-3 text-[12px] text-amber-900">
                      <span>{[product.name, product.brand, product.model].filter(Boolean).join(' · ')}</span>
                      <button type="button" className="underline" onClick={() => {
                        setCatalogQuery(product.model || product.name)
                        setView('add')
                        navigate(`/trader/${traderUuid}/products`)
                      }}>Search product</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </section>
        }

        {!isCatalogRequestPage && (
          <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#071A2B]">My product requests</h2>
                <p className="mt-1 text-[12px] text-[#64748B]">Track review status. Approved requests can be listed with your saved offer details.</p>
              </div>
              {myCatalogRequestsLoading && <span className="text-[11px] text-[#64748B]">Loading…</span>}
            </div>
            {myCatalogRequests.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {myCatalogRequests.map(request => (
                  <article key={request.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E2E8F0] p-3">
                    {request.images[0]?.url
                      ? <img src={request.images[0].url} alt={request.name} className="h-12 w-12 rounded-md object-cover" />
                      : <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#F1F5F9]"><Package size={18} className="text-[#94A3B8]" /></div>
                    }
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-[#071A2B]">{request.name}</p>
                      <p className="mt-0.5 text-[10px] capitalize text-[#64748B]">
                        {request.review_status.replace('_', ' ')} · UGX {Number(request.request_offer_details.price).toLocaleString()}
                      </p>
                      {request.review_note && <p className="mt-1 text-[10px] text-amber-700">Admin note: {request.review_note}</p>}
                    </div>
                    {request.review_status === 'approved' && Number(request.request_offer_details?.price) > 0 && (
                      <button
                        type="button"
                        onClick={() => sellApprovedCatalogRequest(request)}
                        className="rounded-lg bg-[#22C55E] px-3 py-2 text-[11px] font-bold text-white"
                      >
                        Sell this product
                      </button>
                    )}
                    {request.review_status === 'approved' && !(Number(request.request_offer_details?.price) > 0) && (
                      <span className="text-[10px] font-semibold text-[#64748B]">Approved — select it in the catalog to create an offer</span>
                    )}
                  </article>
                ))}
              </div>
            ) : !myCatalogRequestsLoading && <p className="mt-3 text-[12px] text-[#94A3B8]">No product requests yet.</p>}
          </section>
        )}
      </div>
    )
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

            {selectedCatalogProduct && !isEdit ? (
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Approved catalog images</label>
                {selectedCatalogProduct.image_references.length ? (
                  <div className="space-y-2">
                    {selectedCatalogProduct.image_references.map(reference => {
                      const imageUrl = cloudinaryUrl(reference)
                      const checked = selectedCatalogImages.includes(reference)
                      return (
                        <label key={reference} className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] p-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={event => setSelectedCatalogImages(current => event.target.checked
                              ? [...current, reference]
                              : current.filter(item => item !== reference))}
                          />
                          {imageUrl && <img src={imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" />}
                          <span className="min-w-0 flex-1 truncate text-[11px] text-[#64748B]">{reference}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg bg-[#F8FAFC] p-3 text-[12px] text-[#64748B]">This catalog product has no approved images yet.</p>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-[#E2E8F0] px-3 py-2 text-[11px] font-semibold text-[#64748B]"
                >
                  <ImagePlus size={15} /> Add actual-item photo (optional)
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileEdit(e.target.files)} />
                {previews[0] && <img src={previews[0]} alt="Trader item photo preview" className="mt-3 h-24 w-24 rounded-lg object-cover" />}
              </div>
            ) : isEdit ? (
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
              {selectedCatalogProduct
                ? <p className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-[13px] text-[#475569]">{selectedCategory?.name ?? 'Uncategorized'}</p>
                : <CategoryCascadeSelect categories={categories} selectedId={form.category_id} onChange={changeCategory} />
              }
              {!selectedCatalogProduct && <p className="mt-1.5 text-[11px] text-[#64748B]">Choose a department, then narrow it to a category or subcategory.</p>}
            </div>
          </div>

          {/* Right columns */}
          <div className="lg:col-span-2 space-y-4">
            {selectedCatalogProduct && (
              <div className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#15803D]">Shared catalog product</p>
                <p className="mt-1 font-extrabold text-[#071A2B]">{selectedCatalogProduct.name}</p>
                <p className="mt-1 text-[12px] text-[#475569]">
                  {[selectedCatalogProduct.brand, selectedCatalogProduct.model, selectedCatalogProduct.product_type].filter(Boolean).join(' · ')}
                </p>
                <button type="button" onClick={() => {
                  setSelectedCatalogProduct(null)
                  setSelectedCatalogImages([])
                  setExistingImage(null)
                  setForm(EMPTY)
                }} className="mt-2 text-[11px] font-bold text-[#15803D] underline">
                  Choose a different catalog product
                </button>
              </div>
            )}
            <Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Wireless Earbuds" disabled={Boolean(selectedCatalogProduct)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Brand" value={form.brand} onChange={set('brand')} placeholder="e.g. Apple" disabled={Boolean(selectedCatalogProduct)} />
              <div>
                <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Condition</label>
                <select value={form.condition} onChange={event => set('condition')(event.target.value as Form['condition'])} className="w-full px-3 py-3 bg-white border border-[#E2E8F0] rounded-xl text-[13px]">
                  <option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option>
                </select>
              </div>
              {!selectedCatalogProduct && <Field label="Tags (comma separated)" value={form.tags} onChange={set('tags')} placeholder="e.g. electronics, repair" />}
            </div>
            <Field label="Trader SKU (optional)" value={form.trader_sku} onChange={set('trader_sku')} placeholder="Your stock keeping reference" maxLength={100} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (UGX) *" value={form.price} onChange={set('price')} placeholder="e.g. 29000" type="number" />
              <Field label="Original Price (UGX)" value={form.original_price} onChange={set('original_price')} placeholder="e.g. 59000" type="number" />
              <Field label="Stock" value={form.stock} onChange={set('stock')} placeholder="e.g. 50" type="number" />
              <Field label="Delivery Fee (UGX)" value={form.delivery_fee} onChange={set('delivery_fee')} placeholder="e.g. 5000" type="number" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[13px] font-bold text-[#071A2B]">Availability</label>
                <select value={form.availability} onChange={event => set('availability')(event.target.value as Form['availability'])} className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-3 text-[13px]">
                  <option value="in_stock">In stock</option>
                  <option value="preorder">Pre-order</option>
                  <option value="made_to_order">Made to order</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <Field label="Warranty" value={form.warranty} onChange={set('warranty')} placeholder="e.g. 12-month manufacturer warranty" maxLength={255} />
              <Field label="Delivery options (comma separated)" value={form.delivery_options} onChange={set('delivery_options')} placeholder="e.g. Pickup, Kampala delivery" />
              <Field label="Package / bundle details" value={form.package_details} onChange={set('package_details')} placeholder="What is included in this offer?" />
            </div>
            <Field label="Short Description" value={form.short_description} onChange={set('short_description')} placeholder="Brief summary" maxLength={300} disabled={Boolean(selectedCatalogProduct)} />
            {selectedCatalogProduct
              ? <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                  <p className="mb-2 text-[13px] font-bold text-[#071A2B]">Shared product description</p>
                  <p className="whitespace-pre-wrap text-[12px] text-[#475569]">{form.long_description}</p>
                </div>
              : <div>
                  <label className="block text-[13px] font-bold text-[#071A2B] mb-2">Long Description</label>
                  <RichTextEditor
                    value={form.long_description}
                    onChange={v => set('long_description')(v)}
                    placeholder="Full product details..."
                  />
                </div>
            }

            {selectedCatalogProduct && Object.keys(specifications).length > 0 && (
              <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                <h2 className="text-[14px] font-extrabold text-[#071A2B]">Shared product specifications</h2>
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(specifications).map(([key, value]) => (
                    <div key={key} className="text-[12px] text-[#475569]"><dt className="font-bold">{key}</dt><dd>{String(value)}</dd></div>
                  ))}
                </dl>
              </section>
            )}

            {!selectedCatalogProduct && !!selectedCategory?.attributes.filter(attribute => !attribute.is_variant).length && (
              <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-4">
                <div>
                  <h2 className="text-[14px] font-extrabold text-[#071A2B]">Product specifications</h2>
                  <p className="text-[11px] text-[#64748B] mt-1">Fields are configured for {selectedCategory.name}.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {selectedCategory.attributes.filter(attribute => !attribute.is_variant).map(attribute => {
                    const value = specifications[attribute.key]
                    const inputClass = 'w-full px-3 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[12px]'
                    const selectedValues = Array.isArray(value)
                      ? value.map(String)
                      : typeof value === 'string'
                        ? value.split(',').map(item => item.trim()).filter(Boolean)
                        : []
                    const addMultiSelectValue = (rawValue: string) => {
                      const nextValue = rawValue.trim()
                      if (nextValue && !selectedValues.some(current => current.toLowerCase() === nextValue.toLowerCase())) {
                        updateSpecification(attribute.key, [...selectedValues, nextValue])
                      }
                    }
                    return (
                      <div key={attribute.key}>
                        <label className="block text-[12px] font-bold text-[#071A2B] mb-1.5">{attribute.name}{attribute.is_required ? ' *' : ''}</label>
                        {attribute.input_type === 'boolean' ? (
                          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={Boolean(value)} onChange={event => updateSpecification(attribute.key, event.target.checked)} /> Yes</label>
                        ) : attribute.input_type === 'dropdown' ? (
                          <select className={inputClass} value={String(value ?? '')} onChange={event => updateSpecification(attribute.key, event.target.value)}>
                            <option value="">Select...</option>{attribute.choices.map(choice => <option key={choice}>{choice}</option>)}
                          </select>
                        ) : attribute.input_type === 'multi_select' ? (
                          <div className="space-y-2">
                            <select
                              className={inputClass}
                              value=""
                              aria-label={`Add ${attribute.name}`}
                              onChange={event => {
                                addMultiSelectValue(event.target.value)
                                event.currentTarget.value = ''
                              }}
                            >
                              <option value="">Select a value to add...</option>
                              {attribute.choices.filter(choice => !selectedValues.includes(choice)).map(choice => <option key={choice} value={choice}>{choice}</option>)}
                            </select>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedValues.map(selectedValue => (
                                <span key={selectedValue} className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#334155]">
                                  {selectedValue}
                                  <button
                                    type="button"
                                    aria-label={`Remove ${selectedValue}`}
                                    onClick={() => updateSpecification(attribute.key, selectedValues.filter(item => item !== selectedValue))}
                                    className="text-[#64748B] hover:text-red-600"
                                  ><X size={12} /></button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                className={inputClass}
                                value={specificationValueDrafts[attribute.key] ?? ''}
                                placeholder="Add a custom value"
                                onChange={event => setSpecificationValueDrafts(current => ({ ...current, [attribute.key]: event.target.value }))}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    addMultiSelectValue(specificationValueDrafts[attribute.key] ?? '')
                                    setSpecificationValueDrafts(current => ({ ...current, [attribute.key]: '' }))
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="shrink-0 rounded-lg border border-[#E2E8F0] px-3 text-[11px] font-bold text-[#334155]"
                                onClick={() => {
                                  addMultiSelectValue(specificationValueDrafts[attribute.key] ?? '')
                                  setSpecificationValueDrafts(current => ({ ...current, [attribute.key]: '' }))
                                }}
                              >Add</button>
                            </div>
                          </div>
                        ) : (
                          <input
                            type={attribute.input_type === 'number' ? 'number' : 'text'}
                            className={inputClass}
                            value={Array.isArray(value) ? value.join(', ') : String(value ?? '')}
                            list={attribute.choices.length ? `product-attribute-${attribute.key}` : undefined}
                            onChange={event => updateSpecification(attribute.key,
                              attribute.input_type === 'number' ? (event.target.value ? Number(event.target.value) : '') : event.target.value,
                            )}
                          />
                        )}
                        {attribute.input_type !== 'dropdown' && attribute.choices.length > 0 && (
                          <datalist id={`product-attribute-${attribute.key}`}>
                            {attribute.choices.map(choice => <option key={choice} value={choice} />)}
                          </datalist>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <ProductVariantEditor
              key={`${editing?.uuid ?? 'new'}:${form.category_id}:${selectedCatalogProduct?.id ?? 'existing'}`}
              variants={variants}
              onChange={setVariants}
              basePrice={form.price}
              baseOriginalPrice={form.original_price}
              optionAttributes={variantAttributes}
              approvedVariantOptions={approvedVariantOptions ?? undefined}
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
      <section className="mb-8 rounded-xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4">
          <h2 className="text-[15px] font-extrabold text-[#071A2B]">Shared catalog</h2>
          <p className="mt-1 text-[12px] text-[#64748B]">
            Approved products are available to every trader. Choose one to add your own price, stock, and variants.
          </p>
        </div>
        {catalogBrowseError && <p role="alert" className="mb-3 text-[13px] text-red-600">{catalogBrowseError}</p>}
        {catalogBrowseLoading && catalogBrowseProducts.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#64748B]">Loading shared products…</p>
        ) : catalogBrowseProducts.length === 0 ? (
          !catalogBrowseError && <p className="py-6 text-center text-[13px] text-[#64748B]">No approved shared products are available yet.</p>
        ) : (
          <div className="grid gap-3">
            {catalogBrowseProducts.map(product => (
              <article key={product.id} className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 rounded-xl border border-[#E2E8F0] p-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <CatalogResultImage references={product.image_references ?? []} name={product.name} />
                <div className="min-w-0">
                  <h3 className="font-bold text-[#071A2B]">{product.name}</h3>
                  <p className="mt-1 text-[12px] text-[#64748B]">
                    {[product.brand, product.model, product.category_name].filter(Boolean).join(' · ')}
                  </p>
                  {product.short_description && <p className="mt-1 text-[12px] text-[#475569] line-clamp-2">{product.short_description}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      openAdd()
                      selectCatalogProduct(product)
                    }}
                    className="mt-3 rounded-lg bg-[#22C55E] px-4 py-2.5 text-[12px] font-bold text-white"
                  >
                    Sell this product
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {catalogBrowseHasMore && (
          <button
            type="button"
            onClick={loadMoreCatalogProducts}
            disabled={catalogBrowseLoading}
            className="mt-4 w-full rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-[12px] font-bold text-[#071A2B] disabled:opacity-60"
          >
            {catalogBrowseLoading ? 'Loading…' : 'Load more products'}
          </button>
        )}
      </section>

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

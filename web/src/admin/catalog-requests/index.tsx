import { useEffect, useMemo, useState } from 'react'
import { Check, Image as ImageIcon, RefreshCw, X } from 'lucide-react'
import {
  adminCatalogRequestsApi,
  productsApi,
  type ApiCatalogRequest,
  type ApiCategory,
  type CatalogRequestOfferDetails,
} from '../../lib/api'

type RequestDraft = {
  name: string
  brand: string
  model: string
  product_type: string
  category_id: string
  short_description: string
  long_description: string
  tags: string
  specifications: string
  price: string
  original_price: string
  delivery_fee: string
  stock: string
  trader_sku: string
  condition: CatalogRequestOfferDetails['condition']
  availability: CatalogRequestOfferDetails['availability']
  warranty: string
  delivery_options: string
  package_details: string
  variants: string
  review_note: string
}

const makeDraft = (request: ApiCatalogRequest): RequestDraft => ({
  name: request.name,
  brand: request.brand,
  model: request.model,
  product_type: request.product_type,
  category_id: request.category_id ? String(request.category_id) : '',
  short_description: request.short_description,
  long_description: request.long_description,
  tags: (request.tags ?? []).join(', '),
  specifications: JSON.stringify(request.specifications ?? {}, null, 2),
  price: request.request_offer_details.price ?? '',
  original_price: request.request_offer_details.original_price ?? '',
  delivery_fee: request.request_offer_details.delivery_fee ?? '0',
  stock: String(request.request_offer_details.stock ?? 0),
  trader_sku: request.request_offer_details.trader_sku ?? '',
  condition: request.request_offer_details.condition ?? 'new',
  availability: request.request_offer_details.availability ?? 'in_stock',
  warranty: request.request_offer_details.warranty ?? '',
  delivery_options: (request.request_offer_details.delivery_options ?? []).join(', '),
  package_details: request.request_offer_details.package_details ?? '',
  variants: JSON.stringify(request.request_offer_details.variants ?? [], null, 2),
  review_note: request.review_note ?? '',
})

const collectErrors = (value: unknown, path = ''): string[] => {
  if (typeof value === 'string') return [path ? `${path}: ${value}` : value]
  if (Array.isArray(value)) return value.flatMap(item => collectErrors(item, path))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      collectErrors(item, path ? `${path}.${key}` : key),
    )
  }
  return []
}

const getErrorMessage = (cause: unknown) => {
  if (cause && typeof cause === 'object' && 'response' in cause) {
    const data = (cause as { response?: { data?: unknown } }).response?.data
    const messages = collectErrors(data)
    if (messages.length) return messages.join(' ')
  }
  return 'The request could not be completed. Please try again.'
}

export default function AdminCatalogRequests() {
  const [requests, setRequests] = useState<ApiCatalogRequest[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState('pending_review')
  const [draft, setDraft] = useState<RequestDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const filteredRequests = useMemo(() => requests.filter(request =>
    statusFilter === 'all' || request.review_status === statusFilter,
  ), [requests, statusFilter])
  const selectedRequest = requests.find(request => request.id === selectedId) ?? null

  useEffect(() => {
    let active = true
    Promise.all([
      adminCatalogRequestsApi.list(),
      productsApi.categories(),
    ]).then(([requestResponse, categoryResponse]) => {
      if (!active) return
      setRequests(requestResponse.data)
      setCategories(Array.isArray(categoryResponse.data) ? categoryResponse.data : [])
      const selected = requestResponse.data.find(request => request.review_status === 'pending_review')
        ?? requestResponse.data[0]
      setSelectedId(selected?.id ?? null)
      setDraft(selected ? makeDraft(selected) : null)
    }).catch(cause => {
      if (active) setError(getErrorMessage(cause))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [reloadKey])

  const updateDraft = <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) =>
    setDraft(current => current ? { ...current, [key]: value } : current)

  const save = async (reviewStatus?: ApiCatalogRequest['review_status']) => {
    if (!selectedRequest || !draft) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      let payload: Parameters<typeof adminCatalogRequestsApi.update>[1]
      if (reviewStatus === 'rejected' || reviewStatus === 'changes_required') {
        payload = {
          review_status: reviewStatus,
          review_note: draft.review_note,
        }
      } else {
        const offerDetails: CatalogRequestOfferDetails = {
          ...selectedRequest.request_offer_details,
          price: draft.price,
          original_price: draft.original_price || null,
          delivery_fee: draft.delivery_fee || '0',
          stock: Number(draft.stock || 0),
          trader_sku: draft.trader_sku,
          condition: draft.condition,
          availability: draft.availability,
          warranty: draft.warranty,
          delivery_options: draft.delivery_options.split(',').map(option => option.trim()).filter(Boolean),
          package_details: draft.package_details,
          variants: JSON.parse(draft.variants),
          variant_image_indexes: [],
        }
        payload = {
          name: draft.name,
          brand: draft.brand,
          model: draft.model,
          product_type: draft.product_type,
          category_id: draft.category_id ? Number(draft.category_id) : null,
          short_description: draft.short_description,
          long_description: draft.long_description,
          tags: draft.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          specifications: JSON.parse(draft.specifications),
          variant_options: offerDetails.variants.map(variant => variant.options),
          offer_details: offerDetails,
          ...(reviewStatus ? { review_status: reviewStatus } : {}),
        }
      }
      const { data } = await adminCatalogRequestsApi.update(selectedRequest.id, payload)
      setRequests(current => current.map(request => request.id === data.id ? data : request))
      setDraft(makeDraft(data))
      setNotice(reviewStatus === 'approved'
        ? 'Product approved and added to the shared catalog.'
        : reviewStatus
          ? `Request marked ${reviewStatus.replace('_', ' ')}.`
          : 'Request changes saved.')
    } catch (cause) {
      setError(cause instanceof SyntaxError
        ? 'Specifications and variants must be valid JSON.'
        : getErrorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const visibleCount = filteredRequests.length

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#071A2B]">Request Products</h1>
          <p className="mt-1 text-[13px] text-[#64748B]">Review trader product proposals, edit their catalog details, then approve or return them.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            setError('')
            setReloadKey(current => current + 1)
          }}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] font-bold text-[#334155] disabled:opacity-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-[13px] text-green-800">{notice}</p>}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {[
          ['pending_review', 'Pending'],
          ['approved', 'Approved'],
          ['changes_required', 'Changes required'],
          ['rejected', 'Rejected'],
          ['all', 'All'],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              statusFilter === value ? 'border-[#071A2B] bg-[#071A2B] text-white' : 'border-[#E2E8F0] bg-white text-[#475569]'
            }`}
          >
            {label}{value === 'pending_review' ? ` (${requests.filter(request => request.review_status === value).length})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[13px] text-[#64748B]">Loading product requests…</div>
      ) : visibleCount === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white py-16 text-center text-[13px] text-[#64748B]">
          No product requests in this view.
        </div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">
            {filteredRequests.map(request => (
              <button
                type="button"
                key={request.id}
                    onClick={() => {
                      setSelectedId(request.id)
                      setDraft(makeDraft(request))
                      setNotice('')
                    }}
                className={`w-full rounded-xl border p-3 text-left ${
                  selectedId === request.id ? 'border-[#22C55E] bg-green-50' : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-[#071A2B]">{request.name}</span>
                    <span className="mt-1 block text-[11px] text-[#64748B]">{request.requester_name || request.requester_email || 'Trader'}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[9px] font-bold capitalize text-[#475569]">
                    {request.review_status.replace('_', ' ')}
                  </span>
                </span>
                <span className="mt-2 block text-[11px] text-[#475569]">
                  UGX {Number(request.request_offer_details.price).toLocaleString()} · {request.images.length} image{request.images.length === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>

          {selectedRequest && draft && (
            <section className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-[#F1F5F9] pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#071A2B]">{selectedRequest.name}</h2>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Submitted {new Date(selectedRequest.created_at).toLocaleString()} · {selectedRequest.requester_email}
                  </p>
                </div>
                <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[10px] font-bold capitalize text-[#475569]">
                  {selectedRequest.review_status.replace('_', ' ')}
                </span>
              </div>

              {selectedRequest.images.length > 0 && (
                <div className="mb-5">
                  <h3 className="mb-2 text-[12px] font-bold text-[#071A2B]">Submitted images</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.images.map(image => image.url
                      ? <img key={image.id} src={image.url} alt="" className="h-24 w-24 rounded-lg border border-[#E2E8F0] object-cover" />
                      : <div key={image.id} className="flex h-24 w-24 items-center justify-center rounded-lg bg-[#F1F5F9]"><ImageIcon size={20} className="text-[#94A3B8]" /></div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['name', 'Product name'],
                  ['brand', 'Brand'],
                  ['model', 'Model'],
                  ['product_type', 'Product type'],
                  ['price', 'Price (UGX)'],
                  ['original_price', 'Original price (UGX)'],
                  ['stock', 'Stock'],
                  ['delivery_fee', 'Delivery fee (UGX)'],
                  ['trader_sku', 'Trader SKU'],
                  ['warranty', 'Warranty'],
                  ['delivery_options', 'Delivery options (comma separated)'],
                  ['package_details', 'Package details'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block text-[11px] font-bold text-[#334155]">
                    {label}
                    <input
                      type={['price', 'original_price', 'stock', 'delivery_fee'].includes(key) ? 'number' : 'text'}
                      value={draft[key]}
                      onChange={event => updateDraft(key, event.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-[12px] font-normal outline-none focus:border-[#22C55E]"
                    />
                  </label>
                ))}
                <label className="block text-[11px] font-bold text-[#334155]">
                  Condition
                  <select value={draft.condition} onChange={event => updateDraft('condition', event.target.value as RequestDraft['condition'])} className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-[12px] font-normal">
                    <option value="new">New</option><option value="used">Used</option><option value="refurbished">Refurbished</option>
                  </select>
                </label>
                <label className="block text-[11px] font-bold text-[#334155]">
                  Availability
                  <select value={draft.availability} onChange={event => updateDraft('availability', event.target.value as RequestDraft['availability'])} className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-[12px] font-normal">
                    <option value="in_stock">In stock</option><option value="preorder">Pre-order</option><option value="made_to_order">Made to order</option><option value="unavailable">Unavailable</option>
                  </select>
                </label>
                <label className="block text-[11px] font-bold text-[#334155]">
                  Category
                  <select
                    value={draft.category_id}
                    onChange={event => updateDraft('category_id', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-[12px] font-normal"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <label className="block text-[11px] font-bold text-[#334155]">
                  Tags (comma separated)
                  <input value={draft.tags} onChange={event => updateDraft('tags', event.target.value)} className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-[12px] font-normal" />
                </label>
                <label className="block text-[11px] font-bold text-[#334155] sm:col-span-2">
                  Short description
                  <textarea maxLength={300} value={draft.short_description} onChange={event => updateDraft('short_description', event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-[12px] font-normal" />
                </label>
                <label className="block text-[11px] font-bold text-[#334155] sm:col-span-2">
                  Full product details
                  <textarea value={draft.long_description} onChange={event => updateDraft('long_description', event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-[12px] font-normal" />
                </label>
                <label className="block text-[11px] font-bold text-[#334155]">
                  Specifications (JSON)
                  <textarea value={draft.specifications} onChange={event => updateDraft('specifications', event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 font-mono text-[11px] font-normal" />
                </label>
                <label className="block text-[11px] font-bold text-[#334155]">
                  Variants (JSON)
                  <textarea value={draft.variants} onChange={event => updateDraft('variants', event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 font-mono text-[11px] font-normal" />
                </label>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <label className="block text-[11px] font-bold text-[#334155] sm:col-span-3">
                  Admin note (required for rejection or changes requested)
                  <textarea value={draft.review_note} onChange={event => updateDraft('review_note', event.target.value)} className="mt-1 min-h-16 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px] font-normal" />
                </label>
                <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg border border-[#CBD5E1] px-4 py-2.5 text-[12px] font-bold text-[#334155] disabled:opacity-50">
                  Save edits
                </button>
                <button type="button" disabled={saving} onClick={() => void save('changes_required')} className="rounded-lg bg-amber-50 px-4 py-2.5 text-[12px] font-bold text-amber-800 disabled:opacity-50">
                  <X size={14} className="mr-1 inline" /> Request changes
                </button>
                <button type="button" disabled={saving} onClick={() => void save('approved')} className="rounded-lg bg-[#22C55E] px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50">
                  <Check size={14} className="mr-1 inline" /> Approve &amp; publish
                </button>
                <button type="button" disabled={saving} onClick={() => void save('rejected')} className="rounded-lg bg-red-50 px-4 py-2.5 text-[12px] font-bold text-red-700 disabled:opacity-50">
                  Reject request
                </button>
              </div>
              {saving && <p className="mt-3 text-[11px] text-[#64748B]">Saving review…</p>}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

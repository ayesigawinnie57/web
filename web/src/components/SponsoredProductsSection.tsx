import { useEffect, useMemo, useRef, useState } from 'react'
import { Megaphone, Sparkles, X } from 'lucide-react'
import { advertisingApi, type ApiAdvertisingPlacement, type ApiLinkedAdvertisingPlacement } from '../lib/api'
import { toSponsoredProduct } from '../lib/advertising'
import ProductCard from './ProductCard'

type Props = {
  query?: string
  category?: string
  product?: number
  excludeProductIds?: number[]
  limit?: number
  title?: string
  enableModal?: boolean
}

export default function SponsoredProductsSection({ query, category, product, excludeProductIds = [], limit = 6, title = 'Sponsored Products', enableModal = false }: Props) {
  const [response, setResponse] = useState<{ key: string; placements: ApiLinkedAdvertisingPlacement[] } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const excluded = excludeProductIds.join(',')
  const params = useMemo(() => ({ q: query, category, product, limit, exclude: excluded }), [query, category, product, limit, excluded])
  const requestKey = JSON.stringify(params)

  useEffect(() => {
    if (!modalOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [modalOpen])

  useEffect(() => {
    let active = true
    advertisingApi.placements(params)
      .then(({ data }) => {
        if (!active) return
        const unique = new Map<number, ApiAdvertisingPlacement>()
        data.results.forEach(placement => {
          if (placement.public_product_id !== product) unique.set(placement.campaign_offer_id, placement)
        })
        const selected = [...unique.values()]
          .filter((placement): placement is ApiLinkedAdvertisingPlacement =>
            placement.public_product_id !== null && Boolean(placement.slug))
          .slice(0, limit)
        setResponse({ key: requestKey, placements: selected })
        const ids = selected.map(placement => placement.campaign_offer_id)
        if (ids.length) {
          advertisingApi.impressions(ids).catch(error => {
            console.error('Sponsored impressions could not be recorded.', error)
          })
        }
      })
      .catch(error => {
        console.error('Sponsored products could not be loaded.', error)
        if (active) setResponse({ key: requestKey, placements: [] })
      })
    return () => { active = false }
  }, [params, product, limit, requestKey])

  const placements = response?.key === requestKey ? response.placements : []
  if (!placements.length) return null

  return (
    <>
    <section className="mb-7 overflow-hidden rounded-2xl border border-[#DBEAFE] bg-gradient-to-br from-[#EFF6FF] via-white to-[#F0FDFA] p-4 shadow-sm sm:p-5" aria-label={title}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-[#BFDBFE] bg-white/80 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#1E40AF]">
            <Megaphone size={11} /> Sponsored
          </div>
          <h2 className="text-[17px] font-extrabold text-[#071A2B]">{title}</h2>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Relevant offers promoted by Majo traders</p>
        </div>
        {enableModal && placements.length > 0 && (
          <button type="button" onClick={() => setModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-[11px] font-bold text-[#1E3A8A] transition hover:border-[#1E3A8A] hover:bg-[#EFF6FF]">
            <Sparkles size={14} /> View all
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {placements.map(placement => (
          <ProductCard
            key={placement.campaign_offer_id}
            product={toSponsoredProduct(placement)}
            sponsoredCampaignOfferId={placement.campaign_offer_id}
          />
        ))}
      </div>
    </section>
    {enableModal && modalOpen && (
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center bg-[#071A2B]/65 p-3 backdrop-blur-sm sm:p-6"
        onMouseDown={event => {
          if (event.target === event.currentTarget) setModalOpen(false)
        }}
      >
        <section role="dialog" aria-modal="true" aria-labelledby="sponsored-products-modal-title" className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#F8FAFC] shadow-2xl">
          <header className="relative overflow-hidden bg-gradient-to-r from-[#071A2B] via-[#12365B] to-[#0F766E] px-5 py-5 text-white sm:px-7">
            <div className="absolute -right-6 -top-12 h-40 w-40 rounded-full border-[24px] border-white/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider">
                  <Megaphone size={11} /> Sponsored picks
                </span>
                <h2 id="sponsored-products-modal-title" className="mt-2 text-xl font-extrabold sm:text-2xl">Discover promoted products</h2>
                <p className="mt-1 text-[12px] text-white/75">Offers from Majo traders, chosen to help you find something great.</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close sponsored products"
                className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X size={18} />
              </button>
            </div>
          </header>
          <div className="overflow-y-auto p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold text-[#64748B]">{placements.length} promoted {placements.length === 1 ? 'offer' : 'offers'}</p>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-800">Sponsored</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {placements.map(placement => (
                <ProductCard
                  key={placement.campaign_offer_id}
                  product={toSponsoredProduct(placement)}
                  sponsoredCampaignOfferId={placement.campaign_offer_id}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
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
}

export default function SponsoredProductsSection({ query, category, product, excludeProductIds = [], limit = 6, title = 'Sponsored Products' }: Props) {
  const [response, setResponse] = useState<{ key: string; placements: ApiLinkedAdvertisingPlacement[] } | null>(null)
  const excluded = excludeProductIds.join(',')
  const params = useMemo(() => ({ q: query, category, product, limit, exclude: excluded }), [query, category, product, limit, excluded])
  const requestKey = JSON.stringify(params)

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
    <section className="mb-7" aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-extrabold text-[#071A2B]">{title}</h2>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Relevant offers promoted by Majo traders</p>
        </div>
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
  )
}

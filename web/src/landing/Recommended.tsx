import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, behaviourApi, toProduct, hasAccessToken, type Product } from '../lib/api'
import { getRankedCategories, getRecentProductIds } from '../lib/behaviour'
import ProductCard from '../components/ProductCard'

const PAGE_SIZE = 12

function rankProducts(products: Product[], seenIds: Set<number>, seenCatalogIds: Set<number>): Product[] {
  const rankedCats = getRankedCategories()
  const recentIds = new Set(getRecentProductIds())
  const pool = products.filter(p =>
    !seenIds.has(p.id)
    && (p.catalogProductId === null || !seenCatalogIds.has(p.catalogProductId)),
  )
  if (!pool.length) return []
  if (!rankedCats.length) return [...pool].sort(() => Math.random() - 0.5)
  return pool
    .map(p => {
      const catRank = rankedCats.indexOf(p.category)
      let score = catRank === -1 ? 0 : (rankedCats.length - catRank) * 10
      if (recentIds.has(p.id)) score -= 20
      score += Math.random() * 3
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.p)
}

export default function Recommended({
  products: initialProducts,
  nextPage,
  featuredIds,
  featuredCatalogIds,
}: {
  products: Product[]
  nextPage: string | null
  featuredIds: Set<number>
  featuredCatalogIds: Set<number>
}) {
  const [displayed, setDisplayed] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [exhausted, setExhausted] = useState(false)

  const allProductsRef = useRef<Product[]>(initialProducts)
  const nextPageRef = useRef<string | null>(nextPage)
  const seenIdsRef = useRef<Set<number>>(new Set(featuredIds))
  const seenCatalogIdsRef = useRef<Set<number>>(new Set(featuredCatalogIds))
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const exhaustedRef = useRef(false)
  const apiPageRef = useRef(1)

  const appendPage = async () => {
    if (loadingRef.current || exhaustedRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      if (hasAccessToken()) {
        // ── Authenticated: use backend recommended endpoint ──
        const excludeIds = Array.from(seenIdsRef.current)
        const excludeCatalogIds = Array.from(seenCatalogIdsRef.current)
        const { data } = await behaviourApi.recommended(apiPageRef.current, PAGE_SIZE, excludeIds, excludeCatalogIds)
        const fresh = (data.results ?? []).map(toProduct).filter(p =>
          !seenIdsRef.current.has(p.id)
          && (p.catalogProductId === null || !seenCatalogIdsRef.current.has(p.catalogProductId)),
        )
        if (!data.next) {
          exhaustedRef.current = true
          setExhausted(true)
        } else {
          apiPageRef.current = data.next
        }
        if (fresh.length) {
          fresh.forEach(p => {
            seenIdsRef.current.add(p.id)
            if (p.catalogProductId !== null) seenCatalogIdsRef.current.add(p.catalogProductId)
          })
          setDisplayed(prev => [...prev, ...fresh])
        }
      } else {
        // ── Guest: rank locally, fetch more from API if pool runs low ──
        let ranked = rankProducts(allProductsRef.current, seenIdsRef.current, seenCatalogIdsRef.current)
        if (!ranked.length) {
          if (!nextPageRef.current) {
            exhaustedRef.current = true
            setExhausted(true)
            loadingRef.current = false
            setLoading(false)
            return
          }
          const params = new URL(nextPageRef.current, window.location.origin).searchParams.toString()
          const { data } = await productsApi.list(params)
          const raw: any[] = Array.isArray(data) ? data : (data as any).results ?? []
          nextPageRef.current = Array.isArray(data) ? null : (data as any).next ?? null
          if (!raw.length) {
            exhaustedRef.current = true
            setExhausted(true)
            loadingRef.current = false
            setLoading(false)
            return
          }
          const existingIds = new Set(allProductsRef.current.map(p => p.id))
          const existingCatalogIds = new Set(allProductsRef.current.flatMap(
            p => p.catalogProductId === null ? [] : [p.catalogProductId],
          ))
          const fresh = raw.map(toProduct).filter(p =>
            !existingIds.has(p.id)
            && (p.catalogProductId === null || !existingCatalogIds.has(p.catalogProductId)),
          )
          allProductsRef.current = [...allProductsRef.current, ...fresh]
          ranked = rankProducts(allProductsRef.current, seenIdsRef.current, seenCatalogIdsRef.current)
        }
        if (!ranked.length) {
          exhaustedRef.current = true
          setExhausted(true)
          loadingRef.current = false
          setLoading(false)
          return
        }
        const slice = ranked.slice(0, PAGE_SIZE)
        slice.forEach(p => {
          seenIdsRef.current.add(p.id)
          if (p.catalogProductId !== null) seenCatalogIdsRef.current.add(p.catalogProductId)
        })
        setDisplayed(prev => [...prev, ...slice])
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        exhaustedRef.current = true
        setExhausted(true)
      }
    }

    loadingRef.current = false
    setLoading(false)
  }

  // Initial load
  useEffect(() => {
    if (initialProducts.length) {
      allProductsRef.current = initialProducts
      appendPage()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts])

  useEffect(() => {
    featuredIds.forEach(id => seenIdsRef.current.add(id))
    featuredCatalogIds.forEach(id => seenCatalogIdsRef.current.add(id))
    setDisplayed(prev => prev.filter(product =>
      !featuredIds.has(product.id)
      && (product.catalogProductId === null || !featuredCatalogIds.has(product.catalogProductId)),
    ))
  }, [featuredIds, featuredCatalogIds])

  // Intersection observer
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) appendPage()
    }, { rootMargin: '300px' })
    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!displayed.length) return null

  return (
    <div className="bg-white px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[20px] font-extrabold text-[#071A2B]">Recommended for You</p>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              {getRankedCategories().length ? 'Based on your browsing' : 'Discover our top picks'}
            </p>
          </div>
          <Link to="/shop" className="text-[13px] font-semibold text-[#1E3A8A]">See All →</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {displayed.map(p => <ProductCard key={p.id} product={p} />)}
        </div>

        <div ref={sentinelRef} className="h-8 mt-4 flex items-center justify-center">
          {loading && (
            <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
              <svg className="w-4 h-4 animate-spin text-[#1E3A8A]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading more…
            </div>
          )}
          {exhausted && !loading && (
            <p className="text-[11px] text-[#94A3B8]">
              You've seen it all ·{' '}
              <Link to="/shop" className="text-[#1E3A8A] font-semibold">Browse the full shop →</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

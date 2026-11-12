import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight, BookOpen, Grid2X2, Home, Search, ShoppingBag, Sparkles, Trophy } from 'lucide-react'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'
import { getCategoryUrl, productsApi, watchPageResume, type ApiCategory } from '../lib/api'

const icons = [Grid2X2, ShoppingBag, Sparkles, BookOpen, Home, Trophy]
const colors = ['#1E3A8A', '#E11D48', '#D97706', '#7C3AED', '#0F766E', '#15803D']

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isNearMatch(query: string, word: string) {
  if (word.includes(query)) return true
  const maxDistance = query.length >= 8 ? 2 : query.length >= 4 ? 1 : 0
  if (!maxDistance || Math.abs(query.length - word.length) > maxDistance) return false

  let previous = Array.from({ length: word.length + 1 }, (_, index) => index)
  for (let queryIndex = 1; queryIndex <= query.length; queryIndex += 1) {
    const current = [queryIndex]
    let rowMinimum = queryIndex
    for (let wordIndex = 1; wordIndex <= word.length; wordIndex += 1) {
      const cost = query[queryIndex - 1] === word[wordIndex - 1] ? 0 : 1
      const distance = Math.min(
        previous[wordIndex] + 1,
        current[wordIndex - 1] + 1,
        previous[wordIndex - 1] + cost,
      )
      current.push(distance)
      rowMinimum = Math.min(rowMinimum, distance)
    }
    if (rowMinimum > maxDistance) return false
    previous = current
  }
  return previous[word.length] <= maxDistance
}

function matchesCategorySearch(category: ApiCategory, queryTokens: string[]) {
  const searchableText = normalizeSearchText(`${category.name} ${category.slug} ${category.description}`)
  const words = searchableText.split(' ')
  return queryTokens.every(token => words.some(word => isNearMatch(token, word)))
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    const loadCategories = () => {
      productsApi.categories().then(({ data }) => {
        const rawCategories = Array.isArray(data) ? data : (data as any).results ?? []
        if (active) {
          setCategories(rawCategories)
          setError(false)
        }
      }).catch(() => {
        if (active) setError(true)
      }).finally(() => {
        if (active) setLoading(false)
      })
    }
    loadCategories()
    const stopWatching = watchPageResume(loadCategories)
    return () => {
      active = false
      stopWatching()
    }
  }, [])

  const departments = useMemo(() => {
    const queryTokens = normalizeSearchText(search).split(' ').filter(Boolean)
    return categories
      .filter(category => category.parent_id === null)
      .map(category => {
        const children = categories.filter(item => item.parent_id === category.id)
        const getDescendants = (parentId: number): ApiCategory[] => {
          const directChildren = categories.filter(item => item.parent_id === parentId)
          return directChildren.flatMap(child => [child, ...getDescendants(child.id)])
        }
        const descendants = getDescendants(category.id)
        const matchesDepartment = queryTokens.length === 0 || matchesCategorySearch(category, queryTokens)
        const matchingDescendants = queryTokens.length > 0
          ? descendants.filter(item => matchesCategorySearch(item, queryTokens))
          : children

        return {
          category,
          matchesDepartment,
          visibleCategories: matchesDepartment ? children : matchingDescendants,
          hasMatch: matchesDepartment || matchingDescendants.length > 0,
        }
      })
      .filter(item => item.hasMatch)
  }, [categories, search])

  return (
    <div className="min-h-screen bg-[#F4F7FB]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>All Categories – Majo Gadgets</title>
        <meta name="description" content="Browse all product departments and categories on Majo Gadgets. Find electronics, fashion, home essentials, and more." />
        <link rel="canonical" href="https://www.majogadgets.com/categories" />
      </Helmet>
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-[112px] lg:px-6 lg:pb-12 lg:pt-[128px]">
        <header className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#071A2B] via-[#12344A] to-[#1E3A8A] px-5 py-7 text-white shadow-lg shadow-[#071A2B]/10 sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.04]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">Explore Majo Gadgets</p>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Shop by category</h1>
              <p className="mt-2 text-[13px] leading-6 text-white/75">
                Browse departments, discover new collections, and find just what you need.
              </p>
            </div>
            <label className="relative block w-full lg:max-w-sm">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search departments, categories, or keywords"
                aria-label="Search departments, categories, or keywords"
                className="h-12 w-full rounded-xl border border-white/30 bg-white pl-11 pr-4 text-[13px] text-[#071A2B] outline-none placeholder:text-[#94A3B8] focus:ring-4 focus:ring-white/20"
              />
            </label>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-[#071A2B]">All departments</h2>
            <p className="mt-0.5 text-[12px] text-[#64748B]">
              {search ? `${departments.length} matching department${departments.length === 1 ? '' : 's'}` : `${departments.length} departments to explore`}
            </p>
          </div>
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-[12px] font-bold text-[#1E3A8A] hover:text-[#F97316]">
              Clear search
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-2xl border border-[#E2E8F0] bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white px-5 py-16 text-center">
            <p className="font-bold text-[#071A2B]">Could not load categories</p>
            <p className="mt-2 text-[13px] text-[#64748B]">Please refresh the page to try again.</p>
          </div>
        ) : departments.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white px-5 py-16 text-center">
            <p className="font-bold text-[#071A2B]">No matching categories</p>
            <p className="mt-2 text-[13px] text-[#64748B]">Try a different search term.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {departments.map(({ category, matchesDepartment, visibleCategories }, index) => {
              const Icon = icons[index % icons.length]
              const displayCategories = visibleCategories.slice(0, 5)
              const hasMoreCategories = visibleCategories.length > displayCategories.length

              return (
                <article key={category.id} className="group flex min-h-56 flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-lg">
                  <Link to={getCategoryUrl(categories, category)} className="flex items-center gap-3.5 border-b border-[#F1F5F9] p-4 sm:p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: `${colors[index % colors.length]}12`, color: colors[index % colors.length] }}>
                      {category.image
                        ? <img src={category.image} alt="" className="h-full w-full object-cover" />
                        : <Icon size={22} strokeWidth={1.8} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-extrabold text-[#071A2B] transition-colors group-hover:text-[#1E3A8A]">{category.name}</h3>
                      <p className="mt-1 text-[11px] text-[#64748B]">{category.product_count.toLocaleString()} products</p>
                    </div>
                    <ArrowRight size={17} className="shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#1E3A8A]" />
                  </Link>

                  <div className="flex flex-1 flex-col p-4 sm:px-5">
                    {displayCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {displayCategories.map(item => (
                          <Link
                            key={item.id}
                            to={getCategoryUrl(categories, item)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] font-medium text-[#475569] transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1E3A8A]"
                          >
                            {item.image && <img src={item.image} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />}
                            {item.name}
                          </Link>
                        ))}
                        {hasMoreCategories && !search && (
                          <span className="self-center text-[10px] font-medium text-[#94A3B8]">+{visibleCategories.length - displayCategories.length} more</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#94A3B8]">{matchesDepartment ? 'Explore products in this department.' : 'No matching subcategories.'}</p>
                    )}
                    <Link to={getCategoryUrl(categories, category)} className="mt-auto inline-flex items-center gap-1 pt-4 text-[11px] font-bold text-[#1E3A8A] hover:text-[#F97316]">
                      Browse department <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

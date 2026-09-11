import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ShoppingCart, ShieldCheck, Home, Tag, Settings, Smartphone, Tv, WashingMachine, Shirt, Monitor, Sparkles, ShoppingBag } from 'lucide-react'
import { CART_UPDATED_EVENT, WISHLIST_UPDATED_EVENT, cartApi, wishlistApi, hasAccessToken, LOGO, productsApi, toProduct, type Product, type ApiCategory } from '../lib/api'

const CAT_NAV = [
  { label: 'Phones & Tablets', slug: 'phones-tablets', icon: Smartphone },
  { label: 'Electronics',      slug: 'electronics',    icon: Tv },
  { label: 'Appliances',       slug: 'appliances',     icon: WashingMachine },
  { label: 'Fashion',          slug: 'fashion',        icon: Shirt },
  { label: 'Computing',        slug: 'computing',      icon: Monitor },
  { label: 'Health & Beauty',  slug: 'health-beauty',  icon: Sparkles },
  { label: 'Baby Products',   slug: 'baby-products',  icon: ShoppingBag },
]

type UserInfo = { name: string; email: string; isAdmin: boolean }

function getCachedUser(): UserInfo | null {
  try { return JSON.parse(localStorage.getItem('majo_user') ?? 'null') } catch { return null }
}

export default function Navbar() {
  const [user, setUser] = useState<UserInfo | null>(getCachedUser)
  const [searchOpen, setSearchOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [catResults, setCatResults] = useState<ApiCategory[]>([])
  const [searching, setSearching] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [searchOpen])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); setCatResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const q = query.toLowerCase()
      try {
        const [prodRes, catRes] = await Promise.all([productsApi.list(), productsApi.categories()])
        const rawP = (prodRes.data as any)?.results ?? prodRes.data ?? []
        const allP: Product[] = (Array.isArray(rawP) ? rawP : []).map(toProduct)
        setResults(allP.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20))
        const rawC = catRes.data as any
        const allC: ApiCategory[] = Array.isArray(rawC) ? rawC : (rawC?.results ?? [])
        setCatResults(allC.filter((c: ApiCategory) => c.name.toLowerCase().includes(q)).slice(0, 3))
      } catch { setResults([]); setCatResults([]) }
      finally { setSearching(false) }
    }, 350)
  }, [query])

  useEffect(() => {
    const refreshCartCount = () => cartApi.list().then(items => setCartCount(items.reduce((total, item) => total + item.quantity, 0))).catch(() => setCartCount(0))
    refreshCartCount()
    window.addEventListener(CART_UPDATED_EVENT, refreshCartCount)
    window.addEventListener('storage', refreshCartCount)
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refreshCartCount)
      window.removeEventListener('storage', refreshCartCount)
    }
  }, [])

  useEffect(() => {
    const refreshWishlistCount = () => {
      if (!hasAccessToken()) { setWishlistCount(0); return }
      wishlistApi.list().then(({ data }) => setWishlistCount(data.length)).catch(() => setWishlistCount(0))
    }
    refreshWishlistCount()
    window.addEventListener(WISHLIST_UPDATED_EVENT, refreshWishlistCount)
    window.addEventListener('storage', refreshWishlistCount)
    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, refreshWishlistCount)
      window.removeEventListener('storage', refreshWishlistCount)
    }
  }, [])

  useEffect(() => {
    if (accountOpen) setUser(getCachedUser())
  }, [accountOpen])

  const closeSearch = () => { setSearchOpen(false); setQuery(''); setResults([]); setCatResults([]) }

  const signOut = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('majo_user')
    setUser(null)
    setAccountOpen(false)
    navigate('/')
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E2E8F0]">
        <div className="relative flex items-center px-4 h-14 lg:h-16 gap-2.5">
          {/* Logo */}
          <Link to="/" onClick={closeSearch} className="shrink-0">
            <img src={LOGO} alt="Majo Gadgets" className="h-11 w-auto" />
          </Link>

          {/* Search pill / active */}
          {searchOpen ? (
            <div className="flex-1 lg:flex-none lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:w-[280px] flex items-center bg-[#F8FAFC] border-2 border-[#071A2B] rounded-full px-3 h-10 gap-2 shadow-sm">
              <svg className="w-3.5 h-3.5 text-[#071A2B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => {
                  const value = e.target.value
                  if (!value.trim()) closeSearch()
                  else setQuery(value)
                }}
                onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { navigate(`/shop?q=${query}`); closeSearch() } }}
                placeholder="Search products, categories..."
                className="flex-1 bg-transparent text-sm text-[#071A2B] outline-none placeholder-[#94A3B8]"
              />
              {query
                ? <button onClick={closeSearch} className="p-1"><svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                : <button onClick={closeSearch} className="p-1"><svg className="w-4 h-4 text-[#071A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              }
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex-1 lg:flex-none lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:w-[280px] flex items-center bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-full px-3 h-10 gap-2 text-left transition-[width] duration-200"
            >
              <svg className="w-3.5 h-3.5 text-[#64748B] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <span className="text-sm text-[#94A3B8]">Search products...</span>
            </button>
          )}

          {/* Primary navigation and actions */}
          <div className="ml-auto flex items-center gap-3.5 shrink-0">
            <div className="hidden lg:flex items-center gap-5 mr-2">
              <Link to="/shop" onClick={closeSearch} className="text-[13px] font-bold text-[#071A2B] hover:text-[#1E3A8A] transition-colors">Shop</Link>
              <Link to="/categories" onClick={closeSearch} className="text-[13px] font-bold text-[#071A2B] hover:text-[#1E3A8A] transition-colors">Category</Link>
              <Link to="/deals" onClick={closeSearch} className="text-[13px] font-bold text-[#071A2B] hover:text-[#1E3A8A] transition-colors">Deals</Link>
            </div>
            {/* Admin icon — visible on shop navbar for admins, navigates to admin */}
            {user?.isAdmin && (
              <Link to="/admin" title="Admin Panel" className="w-[34px] h-[34px] rounded-full bg-[#1E3A8A] flex items-center justify-center">
                <ShieldCheck className="w-[18px] h-[18px] text-white" />
              </Link>
            )}
            {/* Account */}
            <button
              onClick={() => setAccountOpen(true)}
              className="w-[34px] h-[34px] rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center"
            >
              <svg className="w-[18px] h-[18px] text-[#071A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </button>
            {/* Notifications */}
            <Link to="/notifications" aria-label="Notifications" title="Notifications" className="relative p-0.5">
              <Bell className="w-[22px] h-[22px] text-[#071A2B]" strokeWidth={2} />
            </Link>
            {/* Wishlist */}
            <Link to="/wishlist" className="relative p-0.5">
              <svg className="w-[21px] h-[21px] text-red-500" fill="none" stroke="#ef4444" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
            {/* Cart */}
            <Link to="/cart" aria-label="Cart" title="Cart" className="relative p-0.5">
              <ShoppingCart className="w-[23px] h-[23px] text-[#071A2B]" strokeWidth={2} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-extrabold flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search dropdown */}
        {searchOpen && (
          <>
            <div className="absolute left-0 right-0 top-full bg-white rounded-b-2xl shadow-xl z-50 max-h-96 overflow-y-auto">
              {searching ? (
                <div className="flex items-center gap-2.5 px-4 py-5 text-sm text-[#64748B]">
                  <svg className="w-4 h-4 animate-spin text-[#1E3A8A]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  Searching…
                </div>
              ) : catResults.length > 0 || results.length > 0 ? (
                <>
                  {catResults.length > 0 && (
                    <div className="pb-1">
                      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                        <svg className="w-3 h-3 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        <span className="text-[10px] font-bold text-[#94A3B8] tracking-widest">CATEGORIES</span>
                      </div>
                      {catResults.map((cat, i) => (
                        <button
                          key={cat.id}
                          onClick={() => { navigate(`/shop?category=${cat.slug}`); closeSearch() }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] ${i < catResults.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
                        >
                          <div className="w-9 h-9 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center overflow-hidden shrink-0">
                            {cat.image ? <img src={cat.image} className="w-full h-full object-cover" /> : <svg className="w-4 h-4 text-[#071A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
                          </div>
                          <span className="flex-1 text-sm font-semibold text-[#071A2B] text-left">{cat.name}</span>
                          <span className="text-xl text-[#94A3B8]">›</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.length > 0 && (
                    <div className="pb-1">
                      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                        <svg className="w-3 h-3 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
                        <span className="text-[10px] font-bold text-[#94A3B8] tracking-widest">PRODUCTS</span>
                      </div>
                      {results.map((p, i) => (
                        <button
                          key={p.id}
                          onClick={() => { navigate(`/shop/${p.slug}`); closeSearch() }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] ${i < results.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
                        >
                          {p.image
                            ? <img src={p.image} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                            : <div className="w-11 h-11 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0"><svg className="w-3.5 h-3.5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg></div>
                          }
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[13px] font-bold text-[#071A2B] truncate">{p.name}</p>
                            <p className="text-[11px] text-[#94A3B8] capitalize truncate">{p.categoryName}{p.rating > 0 ? `  ·  ⭐ ${p.rating.toFixed(1)}` : ''}</p>
                          </div>
                          <span className="text-xs font-bold text-[#1E3A8A] shrink-0">UGX {p.price.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : query.trim() ? (
                <div className="flex flex-col items-center py-7 gap-2">
                  <svg className="w-7 h-7 text-[#E2E8F0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
                  <span className="text-sm text-[#64748B]">No results for "{query}"</span>
                </div>
              ) : null}
            </div>
          </>
        )}
        {/* Category bar — mobile + desktop */}
        <div className="flex items-center border-t border-[#E2E8F0] overflow-x-auto scrollbar-none">
          <div className="flex items-center lg:justify-between max-w-7xl mx-auto w-full px-2 lg:px-4 gap-0">
            {CAT_NAV.map(({ label, slug, icon: Icon }) => (
              <Link
                key={slug}
                to={`/shop?category=${slug}`}
                onClick={closeSearch}
                className="flex flex-col lg:flex-row items-center gap-1 lg:gap-1.5 px-3 lg:px-3.5 py-2 lg:py-2.5 text-[10px] lg:text-[12.5px] font-semibold text-[#071A2B] hover:text-[#1E3A8A] hover:bg-[#F0F4FF] whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-[#1E3A8A] shrink-0"
              >
                <Icon size={14} strokeWidth={2} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Account drawer */}
      {accountOpen && (
        <div className="fixed inset-0 z-[200] flex">
          <div className="absolute inset-0 bg-[#0F172A]/35" onClick={() => setAccountOpen(false)} />
          <div className="ml-auto w-[min(75%,320px)] h-full bg-white shadow-2xl flex flex-col px-5 pt-16 relative z-10">
            <div className="flex items-center justify-between pb-5 border-b border-[#E2E8F0]">
              <span className="text-2xl font-extrabold text-[#071A2B]">My Account</span>
              <button onClick={() => setAccountOpen(false)}>
                <svg className="w-5 h-5 text-[#071A2B]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2 py-6 border-b border-[#E2E8F0]">
              <div className="w-[52px] h-[52px] rounded-full bg-[#1E3A8A] flex items-center justify-center shrink-0">
                <span className="text-white text-lg font-extrabold">{user ? user.name.slice(0, 2).toUpperCase() : 'UN'}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#071A2B]">{user ? user.name : 'Guest'}</p>
                <p className="text-xs text-[#64748B] mt-1">{user ? user.email : 'Not signed in'}</p>
              </div>
            </div>
            <div className="border-b border-[#E2E8F0] py-2">
              {user && (
                <Link to="/account" onClick={() => setAccountOpen(false)} className="w-full flex items-center justify-between py-3.5 text-[15px] font-semibold text-[#071A2B]">
                  My Account<span className="text-2xl text-[#64748B] leading-none">›</span>
                </Link>
              )}
              <Link to="/orders" onClick={() => setAccountOpen(false)} className="w-full flex items-center justify-between py-3.5 text-[15px] font-semibold text-[#071A2B]">
                My Orders<span className="text-2xl text-[#64748B] leading-none">›</span>
              </Link>
              <Link to="/wishlist" onClick={() => setAccountOpen(false)} className="w-full flex items-center justify-between py-3.5 text-[15px] font-semibold text-[#071A2B]">
                Wishlist<span className="text-2xl text-[#64748B] leading-none">›</span>
              </Link>
            </div>
            {user ? (
              <button onClick={signOut} className="mt-6 bg-red-500 text-white text-[15px] font-bold py-3.5 rounded-[10px] text-center block w-full">Sign Out</button>
            ) : (
              <>
                <Link to="/login" onClick={() => setAccountOpen(false)} className="mt-6 bg-[#1E3A8A] text-white text-[15px] font-bold py-3.5 rounded-[10px] text-center block">Sign In</Link>
                <Link to="/register" onClick={() => setAccountOpen(false)} className="mt-3 border border-[#E2E8F0] text-[#071A2B] text-[15px] font-bold py-3.5 rounded-[10px] text-center block">Create Account</Link>
              </>
            )}
          </div>
        </div>
      )}
      {/* Bottom navbar — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-[#E2E8F0] flex items-center justify-between px-6 lg:hidden">
        <Link to="/" className="flex flex-col items-center gap-1 text-[#64748B]">
          <Home size={20} />
          <span className="text-[10px] font-semibold">Home</span>
        </Link>
        <Link to="/categories" className="flex flex-col items-center gap-1 text-[#64748B]">
          <Tag size={20} />
          <span className="text-[10px] font-semibold">Categories</span>
        </Link>
        <Link to="/notifications" className="flex flex-col items-center gap-1 text-[#64748B]">
          <Bell size={20} />
          <span className="text-[10px] font-semibold">Notifications</span>
        </Link>
        <button onClick={() => setAccountOpen(true)} className="flex flex-col items-center gap-1 text-[#64748B]">
          <Settings size={20} />
          <span className="text-[10px] font-semibold">Settings</span>
        </button>
      </nav>
    </>
  )
}

import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const LOGO = 'https://res.cloudinary.com/d5qqtsou/image/upload/v1788691351/Majo_Gadgets_logo_an2hbc.png'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'ngrok-skip-browser-warning': 'true' },
})

const API_CACHE_TTL = 3 * 60 * 1000
const apiCache = new Map<string, { expiresAt: number; data: unknown }>()
const apiRequests = new Map<string, Promise<unknown>>()

function cachedRequest<T>(key: string, request: () => Promise<{ data: T }>): Promise<{ data: T }> {
  const now = Date.now()
  const memoryEntry = apiCache.get(key)
  if (memoryEntry && memoryEntry.expiresAt > now) return Promise.resolve({ data: memoryEntry.data as T })

  try {
    const stored = localStorage.getItem(`majo_api_cache:${key}`)
    if (stored) {
      const parsed = JSON.parse(stored) as { expiresAt: number; data: T }
      if (parsed.expiresAt > now) {
        apiCache.set(key, parsed)
        return Promise.resolve({ data: parsed.data })
      }
      localStorage.removeItem(`majo_api_cache:${key}`)
    }
  } catch { /* Ignore unavailable or malformed browser storage. */ }

  const pending = apiRequests.get(key) as Promise<{ data: T }> | undefined
  if (pending) return pending

  const requestPromise = request().then(response => {
    const entry = { expiresAt: Date.now() + API_CACHE_TTL, data: response.data }
    apiCache.set(key, entry)
    try { localStorage.setItem(`majo_api_cache:${key}`, JSON.stringify(entry)) } catch { /* Storage is optional. */ }
    return { data: response.data }
  }).finally(() => apiRequests.delete(key))

  apiRequests.set(key, requestPromise)
  return requestPromise
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err?.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post<{ access: string }>(`${BASE_URL}/api/auth/token/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          // refresh failed — fall through to logout
        }
      }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (window.location.pathname.startsWith('/admin')) {
        window.location.replace('/login')
      }
    }
    return Promise.reject(err)
  }
)

export type ApiProduct = {
  id: number
  slug: string
  name: string
  price: string
  original_price: string | null
  image: string | null
  rating: string
  reviews_count: number
  stock: number
  delivery_fee: string
  short_description: string
  long_description: string
  is_featured: boolean
  images: { id: number; url: string; order: number }[]
  category: { id: number; name: string; slug: string }
}

export type ApiCategory = { id: number; name: string; slug: string; image: string | null }

export type Product = {
  id: number
  slug: string
  name: string
  price: number
  originalPrice?: number
  image?: string
  images: { id: number; url: string; order: number }[]
  rating: number
  reviewsCount: number
  stock: number
  deliveryFee: number
  shortDescription: string
  longDescription: string
  category: string
  categoryName: string
}

const DEFAULT_PRODUCT_DESCRIPTION = 'A quality product from Majo Gadgets, selected for reliable everyday use and great value.'
const DEFAULT_LONG_DESCRIPTION = 'This product is carefully selected by Majo Gadgets for dependable quality, practical everyday use, and excellent value. Product availability and delivery details are shown above.'

function unescapeHtml(str: string): string {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

export const toProduct = (p: ApiProduct): Product => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  price: Number(p.price),
  originalPrice: p.original_price ? Number(p.original_price) : undefined,
  image: p.image ?? undefined,
  images: p.images ?? [],
  rating: Number(p.rating),
  reviewsCount: p.reviews_count ?? 0,
  stock: p.stock ?? 0,
  deliveryFee: Number(p.delivery_fee ?? 0),
  shortDescription: p.short_description?.trim() || DEFAULT_PRODUCT_DESCRIPTION,
  longDescription: unescapeHtml(p.long_description?.trim() || DEFAULT_LONG_DESCRIPTION),
  category: p.category?.slug ?? '',
  categoryName: p.category?.name ?? '',
})

export type ApiFlashSale = {
  id: number
  product: ApiProduct
  flash_price: string
  ends_at: string
  stock_limit: number
  stock_sold: number
  stock_left: number
  is_active: boolean
  is_expired: boolean
  discount_pct: number
}

export type FlashSale = {
  id: number
  product: Product
  flashPrice: number
  endsAt: Date
  stockLeft: number
  stockLimit: number
  discountPct: number
}

export const toFlashSale = (f: ApiFlashSale): FlashSale => ({
  id: f.id,
  product: toProduct(f.product),
  flashPrice: Number(f.flash_price),
  endsAt: new Date(f.ends_at),
  stockLeft: f.stock_left,
  stockLimit: f.stock_limit,
  discountPct: f.discount_pct,
})

export type ApiReview = {
  id: number
  user_name: string
  user_avatar: string | null
  overall_rating: number
  review_text: string
  verified_purchase: boolean
  images: { id: number; url: string }[]
  created_at: string
}

export type CartItem = {
  id: number
  product_id: number
  product_name: string
  product_price: string
  product_image: string | null
  product_slug: string
  product_category: string
  product_rating: string
  quantity: number
  added_at: string
}

export type ApiOrder = {
  id: number
  code: string
  status: string
  subtotal: string
  delivery_fee: string
  total: string
  items: unknown[]
  delivery_address: string
  phone: string
  note: string
  created_at: string
}

const GUEST_CART_KEY = 'majo_guest_cart'
export const CART_UPDATED_EVENT = 'majo-cart-updated'
export const WISHLIST_UPDATED_EVENT = 'majo-wishlist-updated'
export const hasAccessToken = () => Boolean(localStorage.getItem('access_token'))
export const notifyCartUpdated = () => window.dispatchEvent(new Event(CART_UPDATED_EVENT))
export const notifyWishlistUpdated = () => window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT))

const getGuestCart = (): CartItem[] => {
  try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '[]') as CartItem[] }
  catch { return [] }
}

const saveGuestCart = (items: CartItem[]) => localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))

export const productsApi = {
  list: (params?: string) => cachedRequest(`products:list:${params ?? ''}`, () => api.get<{ results: ApiProduct[] }>(`/api/products/${params ? '?' + params : ''}`)),
  bySlug: (slug: string) => cachedRequest(`products:slug:${slug}`, () => api.get<ApiProduct>(`/api/products/${slug}/`)),
  byCategory: (categorySlug: string) => cachedRequest(`products:category:${categorySlug}`, () => api.get<{ results: ApiProduct[] }>(`/api/products/?category=${categorySlug}`)),
  categories: () => cachedRequest('products:categories:v2', () => api.get<ApiCategory[]>('/api/products/categories/')),
  flashSales: () => cachedRequest('products:flash-sales', () => api.get<ApiFlashSale[]>('/api/products/flash-sales/?active=1')),
  reviews: (slug: string) => api.get<ApiReview[]>(`/api/products/${slug}/reviews/`),
  ratingSummary: (slug: string) => api.get<{ average: number; total: number; breakdown: Record<string, number>; with_photos: number }>(`/api/products/${slug}/reviews/summary/`),
  shareUrl: (slug: string) => `${BASE_URL}/api/products/share/products/${slug}/`,
}

export const authApi = {
  login: (email: string, password: string) => api.post<{ access: string; refresh: string }>('/api/auth/login/', { email, password }),
  register: (payload: { name: string; email: string; phone: string; password: string; country: string; region: string; district: string; village: string }) => api.post<{ access: string; refresh: string }>('/api/auth/register/', payload),
  profile: () => api.get<{ id: number; email: string; name: string; phone: string; region: string; district: string; village: string; is_staff: boolean; is_superuser: boolean }>('/api/auth/profile/'),
  saveTokens: (access: string, refresh: string) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  },
  saveProfile: (name: string, email: string, isAdmin = false, extra?: { phone?: string; region?: string; district?: string; village?: string }) => {
    localStorage.setItem('majo_user', JSON.stringify({ name, email, isAdmin, ...extra }))
  },
}

export type WishlistItem = {
  id: number
  product_id: number
  product_name: string
  product_price: string
  product_image: string | null
  product_slug: string
  product_category: string
  product_rating: string
  added_at: string
}

export const wishlistApi = {
  list: () => api.get<WishlistItem[]>('/api/auth/wishlist/'),
  add: (product: Product) => api.post('/api/auth/wishlist/', {
    product_id: product.id,
    product_name: product.name,
    product_price: product.price,
    product_image: product.image ?? null,
    product_slug: product.slug,
    product_category: product.category,
    product_rating: product.rating,
  }),
  remove: (productId: number) => api.delete(`/api/auth/wishlist/${productId}/`),
}

export const cartApi = {
  list: async () => hasAccessToken()
    ? (await api.get<CartItem[]>('/api/auth/cart/')).data
    : getGuestCart(),
  add: async (product: Product, quantity: number) => {
    if (hasAccessToken()) {
      const response = await api.post<CartItem>('/api/auth/cart/', {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_image: product.image ?? null,
        product_slug: product.slug,
        product_category: product.category,
        product_rating: product.rating,
        quantity,
      })
      notifyCartUpdated()
      return response.data
    }

    const items = getGuestCart()
    const existing = items.find(item => item.product_id === product.id)
    if (existing) existing.quantity += quantity
    else items.push({
      id: product.id,
      product_id: product.id,
      product_name: product.name,
      product_price: String(product.price),
      product_image: product.image ?? null,
      product_slug: product.slug,
      product_category: product.category,
      product_rating: String(product.rating),
      quantity,
      added_at: new Date().toISOString(),
    })
    saveGuestCart(items)
    const item = existing ?? items[items.length - 1]
    notifyCartUpdated()
    return item
  },
  update: async (productId: number, quantity: number) => {
    if (hasAccessToken()) {
      const response = await api.patch<CartItem>(`/api/auth/cart/${productId}/`, { quantity })
      notifyCartUpdated()
      return response.data
    }
    const items = getGuestCart().map(item => item.product_id === productId ? { ...item, quantity } : item)
    saveGuestCart(items)
    notifyCartUpdated()
    return items.find(item => item.product_id === productId)
  },
  remove: async (productId: number) => {
    if (hasAccessToken()) {
      await api.delete(`/api/auth/cart/${productId}/`)
      notifyCartUpdated()
      return
    }
    saveGuestCart(getGuestCart().filter(item => item.product_id !== productId))
    notifyCartUpdated()
  },
}

export type ApiOrderDetail = {
  id: number
  code: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: string
  delivery_fee: string
  total: string
  delivery_address: string
  phone: string
  note: string
  cancel_reason: string
  has_service_rating: boolean
  items: { id: number; product: ApiProduct; quantity: number; price: string }[]
  created_at: string
  updated_at: string
}

export const ordersApi = {
  create: (payload: { delivery_address: string; phone: string; note: string; guest_name: string; delivery_fee?: number; items: { product_id: number; quantity: number }[] }) => api.post<ApiOrder>('/api/orders/', payload),
  list: () => api.get<ApiOrderDetail[]>('/api/orders/'),
  get: (code: string) => api.get<ApiOrderDetail>(`/api/orders/${code}/`),
  cancel: (code: string) => api.post<ApiOrderDetail>(`/api/orders/${code}/cancel/`),
  rate: (code: string, payload: { overall: number; areas: string[]; area_ratings: Record<string, number>; comment: string }) =>
    api.post(`/api/orders/${code}/rate/`, payload),
}

export type ApiAdminOrder = {
  id: number
  code: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  subtotal: string
  delivery_fee: string
  total: string
  created_at: string
  updated_at: string
  delivery_address: string
  phone: string
  note: string
  cancel_reason: string
  items: { id: number; product: ApiProduct; quantity: number; price: string }[]
}

export type ApiAdminUser = {
  id: number
  name: string
  email: string
  phone: string
  avatar: string | null
  is_staff: boolean
  created_at: string
}

export type ApiPayment = {
  id: number
  order_code: string | null
  pesapal_order_tracking_id: string
  merchant_reference: string
  amount: string
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'invalid'
  payment_method: string
  created_at: string
}

export type ApiFlashSaleItem = {
  id: number
  product: ApiProduct
  flash_price: string
  ends_at: string
  stock_limit: number
  stock_sold: number
  stock_left: number
  is_active: boolean
  is_expired: boolean
  discount_pct: number
}

export const adminProductsApi = {
  list: () => api.get<{ results: ApiProduct[] } | ApiProduct[]>('/api/products/'),
  listAll: async (): Promise<ApiProduct[]> => {
    let url = '/api/products/'
    const all: ApiProduct[] = []
    while (url) {
      const { data } = await api.get<any>(url)
      const results: ApiProduct[] = Array.isArray(data) ? data : (data?.results ?? [])
      all.push(...results)
      const next: string | null = data?.next ?? null
      if (!next) break
      url = next.replace(/^https?:\/\/[^/]+/, '')
    }
    return all
  },
  get: (id: number) => api.get<ApiProduct>(`/api/products/${id}/`),
  create: (data: FormData) => api.post<ApiProduct>('/api/products/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: FormData) => api.patch<ApiProduct>(`/api/products/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: number) => api.delete(`/api/products/${id}/`),
  categories: () => api.get<ApiCategory[]>('/api/products/categories/'),
  createCategory: (data: FormData) => api.post<ApiCategory>('/api/products/categories/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateCategory: (id: number, data: FormData) => api.patch<ApiCategory>(`/api/products/categories/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteCategory: (id: number) => api.delete(`/api/products/categories/${id}/`),
}

export const adminFlashSalesApi = {
  list: () => api.get<ApiFlashSaleItem[]>('/api/products/flash-sales/'),
  create: (data: object) => api.post<ApiFlashSaleItem>('/api/products/flash-sales/', data),
  update: (id: number, data: object) => api.patch<ApiFlashSaleItem>(`/api/products/flash-sales/${id}/`, data),
  delete: (id: number) => api.delete(`/api/products/flash-sales/${id}/`),
}

export const adminOrdersApi = {
  list: (status?: string) => api.get<ApiAdminOrder[]>(`/api/orders/admin/${status ? `?status=${status}` : ''}`),
  get: (code: string) => api.get<ApiAdminOrder>(`/api/orders/admin/${code}/`),
  confirm: (code: string) => api.post<ApiAdminOrder>(`/api/orders/admin/${code}/confirm/`),
  ship: (code: string) => api.post<ApiAdminOrder>(`/api/orders/admin/${code}/ship/`),
  deliver: (code: string) => api.post<ApiAdminOrder>(`/api/orders/admin/${code}/deliver/`),
  cancel: (code: string, reason: string) => api.post<ApiAdminOrder>(`/api/orders/admin/${code}/cancel/`, { reason }),
}

export const adminUsersApi = {
  list: () => api.get<ApiAdminUser[]>('/api/auth/admin/users/'),
}

export const adminPaymentsApi = {
  list: () => api.get<ApiPayment[]>('/api/orders/admin/payments/'),
}

export type ApiNotification = {
  id: number
  type: 'order' | 'welcome' | 'promo' | 'system' | 'service_rating' | 'product_rating'
  title: string
  body: string
  read: boolean
  created_at: string
}

export const notificationsApi = {
  list: () => api.get<ApiNotification[]>('/api/auth/notifications/'),
  markRead: (id: number) => api.patch(`/api/auth/notifications/${id}/`, {}),
  markAllRead: () => api.post('/api/auth/notifications/mark-all-read/', {}),
  delete: (id: number) => api.delete(`/api/auth/notifications/${id}/`),
}

export const isAdmin = () => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) return false
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.is_staff === true
  } catch { return false }
}

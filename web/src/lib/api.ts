import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const LOGO = 'https://res.cloudinary.com/d5qqtsou/image/upload/v1788691351/Majo_Gadgets_logo_an2hbc.png'

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? 'fhklnn0f'
export const cloudinaryUrl = (publicId: string | null | undefined) =>
  publicId && !publicId.startsWith('http')
    ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/${publicId}`
    : publicId ?? null

export const cloudinaryImageUrl = (url: string | null | undefined, width: number) => {
  if (!url) return null
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`)
}

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
      // Only redirect if the user had a token (was authenticated). Guests get no redirect.
      const hadToken = !!localStorage.getItem('access_token')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (hadToken) {
        const { pathname } = window.location
        const onAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')
        if (!onAuthPage) {
          window.location.replace(pathname.startsWith('/admin') ? '/login' : `/login?next=${encodeURIComponent(pathname + window.location.search)}`)
        }
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
  list: (params?: string) => cachedRequest(`products:list:${params ?? ''}`, () => api.get<{ results: ApiProduct[]; next: string | null }>(`/api/products/${params ? '?' + params : ''}`)),
  bySlug: (slug: string) => cachedRequest(`products:slug:${slug}`, () => api.get<ApiProduct>(`/api/products/${slug}/`)),
  byCategory: (categorySlug: string) => cachedRequest(`products:category:${categorySlug}`, () => api.get<{ results: ApiProduct[] }>(`/api/products/?category=${categorySlug}`)),
  categories: () => cachedRequest('products:categories:v2', () => api.get<ApiCategory[]>('/api/products/categories/')),
  flashSales: () => cachedRequest('products:flash-sales', () => api.get<ApiFlashSale[]>('/api/products/flash-sales/?active=1')),
  reviews: (slug: string) => api.get<ApiReview[]>(`/api/products/${slug}/reviews/`),
  ratingSummary: (slug: string) => api.get<{ average: number; total: number; breakdown: Record<string, number>; with_photos: number }>(`/api/products/${slug}/reviews/summary/`),
  checkEligibility: (slug: string) => api.get<{ eligible: boolean; reason?: string; order_id?: number; order_item_id?: number; order_code?: string; existing_review_id?: number | null }>(`/api/products/${slug}/reviews/eligibility/`),
  submitReview: (slug: string, data: FormData) => api.post(`/api/products/${slug}/reviews/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  shareUrl: (slug: string) => `https://www.majogadgets.com/shop/${slug}`,
}

export const authApi = {
  login: (email: string, password: string) => api.post<{ access: string; refresh: string }>('/api/auth/login/', { email, password }),
  googleLogin: (credential: string) => api.post<{ access: string; refresh: string } | { needs_profile: true; tmp_token: string; name: string; email: string }>('/api/auth/login/google/', { credential }),
  completeGoogleProfile: (tmp_token: string, payload: { phone: string; region: string; district: string; village: string }) =>
    api.post<{ access: string; refresh: string }>('/api/auth/login/google/complete/', { tmp_token, ...payload }),
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
  status: 'pending' | 'processing' | 'shipped' | 'ready_for_pickup' | 'delivered' | 'cancelled'
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

export type ReturnRequest = {
  id: number
  order_code: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string
  created_at: string
  updated_at: string
}

export const ordersApi = {
  create: (payload: { delivery_address: string; phone: string; note: string; guest_name: string; delivery_fee?: number; items: { product_id: number; quantity: number }[] }) => api.post<ApiOrder>('/api/orders/', payload),
  list: () => api.get<ApiOrderDetail[]>('/api/orders/'),
  get: (code: string) => api.get<ApiOrderDetail>(`/api/orders/${code}/`),
  cancel: (code: string) => api.post<ApiOrderDetail>(`/api/orders/${code}/cancel/`),
  pay: (code: string) => api.post<{ redirect_url: string; order_tracking_id: string }>(`/api/orders/${code}/pay/`),
  rate: (code: string, payload: { overall: number; areas: string[]; area_ratings: Record<string, number>; comment: string }) =>
    api.post(`/api/orders/${code}/rate/`, payload),
  submitReturn: (code: string, reason: string) => api.post<ReturnRequest>(`/api/orders/${code}/return/`, { reason }),
  getReturn: (code: string) => api.get<ReturnRequest | null>(`/api/orders/${code}/return/`),
  listReturns: () => api.get<ReturnRequest[]>('/api/orders/returns/'),
}

export type ApiAdminOrder = {
  id: number
  code: string
  status: 'pending' | 'processing' | 'shipped' | 'ready_for_pickup' | 'delivered' | 'cancelled'
  subtotal: string
  delivery_fee: string
  total: string
  created_at: string
  updated_at: string
  delivery_address: string
  phone: string
  note: string
  cancel_reason: string
  user_name: string
  user_email: string
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
  readyForPickup: (code: string) => api.post<ApiAdminOrder>(`/api/orders/admin/${code}/ready-for-pickup/`),
  deliver: (code: string) => api.post<ApiAdminOrder>(`/api/orders/admin/${code}/deliver/`),
  cancel: (code: string, reason: string) => api.post<ApiAdminOrder>(`/api/orders/admin/${code}/cancel/`, { reason }),
}

export const adminUsersApi = {
  list: () => api.get<ApiAdminUser[]>('/api/auth/admin/users/'),
  delete: (id: number) => api.delete(`/api/auth/admin/users/${id}/`),
}

export const adminPaymentsApi = {
  list: () => api.get<ApiPayment[]>('/api/orders/admin/payments/'),
}

export type ApiInventorySummary = {
  total: number
  in_stock: number
  low_stock: number
  out_of_stock: number
  low_stock_items: { id: number; name: string; stock: number }[]
  out_of_stock_items: { id: number; name: string; stock: number }[]
}

export type ApiStockMovement = {
  id: number
  product: number
  product_name: string
  type: 'in' | 'out' | 'adjust' | 'return'
  quantity: number
  note: string
  created_by_name: string | null
  created_at: string
}

export const inventoryApi = {
  summary: () => api.get<ApiInventorySummary>('/api/inventory/summary/'),
  movements: (productId?: number) => api.get<ApiStockMovement[]>(`/api/inventory/movements/${productId ? `?product=${productId}` : ''}`),
  addMovement: (data: { product: number; type: string; quantity: number; note?: string }) =>
    api.post<ApiStockMovement>('/api/inventory/movements/', data),
}

export type ApiAccountingDashboard = {
  total_revenue: number; cogs: number; gross_profit: number
  total_expenses: number; net_profit: number
  gross_margin: number; net_margin: number
  cash_bank: number; inventory_cost: number; inventory_sales_value: number
  receivables: number; payables: number
  today_revenue: number; today_expenses: number; today_orders: number; today_refunds: number
  accounts: { name: string; type: string; balance: number; currency: string }[]
  monthly: { month: string; revenue: number; count: number }[]
}
export type ApiSupplier = { id: number; name: string; contact_name: string; email: string; phone: string; country: string; address: string; payment_terms: string; notes: string; created_at: string }
export type ApiPurchase = { id: number; supplier: number; supplier_name: string; product: number; product_name: string; purchase_date: string; quantity: number; unit_cost: string; shipping_cost: string; customs_cost: string; other_cost: string; amount_paid: string; landed_cost: string; outstanding: string; status: string; invoice_ref: string; notes: string }
export type ApiExpenseCategory = { id: number; name: string; group: string }
export type ApiExpense = { id: number; date: string; category: number; category_name: string; category_group: string; description: string; amount: string; payment_method: string; vendor: string; receipt_url: string; approved_by_name: string | null; notes: string; created_at: string }
export type ApiAccount = { id: number; name: string; type: string; balance: string; currency: string; notes: string }
export type ApiTransfer = { id: number; from_account: number; from_account_name: string; to_account: number; to_account_name: string; amount: string; date: string; notes: string }
export type ApiReceivable = { id: number; customer_name: string; customer_email: string; invoice_ref: string; amount: string; amount_paid: string; balance: string; due_date: string; status: string; notes: string }
export type ApiPayable = { id: number; supplier: number; supplier_name: string; invoice_ref: string; amount: string; amount_paid: string; balance: string; due_date: string; status: string; notes: string }
export type ApiTaxRecord = { id: number; tax_type: string; period_start: string; period_end: string; taxable_amount: string; tax_amount: string; status: string; notes: string }
export type ApiRefund = { id: number; order: number | null; order_code: string | null; customer_name: string; product_name: string; return_reason: string; product_condition: string; refund_amount: string; refund_method: string; restock: boolean; return_delivery_cost: string; status: string; created_at: string }
export type ApiEmployee = { id: number; name: string; email: string; phone: string; role: string; salary: string; commission_pct: string; is_active: boolean; joined_at: string | null }
export type ApiFixedAsset = { id: number; name: string; purchase_price: string; purchase_date: string; useful_life_years: number; location: string; disposal_date: string | null; disposal_value: string | null; annual_depreciation: string; notes: string }
export type ApiAuditLog = { id: number; user_name: string | null; action: string; model_name: string; object_id: string; old_value: any; new_value: any; reason: string; created_at: string }

export const accountingApi = {
  dashboard: () => api.get<ApiAccountingDashboard>('/api/accounting/dashboard/'),
  suppliers: () => api.get<ApiSupplier[]>('/api/accounting/suppliers/'),
  createSupplier: (d: Partial<ApiSupplier>) => api.post<ApiSupplier>('/api/accounting/suppliers/', d),
  purchases: () => api.get<ApiPurchase[]>('/api/accounting/purchases/'),
  createPurchase: (d: object) => api.post<ApiPurchase>('/api/accounting/purchases/', d),
  expenseCategories: () => api.get<ApiExpenseCategory[]>('/api/accounting/expense-categories/'),
  createExpenseCategory: (d: object) => api.post<ApiExpenseCategory>('/api/accounting/expense-categories/', d),
  expenses: (group?: string) => api.get<ApiExpense[]>(`/api/accounting/expenses/${group ? `?group=${group}` : ''}`),
  createExpense: (d: object) => api.post<ApiExpense>('/api/accounting/expenses/', d),
  accounts: () => api.get<ApiAccount[]>('/api/accounting/accounts/'),
  createAccount: (d: object) => api.post<ApiAccount>('/api/accounting/accounts/', d),
  updateAccount: (id: number, d: object) => api.patch<ApiAccount>(`/api/accounting/accounts/${id}/`, d),
  transfers: () => api.get<ApiTransfer[]>('/api/accounting/transfers/'),
  createTransfer: (d: object) => api.post<ApiTransfer>('/api/accounting/transfers/', d),
  receivables: () => api.get<ApiReceivable[]>('/api/accounting/receivables/'),
  createReceivable: (d: object) => api.post<ApiReceivable>('/api/accounting/receivables/', d),
  payables: () => api.get<ApiPayable[]>('/api/accounting/payables/'),
  createPayable: (d: object) => api.post<ApiPayable>('/api/accounting/payables/', d),
  taxes: () => api.get<ApiTaxRecord[]>('/api/accounting/taxes/'),
  createTax: (d: object) => api.post<ApiTaxRecord>('/api/accounting/taxes/', d),
  refunds: () => api.get<ApiRefund[]>('/api/accounting/refunds/'),
  createRefund: (d: object) => api.post<ApiRefund>('/api/accounting/refunds/', d),
  updateRefund: (id: number, d: object) => api.patch<ApiRefund>(`/api/accounting/refunds/${id}/`, d),
  employees: () => api.get<ApiEmployee[]>('/api/accounting/employees/'),
  createEmployee: (d: object) => api.post<ApiEmployee>('/api/accounting/employees/', d),
  assets: () => api.get<ApiFixedAsset[]>('/api/accounting/assets/'),
  createAsset: (d: object) => api.post<ApiFixedAsset>('/api/accounting/assets/', d),
  auditLog: () => api.get<ApiAuditLog[]>('/api/accounting/audit/'),
}

export const dataApi = {
  exportUrl: (type: 'products' | 'orders' | 'users', format: 'csv' | 'json') =>
    `${BASE_URL}/api/orders/export/${type}/?format=${format}`,
  import: (type: 'products' | 'categories', file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ created: number; skipped?: number; errors: string[] }>(
      `/api/orders/import/${type}/`, form, { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
  clearOrders: (password: string) => api.post<{ deleted: number }>('/api/orders/danger/clear-orders/', { password }),
  resetInventory: (password: string) => api.post<{ products_reset: number; movements_deleted: number }>('/api/orders/danger/reset-inventory/', { password }),
}

export type ApiTraderApplication = {
  id: number
  full_name: string
  email: string
  phone: string
  national_id: string
  business_name: string
  business_type: string
  business_reg_no: string
  tin: string
  location: string
  district: string
  website: string
  product_categories: string
  monthly_volume: string
  experience: string
  agreed_to_terms: boolean
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string
  reviewed_by_name: string | null
  reviewed_at: string | null
  created_at: string
}

export type ApiTraderDashboard = {
  total_revenue: number
  total_expenses: number
  net_profit: number
  today_revenue: number
  today_orders: number
  total_products: number
  active_products: number
  total_sales: number
}

export type ApiTraderProduct = {
  id: number
  uuid: string
  name: string
  short_description: string
  long_description: string
  description: string
  price: string
  original_price: string | null
  delivery_fee: string
  stock: number
  category_id: number | null
  category_name: string | null
  image_url: string | null
  is_active: boolean
  is_featured: boolean
  is_new_deal: boolean
  created_at: string
  updated_at: string
}

export type ApiTraderSale = {
  id: number
  uuid: string
  product: number | null
  product_name: string
  quantity: number
  unit_price: string
  total: string
  customer_name: string
  note: string
  created_at: string
}

export type ApiTraderExpense = {
  id: number
  uuid: string
  description: string
  amount: string
  date: string
  note: string
  created_at: string
}

export type ApiTraderOrderItem = {
  id: number
  order_item_id: number
  order_code: string
  order_id: number
  order_status: string
  order_created_at: string
  delivery_address: string
  product_name: string
  product_image: string | null
  quantity: number
  price: string
  status: 'pending' | 'preparing' | 'ready'
  note: string
  status_changed_by_name: string | null
  updated_at: string
}

export type ApiTraderInventoryItem = {
  id: number
  product: number
  product_uuid: string
  product_name: string
  product_image: string | null
  product_price: string
  product_stock: number
  quantity: number
  cost_price: string
  location: string
  note: string
  updated_at: string
  created_at: string
}

export const tradersApi = {
  apply: (data: object) => api.post<ApiTraderApplication>('/api/traders/apply/', data),
  me: () => api.get<{ id: number; uuid: string; business_name: string; status: 'pending' | 'approved' | 'rejected'; email: string; full_name: string } | null>('/api/traders/me/').catch(() => ({ data: null })),
  adminList: (status?: string) => api.get<ApiTraderApplication[]>(`/api/traders/admin/${status ? `?status=${status}` : ''}`),
  adminGet: (id: number) => api.get<ApiTraderApplication>(`/api/traders/admin/${id}/`),
  approve: (id: number, note?: string) => api.post<ApiTraderApplication>(`/api/traders/admin/${id}/approve/`, { admin_note: note ?? '' }),
  reject: (id: number, note: string) => api.post<ApiTraderApplication>(`/api/traders/admin/${id}/reject/`, { admin_note: note }),
  // Trader portal
  profile: (uuid: string) => api.get<ApiTraderApplication>(`/api/traders/${uuid}/profile/`),
  dashboard: (uuid: string) => api.get<ApiTraderDashboard>(`/api/traders/${uuid}/dashboard/`),
  products: (uuid: string) => api.get<ApiTraderProduct[]>(`/api/traders/${uuid}/products/`),
  createProduct: (uuid: string, data: FormData) => api.post<ApiTraderProduct>(`/api/traders/${uuid}/products/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateProduct: (uuid: string, productUuid: string, data: FormData) => api.patch<ApiTraderProduct>(`/api/traders/${uuid}/products/${productUuid}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteProduct: (uuid: string, productUuid: string) => api.delete(`/api/traders/${uuid}/products/${productUuid}/`),
  sales: (uuid: string) => api.get<ApiTraderSale[]>(`/api/traders/${uuid}/sales/`),
  createSale: (uuid: string, data: object) => api.post<ApiTraderSale>(`/api/traders/${uuid}/sales/`, data),
  expenses: (uuid: string) => api.get<ApiTraderExpense[]>(`/api/traders/${uuid}/expenses/`),
  createExpense: (uuid: string, data: object) => api.post<ApiTraderExpense>(`/api/traders/${uuid}/expenses/`, data),
  orders: (uuid: string, status?: string) => api.get<ApiTraderOrderItem[]>(`/api/traders/${uuid}/orders/${status ? `?status=${status}` : ''}`),
  updateOrderItem: (uuid: string, id: number, data: { status: string; note?: string }) => api.patch<ApiTraderOrderItem>(`/api/traders/${uuid}/orders/${id}/`, data),
  account: (uuid: string) => api.get<ApiTraderApplication & { logo_url: string | null; bio: string; is_visible: boolean; is_closed: boolean }>(`/api/traders/${uuid}/account/`),
  updateAccount: (uuid: string, data: FormData) => api.patch<ApiTraderApplication & { logo_url: string | null; bio: string; is_visible: boolean; is_closed: boolean }>(`/api/traders/${uuid}/account/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteShop: (uuid: string) => api.delete(`/api/traders/${uuid}/account/`, { data: { confirm: 'DELETE' } }),
  inventory: (uuid: string) => api.get<ApiTraderInventoryItem[]>(`/api/traders/${uuid}/inventory/`),
  addInventoryItem: (uuid: string, data: object) => api.post<ApiTraderInventoryItem>(`/api/traders/${uuid}/inventory/`, data),
  updateInventoryItem: (uuid: string, id: number, data: object) => api.patch<ApiTraderInventoryItem>(`/api/traders/${uuid}/inventory/${id}/`, data),
  deleteInventoryItem: (uuid: string, id: number) => api.delete(`/api/traders/${uuid}/inventory/${id}/`),
  addStockMovement: (uuid: string, id: number, data: { type: string; quantity: number; note?: string }) => api.post<ApiTraderInventoryItem>(`/api/traders/${uuid}/inventory/${id}/movements/`, data),
}

export type ApiNotification = {
  id: number
  type: 'order' | 'welcome' | 'promo' | 'system' | 'service_rating' | 'product_rating'
  title: string
  body: string
  read: boolean
  created_at: string
}

// ── Session cache: single fetch per page load ────────────────────────────────
let _profilePromise: Promise<{ is_staff: boolean }> | null = null
let _traderPromise: Promise<{ uuid: string; status: string } | null> | null = null

export const sessionApi = {
  profile: (): Promise<{ is_staff: boolean }> => {
    if (!_profilePromise)
      _profilePromise = authApi.profile().then(r => r.data).catch(() => ({ is_staff: false }))
    return _profilePromise
  },
  trader: (): Promise<{ uuid: string; status: string; business_name?: string } | null> => {
    if (!_traderPromise)
      _traderPromise = tradersApi.me().then(r => r.data).catch(() => null)
    return _traderPromise
  },
  clear: () => { _profilePromise = null; _traderPromise = null },
}

export const notificationsApi = {
  list: () => api.get<ApiNotification[]>('/api/auth/notifications/'),
  markRead: (id: number) => api.patch(`/api/auth/notifications/${id}/`, {}),
  markAllRead: () => api.post('/api/auth/notifications/mark-all-read/', {}),
  delete: (id: number) => api.delete(`/api/auth/notifications/${id}/`),
}

export const behaviourApi = {
  track: (event: 'view' | 'click' | 'category', category_slug: string, product_id?: number) =>
    hasAccessToken()
      ? api.post('/api/auth/behaviour/', { event, category_slug, product_id }).catch(() => {})
      : Promise.resolve(),
  recommended: (page = 1, page_size = 12, exclude: number[] = []) =>
    api.get<{ results: ApiProduct[]; count: number; next: number | null }>(
      `/api/auth/recommended/?page=${page}&page_size=${page_size}${exclude.length ? `&exclude=${exclude.join(',')}` : ''}`
    ),
}

export const isAdmin = () => {
  try {
    const token = localStorage.getItem('access_token')
    if (!token) return false
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.is_staff === true
  } catch { return false }
}

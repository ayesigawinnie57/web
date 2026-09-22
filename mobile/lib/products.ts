import api from './api'
import type { Product } from '../components/ProductCard'

export type ApiProduct = {
  id: number
  uuid: string
  name: string
  slug: string
  price: string
  original_price: string | null
  image: string | null
  short_description?: string
  long_description?: string
  delivery_fee?: string
  images?: { id: number; url: string | null; order: number }[]
  rating: string
  stock: number
  is_active: boolean
  reviews_count?: number
  created_at: string
  category: { id: number; name: string; slug: string }
}

export type ApiCategory = { id: number; name: string; slug: string; image: string | null }

export const toCardProduct = (product: ApiProduct): Product => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  price: Number(product.price),
  originalPrice: product.original_price ? Number(product.original_price) : undefined,
  stock: product.stock ?? 0,
  image: product.image ?? undefined,
  rating: Number(product.rating),
  category: product.category?.slug ?? '',
  categoryName: product.category?.name ?? '',
})

export type ReviewImage = { id: number; url: string; uploaded_at: string }

export type ProductReview = {
  id: number
  user_name: string
  user_avatar: string | null
  overall_rating: number
  performance_rating: number | null
  battery_life_rating: number | null
  product_quality_rating: number | null
  condition_rating: number | null
  value_for_money_rating: number | null
  design_rating: number | null
  features_rating: number | null
  size_fit_rating: number | null
  review_text: string
  verified_purchase: boolean
  images: ReviewImage[]
  order: number | null
  order_item: number | null
  created_at: string
  updated_at: string
}

export type RatingSummary = {
  average: number
  total: number
  breakdown: Record<string, number>
  with_photos: number
}

export type EligibilityResult = {
  eligible: boolean
  reason?: string
  order_id?: number
  order_item_id?: number
  order_code?: string
  existing_review_id?: number | null
}

export const productsApi = {
  list: () => api.get<{ results: ApiProduct[] }>('/api/products/'),

  get: (identifier: number | string) => api.get<ApiProduct>(`/api/products/${identifier}/`),

  getReviews: (slug: string, params?: { star?: number; with_photos?: boolean }) =>
    api.get<ProductReview[]>(`/api/products/${slug}/reviews/`, { params }),

  getRatingSummary: (slug: string) =>
    api.get<RatingSummary>(`/api/products/${slug}/reviews/summary/`),

  checkEligibility: (slug: string) =>
    api.get<EligibilityResult>(`/api/products/${slug}/reviews/eligibility/`),

  submitReview: (slug: string, data: FormData) =>
    api.post<ProductReview>(`/api/products/${slug}/reviews/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateReview: (slug: string, id: number, data: FormData) =>
    api.patch<ProductReview>(`/api/products/${slug}/reviews/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteReview: (slug: string, id: number) =>
    api.delete(`/api/products/${slug}/reviews/${id}/`),

  getMyReviews: () => api.get<ProductReview[]>('/api/products/reviews/mine/'),

  create: (data: FormData) =>
    api.post<ApiProduct>('/api/products/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: number, data: FormData) =>
    api.patch<ApiProduct>(`/api/products/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: number) => api.delete(`/api/products/${id}/`),

  categories: () => api.get<ApiCategory[]>('/api/products/categories/'),

  createCategory: (data: FormData) =>
    api.post<ApiCategory>('/api/products/categories/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateCategory: (id: number, data: FormData) =>
    api.patch<ApiCategory>(`/api/products/categories/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteCategory: (id: number) => api.delete(`/api/products/categories/${id}/`),
}

export type ApiOrder = {
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
  has_service_rating: boolean
  payment?: { status: 'pending' | 'completed' | 'failed' | 'invalid' | 'cancelled' } | null
  items: { id: number; product: ApiProduct; quantity: number; price: string }[]
}

export const ordersApi = {
  list: () => api.get<{ results: ApiOrder[] }>('/api/orders/'),
  get: (code: string) => api.get<ApiOrder>(`/api/orders/${code}/`),
  cancel: (code: string) => api.post<ApiOrder>(`/api/orders/${code}/cancel/`),
  pay: (code: string) => api.post<{ redirect_url: string; order_tracking_id: string }>(`/api/orders/${code}/pay/`),
  rateService: (code: string, payload: {
    overall: number
    areas: string[]
    area_ratings: Record<string, number>
    comment: string
  }) => api.post(`/api/orders/${code}/rate/`, payload),
}

export const adminOrdersApi = {
  list: (status?: string) => api.get<{ results: ApiOrder[] } | ApiOrder[]>(`/api/orders/admin/${status ? `?status=${status}` : ''}`),
  get: (code: string) => api.get<ApiOrder>(`/api/orders/admin/${code}/`),
  confirm: (code: string) => api.post<ApiOrder>(`/api/orders/admin/${code}/confirm/`),
  cancel: (code: string, reason: string) => api.post<ApiOrder>(`/api/orders/admin/${code}/cancel/`, { reason }),
  ship: (code: string) => api.post<ApiOrder>(`/api/orders/admin/${code}/ship/`),
  readyForPickup: (code: string) => api.post<ApiOrder>(`/api/orders/admin/${code}/ready-for-pickup/`),
  deliver: (code: string) => api.post<ApiOrder>(`/api/orders/admin/${code}/deliver/`),
}

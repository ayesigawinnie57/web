import type { ApiLinkedAdvertisingPlacement, Product } from './api'

export function toSponsoredProduct(placement: ApiLinkedAdvertisingPlacement): Product {
  return {
    id: placement.public_product_id,
    catalogProductId: null,
    slug: placement.slug,
    name: placement.name,
    price: Number(placement.price),
    image: placement.image ?? undefined,
    images: [],
    rating: 0,
    reviewsCount: 0,
    sellerUuid: null,
    sellerName: null,
    stock: 0,
    deliveryFee: 0,
    availability: 'in_stock',
    warranty: '',
    deliveryOptions: [],
    packageDetails: '',
    shortDescription: '',
    longDescription: '',
    brand: '',
    condition: 'new',
    tags: [],
    specifications: {},
    reviewStatus: 'approved',
    reviewNote: '',
    variants: [],
    category: placement.category_slug ?? '',
    categoryName: placement.category ?? '',
  }
}

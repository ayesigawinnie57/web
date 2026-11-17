import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, toProduct, type Product } from '../lib/api'
import ProductCard from '../components/ProductCard'

const COLLECTIONS = [
  {
    id: 'shoes-kitchen',
    title: 'Shoes & Kitchen Essentials',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1794853244/Majo_Market__Shoes_and_Kitchen_Essentials.png',
    imageAlt: 'Shop shoes and kitchen essentials on Majo Market',
    categories: [
      { name: 'Shoes', slug: 'shoes' },
      { name: 'Kitchen & Dining', slug: 'kitchen-dining' },
    ],
  },
  {
    id: 'fashion',
    title: 'Fashion for Everyone',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1794853123/Majo_Market_Fashion_for_Everyone.png',
    imageAlt: 'Explore fashion for everyone on Majo Market',
    categories: [{ name: 'Fashion & Accessories', slug: 'fashion-accessories' }],
  },
  {
    id: 'baby',
    title: 'Baby Essentials',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1794853048/Majo_Market_Baby_Essentials_Banner.png',
    imageAlt: 'Find baby essentials from Majo Market sellers',
    categories: [{ name: 'Baby & Kids', slug: 'baby-kids' }],
  },
  {
    id: 'electronics',
    title: 'Electronics',
    image: 'https://res.cloudinary.com/fhklnn0f/image/upload/v1794853045/Majo_Market_Electronics_Banner.png',
    imageAlt: 'Shop electronics on Majo Market',
    categories: [{ name: 'Electronics', slug: 'electronics' }],
  },
]

const responsiveBannerUrl = (url: string, width: number) =>
  url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`)

function CategoryProductSection({ collection }: { collection: typeof COLLECTIONS[number] }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchProducts = useCallback(async () => {
    const responses = await Promise.all(collection.categories.map(category =>
      productsApi.list(`category=${encodeURIComponent(category.slug)}&page_size=4`),
    ))
    const uniqueProducts = new Map<number, Product>()
    responses.forEach(({ data }) => {
      data.results.map(toProduct).forEach(product => {
        if (!uniqueProducts.has(product.id)) uniqueProducts.set(product.id, product)
      })
    })
    return Array.from(uniqueProducts.values())
  }, [collection])

  useEffect(() => {
    let active = true
    void fetchProducts()
      .then(items => {
        if (active) setProducts(items)
      })
      .catch(cause => {
        if (active) {
          console.error(`Could not load homepage products for ${collection.title}.`, cause)
          setError(true)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [collection.title, fetchProducts])

  const retryProducts = () => {
    setError(false)
    setLoading(true)
    void fetchProducts()
      .then(setProducts)
      .catch(cause => {
        console.error(`Could not load homepage products for ${collection.title}.`, cause)
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  return (
    <section aria-labelledby={`category-products-${collection.id}`} className="bg-[#F8FAFC] px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id={`category-products-${collection.id}`} className="text-xl font-extrabold tracking-tight text-[#071A2B] sm:text-[22px]">
            {collection.title}
          </h2>
          <nav aria-label={`${collection.title} categories`} className="flex flex-wrap gap-2">
            {collection.categories.map(category => (
              <Link
                key={category.slug}
                to={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="rounded-full border border-[#CBD5E1] bg-white px-3 py-1.5 text-[11px] font-bold text-[#1E3A8A] transition hover:border-[#1E3A8A] hover:bg-[#EFF6FF]"
              >
                Shop {category.name}
              </Link>
            ))}
          </nav>
        </div>

        <img
          src={responsiveBannerUrl(collection.image, 1440)}
          srcSet={`${responsiveBannerUrl(collection.image, 720)} 720w, ${responsiveBannerUrl(collection.image, 1440)} 1440w`}
          sizes="(min-width: 1280px) 1184px, calc(100vw - 32px)"
          alt={collection.imageAlt}
          loading="lazy"
          decoding="async"
          className="mb-5 block aspect-[8/3] w-full rounded-2xl border border-[#E2E8F0] bg-[#E2E8F0] object-cover"
        />

        {loading ? (
          <p className="py-4 text-center text-sm text-[#64748B]" role="status">Loading {collection.title.toLowerCase()}…</p>
        ) : error ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 text-center">
            <p className="text-sm text-[#475569]">Products could not be loaded right now.</p>
            <button
              type="button"
              onClick={retryProducts}
              className="mt-3 rounded-lg bg-[#071A2B] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F2B43]"
            >
              Try again
            </button>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {products.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-5 text-center text-sm text-[#64748B]">
            There are no products in this collection yet.
          </p>
        )}
      </div>
    </section>
  )
}

export default function CategoryProductSections() {
  return COLLECTIONS.map(collection => (
    <CategoryProductSection key={collection.title} collection={collection} />
  ))
}

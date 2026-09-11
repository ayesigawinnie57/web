import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { wishlistApi, cartApi, hasAccessToken, notifyWishlistUpdated, toProduct, type WishlistItem } from '../lib/api'
import Navbar from '../landing/Navbar'
import Footer from '../landing/Footer'

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)
  const [adding, setAdding] = useState<number | null>(null)

  useEffect(() => {
    if (!hasAccessToken()) { setLoading(false); return }
    wishlistApi.list()
      .then(({ data }) => setItems(data))
      .finally(() => setLoading(false))
  }, [])

  const remove = async (productId: number) => {
    setRemoving(productId)
    await wishlistApi.remove(productId)
    setItems(prev => prev.filter(i => i.product_id !== productId))
    notifyWishlistUpdated()
    setRemoving(null)
  }

  const addToCart = async (item: WishlistItem) => {
    setAdding(item.product_id)
    await cartApi.add(toProduct({
      id: item.product_id,
      slug: item.product_slug,
      name: item.product_name,
      price: item.product_price,
      original_price: null,
      image: item.product_image,
      rating: item.product_rating,
      reviews_count: 0,
      stock: 1,
      delivery_fee: '0',
      short_description: '',
      long_description: '',
      is_featured: false,
      images: [],
      category: { id: 0, name: item.product_category, slug: item.product_category },
    }), 1)
    setAdding(null)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar />
      <main className="pt-14 lg:pt-16 max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-end gap-3 mb-8">
          <Heart className="text-red-500" size={26} fill="currentColor" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E3A8A]">Saved items</p>
            <h1 className="text-3xl font-extrabold text-[#071A2B]">Wishlist</h1>
          </div>
        </div>

        {!hasAccessToken() ? (
          <div className="py-20 text-center">
            <p className="text-[15px] font-bold text-[#071A2B]">Sign in to view your wishlist</p>
            <Link to="/login" className="inline-block mt-4 bg-[#1E3A8A] text-white px-6 py-3 rounded-xl text-[13px] font-bold">Sign In</Link>
          </div>
        ) : loading ? (
          <div className="py-20 text-center text-[13px] text-[#64748B]">Loading wishlist...</div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[15px] font-bold text-[#071A2B]">Your wishlist is empty</p>
            <Link to="/shop" className="inline-block mt-4 text-[13px] font-bold text-[#1E3A8A]">Browse products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.id} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <Link to={`/shop/${item.product_slug}`} className="block aspect-square bg-[#F8FAFC] overflow-hidden">
                  {item.product_image
                    ? <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                  }
                </Link>
                <div className="p-3">
                  <Link to={`/shop/${item.product_slug}`} className="text-[13px] font-bold text-[#071A2B] line-clamp-2 hover:text-[#1E3A8A]">{item.product_name}</Link>
                  <p className="text-[13px] font-extrabold text-[#1E3A8A] mt-1">UGX {Number(item.product_price).toLocaleString()}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => addToCart(item)}
                      disabled={adding === item.product_id}
                      className="flex-1 h-9 bg-[#1E3A8A] text-white text-[12px] font-bold rounded-lg disabled:opacity-50"
                    >
                      {adding === item.product_id ? 'Adding...' : 'Add to Cart'}
                    </button>
                    <button
                      onClick={() => remove(item.product_id)}
                      disabled={removing === item.product_id}
                      className="w-9 h-9 flex items-center justify-center border border-[#E2E8F0] rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
